#!/usr/bin/env node
// Weekly watch of official HSK pages. Downloads each page in tools/hsk_watch_sources.json,
// reduces it to plain text, compares with the text stored on the previous run, and reports
// what changed (as a GitHub issue when run with --github). See docs/HSK-WATCH.md.
//
// Node 22, no npm dependencies.
//
//   node tools/hsk_watch.mjs --dry-run --state-dir <dir> --sources <file>
//
// Options:
//   --state-dir <dir>   where the previous texts live (default .hsk-watch-state)
//   --sources <file>    source list (default tools/hsk_watch_sources.json)
//   --dry-run           print what would be reported; write no state, create no issue
//   --github            create/update the GitHub issue (needs GITHUB_TOKEN, GITHUB_REPOSITORY)
//   --timeout-ms <n>    per-request timeout (default 20000)

import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LABEL = 'hsk-watch';
export const FAILURES_BEFORE_REPORT = 3;
export const MAX_DIFF_LINES = 40;
const MAX_LINE_CHARS = 300;
const MAX_BODY_CHARS = 55000; // GitHub's limit for an issue body is 65536
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MIN_CHARS = 200;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Download and decode
// ---------------------------------------------------------------------------

function charsetFrom(contentType, bytes) {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '');
  if (fromHeader) return fromHeader[1];
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  // The <meta> tag is ASCII in every encoding we care about, so latin1 is safe for sniffing.
  const head = Buffer.from(bytes.subarray(0, 4096)).toString('latin1');
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head);
  return fromMeta ? fromMeta[1] : 'utf-8';
}

export function decodeBytes(bytes, contentType) {
  let label = charsetFrom(contentType, bytes).toLowerCase();
  if (label === 'gb2312' || label === 'gb_2312-80' || label === 'x-gbk') label = 'gbk';
  let decoder;
  try {
    decoder = new TextDecoder(label);
  } catch {
    decoder = new TextDecoder('utf-8');
  }
  return decoder.decode(bytes);
}

export async function fetchPage(url, { timeoutMs = 20000, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs), // also covers reading the body
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_PAGE_BYTES) throw new Error(`page too large (${bytes.length} bytes)`);
  return decodeBytes(bytes, res.headers.get('content-type'));
}

// ---------------------------------------------------------------------------
// HTML -> stable plain-text lines
// ---------------------------------------------------------------------------

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', middot: '·',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…',
  emsp: ' ', ensp: ' ', thinsp: ' ', reg: '®', trade: '™', times: '×', raquo: '»', laquo: '«',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return ' ';
      }
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const VOLATILE_PARAMS = /^(v|ver|version|t|_|_t|ts|r|rnd|rand|random|timestamp|time|cb|sid|sessionid|jsessionid|token|nonce)$/i;

// Link address without the parts that change on every visit.
function cleanHref(href) {
  let h = decodeEntities(href).trim();
  if (!h || /^(javascript:|mailto:|tel:|#)/i.test(h)) return '';
  h = h.replace(/#.*$/, '').replace(/;jsessionid=[^?#]*/i, '');
  const q = h.indexOf('?');
  if (q >= 0) {
    const kept = h
      .slice(q + 1)
      .split('&')
      .filter((p) => p && !VOLATILE_PARAMS.test(p.split('=')[0]));
    h = h.slice(0, q) + (kept.length ? '?' + kept.join('&') : '');
  }
  return h;
}

// Replaces fragments that change without the page really changing. Applied to every line
// before it is stored, so they never reach a diff.
export function maskVolatile(line) {
  return line
    .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, '<time>')
    // Counters only. Deliberately narrow: "阅读 40 题" (40 reading questions) must stay visible.
    .replace(/((?:(?:浏览|访问|点击|阅读|查看|下载)(?:次数|人数|量|数)|人气|在线人数)\s*[:：]?\s*)[\d,]+/g, '$1<n>')
    .replace(/[\d,]+(\s*(?:次浏览|次阅读|次访问|次点击|次下载|人浏览|人在线))/g, '<n>$1')
    .replace(/\b((?:page ?views?|views?|visits?|visitors?|hits|pv|uv)\s*[:：]?\s*)[\d,]+/gi, '$1<n>')
    .replace(/\b[\d,]+(\s*(?:page ?views?|views|visits|visitors|hits)\b)/gi, '<n>$1')
    .replace(/\b((?:jsessionid|sessionid|sid|token|csrf\w*|nonce)\s*[=:]\s*)[\w.+/=-]+/gi, '$1<token>')
    .replace(/([?&](?:v|ver|version|t|_|_t|ts|r|rand|timestamp|cb)=)[\w.-]+/gi, '$1<n>')
    .replace(/\b[0-9a-f]{24,}\b/gi, '<token>')
    .replace(/\b1[5-9]\d{8}(?:\d{3})?\b/g, '<ts>') // unix time, seconds or milliseconds
    .replace(/(processed in\s*)[\d.]+(\s*second\(?s?\)?)(,?\s*\d+\s*queries)?/gi, '$1<n>$2')
    .replace(/((?:页面)?(?:执行|加载|生成)时间\s*[:：]?\s*)[\d.]+/g, '$1<n>')
    .replace(/((?:©|\(c\)|copyright|版权所有)\s*(?:©|\(c\))?\s*)(?:\d{4}\s*[-–—~]\s*)?\d{4}/gi, '$1<year>');
}

const BLOCK_TAGS =
  'address|article|aside|blockquote|br|caption|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|option|p|pre|section|summary|table|tbody|tfoot|thead|title|tr|ul';

export function extractText(html, { links = true, ignore = [] } = {}) {
  let s = String(html);
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(script|style|noscript|template|svg|iframe|select|textarea)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  s = s.replace(/<(script|style)\b[\s\S]*$/i, ' '); // unclosed at end of a cut-off page
  if (links) {
    s = s.replace(
      /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi,
      (m, a, b, c, inner) => {
        const href = cleanHref(a ?? b ?? c ?? '');
        return href ? `${inner} [${href}] ` : `${inner} `;
      },
    );
  }
  s = s.replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n');
  s = s.replace(/<\/?(?:td|th)\b[^>]*>/gi, ' ');
  s = s.replace(/<[^>]*>/g, '');
  s = decodeEntities(s);

  const ignoreRes = ignore.map((r) => new RegExp(r, 'i'));
  const lines = [];
  for (const raw of s.split('\n')) {
    const line = maskVolatile(raw.replace(/[\s 　​﻿]+/g, ' ').trim());
    if (!line || !/[\p{L}\p{N}]/u.test(line)) continue; // empty or punctuation only
    if (ignoreRes.some((re) => re.test(line))) continue;
    lines.push(line);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// A page that prints "today" (a clock, "last updated today") must not alert every week, but
// exam dates are exactly what we want to see change. So dates are stored as they are, and only
// when comparing do we blank the dates of the two check days (each plus/minus one day for time
// zones) on both sides.
function checkDayPatterns(times) {
  const seen = new Set();
  const parts = [];
  for (const t of times) {
    if (!t || Number.isNaN(new Date(t).getTime())) continue;
    for (const shift of [-1, 0, 1]) {
      const d = new Date(new Date(t).getTime() + shift * 86400000);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const key = `${y}-${m}-${day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mon = `(?:${MONTHS[m - 1]}|${MONTHS[m - 1].slice(0, 3)})\\.?`;
      parts.push(
        `${y}\\s*[-/.年]\\s*0?${m}\\s*[-/.月]\\s*0?${day}(?!\\d)\\s*日?`,
        `(?<!\\d)0?${day}[-/.]0?${m}[-/.]${y}`,
        `(?<!\\d)0?${m}/0?${day}/${y}`,
        `${mon}\\s*0?${day}(?:st|nd|rd|th)?,?\\s*${y}`,
        `(?<!\\d)0?${day}(?:st|nd|rd|th)?\\s+${mon},?\\s*${y}`,
      );
    }
  }
  return parts.length ? new RegExp(parts.join('|'), 'gi') : null;
}

const WEEKDAY = /(?:星期|周|礼拜)[一二三四五六日天]|\b(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b\.?,?/gi;

function compareKey(line, dayRe) {
  if (!dayRe) return line;
  dayRe.lastIndex = 0;
  if (!dayRe.test(line)) return line;
  dayRe.lastIndex = 0;
  return line.replace(dayRe, '<today>').replace(WEEKDAY, '').replace(/\s+/g, ' ').trim();
}

// Line diff. Returns [{ op: '+' | '-', text }] in page order ('-' before '+' at each spot).
export function diffLines(oldLines, newLines, { times = [] } = {}) {
  const dayRe = checkDayPatterns(times);
  const a = oldLines.map((l) => compareKey(l, dayRe));
  const b = newLines.map((l) => compareKey(l, dayRe));
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const n = endA - start;
  const m = endB - start;
  const out = [];
  if (n === 0 && m === 0) return out;

  if (n * m > 4_000_000) {
    // Very large rewrite: fall back to "which lines disappeared / appeared", ignoring order.
    const count = new Map();
    for (let j = start; j < endB; j++) count.set(b[j], (count.get(b[j]) || 0) + 1);
    const removed = [];
    for (let i = start; i < endA; i++) {
      const c = count.get(a[i]) || 0;
      if (c > 0) count.set(a[i], c - 1);
      else removed.push({ op: '-', text: oldLines[i] });
    }
    const added = [];
    for (let j = endB - 1; j >= start; j--) {
      const c = count.get(b[j]) || 0;
      if (c > 0) {
        count.set(b[j], c - 1);
        added.unshift({ op: '+', text: newLines[j] });
      }
    }
    return [...removed, ...added];
  }

  // Longest common subsequence table.
  const w = m + 1;
  const table = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * w + j] =
        a[start + i] === b[start + j]
          ? table[(i + 1) * w + j + 1] + 1
          : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      i++;
      j++;
    } else if (i < n && (j === m || table[(i + 1) * w + j] >= table[i * w + j + 1])) {
      out.push({ op: '-', text: oldLines[start + i++] });
    } else {
      out.push({ op: '+', text: newLines[start + j++] });
    }
  }
  return out;
}

// Cuts by characters, never through the middle of one (emoji, rare Chinese characters).
export function truncate(text, max) {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
}

export function diffExcerpt(diff, { maxLines = MAX_DIFF_LINES, maxChars = Infinity } = {}) {
  const lines = [];
  let used = 0;
  for (const d of diff) {
    if (lines.length >= maxLines) break;
    const line = `${d.op} ${truncate(d.text, MAX_LINE_CHARS).replace(/```/g, "'''")}`;
    if (used + line.length + 1 > maxChars && lines.length > 0) break;
    lines.push(line);
    used += line.length + 1;
  }
  const more = diff.length - lines.length;
  return { text: lines.join('\n'), shown: lines.length, more };
}

// ---------------------------------------------------------------------------
// State (a directory; in the workflow it is the checked-out `hsk-watch-state` branch)
// ---------------------------------------------------------------------------

async function loadState(stateDir) {
  try {
    const state = JSON.parse(await readFile(path.join(stateDir, 'state.json'), 'utf8'));
    if (state && typeof state.sources === 'object') return state;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`warning: state.json unreadable (${e.message}); starting from a new baseline`);
  }
  return { version: 1, sources: {} };
}

async function loadText(stateDir, id) {
  try {
    return (await readFile(path.join(stateDir, 'text', `${id}.txt`), 'utf8')).split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

export async function loadSources(file) {
  const json = JSON.parse(await readFile(file, 'utf8'));
  const list = Array.isArray(json) ? json : json.sources;
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${file}: no sources found`);
  const ids = new Set();
  for (const s of list) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(s.id || '')) throw new Error(`${file}: bad id "${s.id}" (use lower-case letters, digits and "-")`);
    if (ids.has(s.id)) throw new Error(`${file}: id "${s.id}" is used twice`);
    ids.add(s.id);
    if (!/^https?:\/\//.test(s.url || '')) throw new Error(`${file}: source "${s.id}" needs an http(s) url`);
    if (!s.name) s.name = s.id;
  }
  return list.filter((s) => s.enabled !== false);
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

// Returns { date, results, changed, unreachable, baselined, save() }.
// results[i].status is one of: baseline, unchanged, changed, failed.
export async function runWatch({ sources, stateDir, now = new Date(), timeoutMs = 20000, fetchImpl = fetch, log = console.log }) {
  const state = await loadState(stateDir);
  const nowIso = now.toISOString();
  const results = [];
  const texts = new Map();

  const fetched = await Promise.all(
    sources.map(async (src) => {
      try {
        const html = await fetchPage(src.url, { timeoutMs, fetchImpl });
        const lines = extractText(html, { links: src.links !== false, ignore: src.ignore || [] });
        const chars = lines.join('').length;
        const min = src.minChars ?? DEFAULT_MIN_CHARS;
        if (chars < min) {
          throw new Error(`only ${chars} characters of text (page is probably drawn by JavaScript, or is a block page)`);
        }
        return { lines };
      } catch (e) {
        const cause = e.cause?.code || e.cause?.message;
        const msg = e.name === 'TimeoutError' ? `timed out after ${timeoutMs / 1000} s` : e.message + (cause ? ` (${cause})` : '');
        return { error: msg };
      }
    }),
  );

  const firstWithText = new Map(); // text -> id, to spot pages that all return the same shell
  for (let k = 0; k < sources.length; k++) {
    const src = sources[k];
    const prev = state.sources[src.id];
    const sameUrl = prev && prev.url === src.url;
    const entry = sameUrl ? { ...prev } : { url: src.url, failures: 0, failureReported: false };
    const res = { id: src.id, name: src.name, url: src.url };

    if (fetched[k].error) {
      entry.failures = (entry.failures || 0) + 1;
      entry.lastError = fetched[k].error;
      entry.lastFailure = nowIso;
      res.status = 'failed';
      res.error = fetched[k].error;
      res.failures = entry.failures;
      // Reported once, when the third failure in a row happens; again only after a recovery.
      res.reportUnreachable = entry.failures >= FAILURES_BEFORE_REPORT && !entry.failureReported;
      if (res.reportUnreachable) entry.failureReported = true;
    } else {
      const lines = fetched[k].lines;
      const joined = lines.join('\n');
      if (firstWithText.has(joined)) res.sameAs = firstWithText.get(joined);
      else firstWithText.set(joined, src.id);

      const old = sameUrl && prev.lastChecked ? await loadText(stateDir, src.id) : null;
      if (!old) {
        res.status = 'baseline';
      } else {
        const diff = diffLines(old, lines, { times: [prev.lastChecked, nowIso] });
        res.status = diff.length ? 'changed' : 'unchanged';
        if (diff.length) {
          res.diff = diff;
          entry.lastChanged = nowIso;
        }
      }
      entry.failures = 0;
      entry.failureReported = false;
      delete entry.lastError;
      entry.lastChecked = nowIso;
      entry.lines = lines.length;
      texts.set(src.id, joined + '\n');
    }
    state.sources[src.id] = entry;
    results.push(res);

    const extra =
      res.status === 'failed'
        ? `${res.error}; failure ${res.failures} in a row`
        : res.status === 'changed'
          ? `${res.diff.length} changed lines`
          : `${fetched[k].lines.length} lines`;
    log(`[${res.status.padEnd(9)}] ${src.id}: ${extra}${res.sameAs ? `  (WARNING: same text as ${res.sameAs}; this URL probably returns only the site's menu)` : ''}`);
  }

  return {
    date: nowIso.slice(0, 10),
    results,
    changed: results.filter((r) => r.status === 'changed'),
    unreachable: results.filter((r) => r.reportUnreachable),
    baselined: results.filter((r) => r.status === 'baseline'),
    async save() {
      await mkdir(path.join(stateDir, 'text'), { recursive: true });
      for (const [id, text] of texts) await writeFile(path.join(stateDir, 'text', `${id}.txt`), text);
      state.lastRun = nowIso;
      await writeFile(path.join(stateDir, 'state.json'), JSON.stringify(state, null, 2) + '\n');
    },
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Returns null when there is nothing to tell the owner.
export function buildReport(run, { summary = null } = {}) {
  const { changed, unreachable, date } = run;
  if (changed.length === 0 && unreachable.length === 0) return null;

  const title = changed.length
    ? `HSK watch: ${plural(changed.length, 'page')} changed (${date})`
    : `HSK watch: ${plural(unreachable.length, 'page')} could not be reached (${date})`;

  // Sources that returned exactly the same text show the same change: print it once.
  const groups = [];
  for (const r of changed) {
    const first = r.sameAs && groups.find((g) => g.main.id === r.sameAs);
    if (first) first.also.push(r);
    else groups.push({ main: r, also: [] });
  }

  const budget = Math.floor(MAX_BODY_CHARS / Math.max(1, groups.length));
  const parts = [];
  if (summary) parts.push(summary.trim(), '');
  for (const { main, also } of groups) {
    const ex = diffExcerpt(main.diff, { maxChars: budget });
    parts.push(`### ${main.name}`, '', `<${main.url}>`, '');
    parts.push('```diff', ex.text, '```');
    if (ex.more > 0) parts.push('', `... and ${plural(ex.more, 'more changed line')} not shown.`);
    if (also.length) {
      parts.push('', `The same change was seen on: ${also.map((r) => `${r.name} (<${r.url}>)`).join('; ')}. These pages returned identical text, so they are probably one page.`);
    }
    parts.push('');
  }
  if (unreachable.length) {
    parts.push('### Could not be reached', '');
    for (const r of unreachable) {
      parts.push(`- ${r.name}: <${r.url}> failed ${r.failures} checks in a row. Last error: ${truncate(r.error, 200)}`);
    }
    parts.push('', 'These will not be mentioned again until they work once. If the address moved, fix it in `tools/hsk_watch_sources.json`.', '');
  }
  parts.push('---', 'Lines starting with `+` are new on the page, `-` were removed. Text in `[...]` is a link address. Made by the "HSK watch" workflow; see `docs/HSK-WATCH.md`. Close this issue when you have read it.');
  return { title, body: parts.join('\n') };
}

// ===========================================================================
// EXTENSION POINT: optional summary step.
// Version 1 makes no AI call and needs no secret. To add one later, return a short
// plain-text summary here (for example by sending the diffs in `run.changed` to a model,
// with a key read from a repository secret). The text is placed at the top of the issue.
// Return null to add nothing. A failure here must never stop the report: catch and return null.
// ===========================================================================
export async function summariseChanges(run) { // eslint-disable-line no-unused-vars
  return null;
}

// ---------------------------------------------------------------------------
// GitHub issue (REST API with the workflow's GITHUB_TOKEN)
// ---------------------------------------------------------------------------

export async function postToGitHub(report, { token, repo, apiUrl = 'https://api.github.com', fetchImpl = fetch, log = console.log }) {
  const api = async (method, route, body) => {
    const res = await fetchImpl(`${apiUrl}/repos/${repo}${route}`, {
      method,
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'hsk-watch',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    return { status: res.status, ok: res.ok, json, text };
  };
  const must = (r, what) => {
    if (!r.ok) throw new Error(`GitHub: ${what} failed: HTTP ${r.status} ${truncate(r.text, 300)}`);
    return r.json;
  };

  // 422 = the label already exists.
  const label = await api('POST', '/labels', { name: LABEL, color: 'c5221f', description: 'Official HSK page changed (weekly watch)' });
  if (!label.ok && label.status !== 422) log(`warning: could not create label (HTTP ${label.status})`);

  const open = must(await api('GET', `/issues?state=open&labels=${LABEL}&per_page=20&sort=created&direction=desc`), 'listing issues');
  const existing = open.find((i) => !i.pull_request);
  if (existing) {
    must(await api('POST', `/issues/${existing.number}/comments`, { body: `## ${report.title}\n\n${report.body}` }), 'adding a comment');
    log(`Added a comment to issue #${existing.number}: ${existing.html_url}`);
    return { action: 'comment', number: existing.number };
  }
  // Assigning the owner makes sure GitHub sends them a notification.
  const owner = repo.split('/')[0];
  let created = await api('POST', '/issues', { title: report.title, body: report.body, labels: [LABEL], assignees: [owner] });
  if (created.status === 422) created = await api('POST', '/issues', { title: report.title, body: report.body, labels: [LABEL] });
  const issue = must(created, 'creating the issue');
  log(`Created issue #${issue.number}: ${issue.html_url}`);
  return { action: 'issue', number: issue.number };
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const opts = { dryRun: false, github: false, stateDir: '.hsk-watch-state', sources: path.join(here, 'hsk_watch_sources.json'), timeoutMs: 20000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--github') opts.github = true;
    else if (a === '--state-dir') opts.stateDir = value();
    else if (a === '--sources') opts.sources = value();
    else if (a === '--timeout-ms') opts.timeoutMs = Number(value());
    else throw new Error(`unknown option ${a}`);
  }
  return opts;
}

function statusTable(run) {
  const rows = run.results.map((r) => {
    const note = r.status === 'failed' ? `${r.error} (failure ${r.failures} in a row)` : r.sameAs ? `same text as ${r.sameAs}: probably only the site's menu` : r.status === 'changed' ? plural(r.diff.length, 'changed line') : '';
    return `| ${r.id} | ${r.status} | ${note.replace(/\|/g, '/')} |`;
  });
  return ['| Source | Result | Note |', '| --- | --- | --- |', ...rows].join('\n');
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const opts = parseArgs(argv);
  const sources = await loadSources(opts.sources);
  console.log(`HSK watch: checking ${plural(sources.length, 'source')}${opts.dryRun ? ' (dry run)' : ''}`);

  const run = await runWatch({ sources, stateDir: opts.stateDir, timeoutMs: opts.timeoutMs });
  let summary = null;
  if (run.changed.length) {
    try {
      summary = await summariseChanges(run);
    } catch (e) {
      console.warn(`warning: summary step failed (${e.message}); reporting without it`);
    }
  }
  const report = buildReport(run, { summary });

  if (run.baselined.length) console.log(`Baseline ${opts.dryRun ? 'would be' : ''} recorded for: ${run.baselined.map((r) => r.id).join(', ')} (nothing to compare with yet)`);
  if (!report) console.log('Nothing to report.');
  else console.log(`\n${opts.dryRun ? 'Would report' : 'Report'}:\n\n# ${report.title}\n\n${report.body}\n`);

  if (env.GITHUB_STEP_SUMMARY) {
    const text = `## HSK watch ${run.date}${opts.dryRun ? ' (dry run)' : ''}\n\n${statusTable(run)}\n\n${report ? `**${report.title}**` : 'Nothing to report.'}\n`;
    await appendFile(env.GITHUB_STEP_SUMMARY, text).catch(() => {});
  }

  if (opts.dryRun) {
    console.log('Dry run: no state written, no issue created.');
    return run;
  }
  // Issue first, state second: if GitHub refuses the issue, the change is reported next time.
  if (report && opts.github) {
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('--github needs GITHUB_TOKEN and GITHUB_REPOSITORY');
    await postToGitHub(report, { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY, apiUrl: env.GITHUB_API_URL || 'https://api.github.com' });
  }
  await run.save();
  console.log(`State written to ${opts.stateDir}`);
  return run;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`hsk_watch: ${e.message}`);
    process.exit(1);
  });
}
