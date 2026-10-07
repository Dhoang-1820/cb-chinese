// Tests for tools/hsk_watch.mjs. No network: pages come from a small local HTTP server.
//   node tools/hsk_watch_test.mjs
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWatch, buildReport, extractText, maskVolatile, diffLines, diffExcerpt, truncate, postToGitHub, loadSources, MAX_DIFF_LINES } from './hsk_watch.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'hsk_watch.mjs');
const FILLER = '<p>HSK is an international standardised test of Chinese language proficiency for non-native speakers. It assesses the ability to use Chinese in daily, academic and professional life, and is organised by Chinese Testing International.</p>';
const page = (body, head = '') => `<!doctype html><html><head><meta charset="utf-8"><title>Fixture</title>${head}
<style>p{color:red}</style><script>var t=${'Date.now()'};</script></head><body>${FILLER}${body}</body></html>`;

// --- fixture server -------------------------------------------------------
const pages = {}; // path -> string | Buffer | { status, body, type } | 'hang'
const apiCalls = [];
let openIssues = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      const body = data ? JSON.parse(data) : null;
      apiCalls.push({ method: req.method, path: url.pathname, body, auth: req.headers.authorization });
      res.setHeader('content-type', 'application/json');
      if (req.method === 'GET') return res.end(JSON.stringify(openIssues));
      if (url.pathname.endsWith('/labels')) {
        res.statusCode = 422;
        return res.end('{"message":"already_exists"}');
      }
      res.statusCode = 201;
      res.end(JSON.stringify({ number: 7, html_url: 'http://x/issues/7' }));
    });
    return;
  }
  const p = pages[url.pathname];
  if (p === undefined) {
    res.statusCode = 404;
    return res.end('not found');
  }
  if (p === 'hang') return; // never answers: the client must time out
  if (typeof p === 'object' && !Buffer.isBuffer(p)) {
    res.statusCode = p.status || 200;
    res.setHeader('content-type', p.type || 'text/html');
    return res.end(p.body);
  }
  res.setHeader('content-type', 'text/html');
  res.end(p);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const tmpDirs = [];
const tmp = async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'hsk-watch-test-'));
  tmpDirs.push(d);
  return d;
};
const src = (id, extra = {}) => ({ id, name: `Source ${id}`, url: `${base}/${id}`, ...extra });
const DAY = 86400000;
const T0 = new Date('2026-10-05T01:00:00Z');
const week = (n) => new Date(T0.getTime() + n * 7 * DAY);
const quiet = () => {};
async function check(sources, stateDir, now, { save = true, timeoutMs = 2000 } = {}) {
  const run = await runWatch({ sources, stateDir, now, timeoutMs, log: quiet });
  if (save) await run.save();
  return run;
}

// --- tests ----------------------------------------------------------------
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('extractText strips scripts, styles and tags, keeps link addresses, decodes entities', () => {
  const lines = extractText(
    '<html><head><title>T &amp; U</title><script>alert("x")</script><style>.a{}</style></head><body><!-- c --><div>Hello&nbsp;<b>world</b></div><ul><li><a href="/news/1?t=123&id=5#top">2026 Test Calendar</a></li><li> | </li></ul><table><tr><td>A</td><td>B&#20013;</td></tr></table><noscript>enable js</noscript></body></html>',
  );
  assert.deepEqual(lines, ['T & U', 'Hello world', '2026 Test Calendar [/news/1?id=5]', 'A B中']);
});

test('maskVolatile hides counters, clocks and tokens but keeps exam facts', () => {
  assert.equal(maskVolatile('浏览次数：1,234'), '浏览次数：<n>');
  assert.equal(maskVolatile('Views: 99 | 10:15:59'), 'Views: <n> | <time>');
  assert.equal(maskVolatile('Copyright © 2019-2026 CTI'), 'Copyright © <year> CTI');
  assert.equal(maskVolatile('sid=abc123XYZ x'), 'sid=<token> x');
  assert.equal(maskVolatile('style.css?v=20261005'), 'style.css?v=<n>');
  // Things that must NOT be masked.
  for (const keep of ['阅读 40 题，40 分钟', '考试时间：2026年11月14日 9:00', 'Listening 45 questions, about 30 minutes', 'HSK 4 costs 550 yuan']) {
    assert.equal(maskVolatile(keep), keep);
  }
});

test('baseline run reports nothing and stores the text', async () => {
  const dir = await tmp();
  pages['/a'] = page('<p>Exam date: 14 November 2026</p>');
  const run = await check([src('a')], dir, week(0));
  assert.equal(run.results[0].status, 'baseline');
  assert.equal(buildReport(run), null);
  assert.match(await readFile(path.join(dir, 'text', 'a.txt'), 'utf8'), /Exam date: 14 November 2026/);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')).sources.a.url, `${base}/a`);
});

test('unchanged page reports nothing', async () => {
  const dir = await tmp();
  pages['/a'] = page('<p>Exam date: 14 November 2026</p>');
  await check([src('a')], dir, week(0));
  // Same text, different markup.
  pages['/a'] = page('<div class="new"><span>Exam date:</span>   14 November 2026</div>');
  const run = await check([src('a')], dir, week(1));
  assert.equal(run.results[0].status, 'unchanged');
  assert.equal(buildReport(run), null);
});

test('changed text is reported with a correct diff excerpt', async () => {
  const dir = await tmp();
  pages['/a'] = page('<p>Exam date: 14 November 2026</p><p>Fee: 550 yuan</p><p>Old notice</p>');
  pages['/b'] = page('<p>Nothing happens here</p>');
  const sources = [src('a'), src('b')];
  await check(sources, dir, week(0));
  pages['/a'] = page('<p>Exam date: 21 November 2026</p><p>Fee: 550 yuan</p><p><a href="/news/9">HSK 3.0 starts in July</a></p>');
  const run = await check(sources, dir, week(1));
  assert.deepEqual(run.results.map((r) => r.status), ['changed', 'unchanged']);
  assert.deepEqual(run.changed[0].diff, [
    { op: '-', text: 'Exam date: 14 November 2026' },
    { op: '+', text: 'Exam date: 21 November 2026' },
    { op: '-', text: 'Old notice' },
    { op: '+', text: 'HSK 3.0 starts in July [/news/9]' },
  ]);
  const report = buildReport(run);
  assert.equal(report.title, 'HSK watch: 1 page changed (2026-10-12)');
  assert.ok(report.body.includes('### Source a'));
  assert.ok(report.body.includes(`<${base}/a>`));
  assert.ok(report.body.includes('```diff\n- Exam date: 14 November 2026\n+ Exam date: 21 November 2026\n- Old notice\n+ HSK 3.0 starts in July [/news/9]\n```'));
  assert.ok(!report.body.includes('Source b'));
  assert.ok(!report.body.includes('Fee: 550'));
  // Reported once: the next run compares with the new text.
  const again = await check(sources, dir, week(2));
  assert.equal(buildReport(again), null);
});

test('two changed pages give a plural title', async () => {
  const dir = await tmp();
  pages['/a'] = page('<p>one</p>');
  pages['/b'] = page('<p>two</p>');
  await check([src('a'), src('b')], dir, week(0));
  pages['/a'] = page('<p>one changed</p>');
  pages['/b'] = page('<p>two changed</p>');
  const report = buildReport(await check([src('a'), src('b')], dir, week(1)));
  assert.equal(report.title, 'HSK watch: 2 pages changed (2026-10-12)');
});

test('volatile fragments alone do not alert', async () => {
  const dir = await tmp();
  const body = (o) =>
    page(
      `<p>今天是 ${o.today} ${o.weekday} ${o.clock}</p><p>Today: ${o.todayEn}</p><p>浏览次数：${o.views}</p><p>Page views: ${o.views}</p>
       <a href="/list?t=${o.stamp}&cat=2;">Notices</a><p>Copyright © ${o.year} CTI</p><p>Exam date: 2026-11-14</p>
       <input type="hidden" name="csrf" value="${o.stamp}"><img src="/logo.png?v=${o.stamp}">`,
      `<link rel="stylesheet" href="/app.${o.stamp}.css">`,
    );
  pages['/v'] = body({ today: '2026年10月5日', weekday: '星期一', clock: '09:01:02', todayEn: 'October 5, 2026', views: '10,234', stamp: '1759626000', year: '2026' });
  await check([src('v')], dir, week(0));
  // A week later: China is already on the next weekday relative to UTC, counters moved, tokens differ.
  pages['/v'] = body({ today: '2026年10月12日', weekday: '星期一', clock: '17:45:30', todayEn: 'October 12, 2026', views: '10,987', stamp: '1760230800', year: '2026' });
  const run = await check([src('v')], dir, week(1));
  assert.equal(run.results[0].status, 'unchanged');
  assert.equal(buildReport(run), null);
  // ...but a real date change on the same page is still seen.
  pages['/v'] = body({ today: '2026年10月19日', weekday: '星期一', clock: '08:00:00', todayEn: 'October 19, 2026', views: '11,500', stamp: '1760835600', year: '2026' }).replace('2026-11-14', '2026-11-21');
  const changed = await check([src('v')], dir, week(2));
  assert.deepEqual(changed.changed[0].diff, [
    { op: '-', text: 'Exam date: 2026-11-14' },
    { op: '+', text: 'Exam date: 2026-11-21' },
  ]);
});

test('an item dated on the day of the check does not alert a week later', () => {
  const old = ['Notice A 2026-10-05', 'Exam 2026-11-14'];
  assert.deepEqual(diffLines(old, old, { times: ['2026-10-05T01:00:00Z', '2026-10-12T01:00:00Z'] }), []);
  // A real exam date that is not a check day is always compared exactly.
  assert.equal(diffLines(['Exam 2026-11-14'], ['Exam 2026-11-15'], { times: ['2026-10-05T01:00:00Z', '2026-10-12T01:00:00Z'] }).length, 2);
});

test('GBK page decodes correctly (charset from header, and from meta tag)', async () => {
  const dir = await tmp();
  // "汉语水平考试" in GBK.
  const gbk = Buffer.from([0xba, 0xba, 0xd3, 0xef, 0xcb, 0xae, 0xc6, 0xbd, 0xbf, 0xbc, 0xca, 0xd4]);
  const wrap = (meta) => Buffer.concat([Buffer.from(`<html><head>${meta}<title>`), gbk, Buffer.from(`</title></head><body>${FILLER}<p>`), gbk, Buffer.from(' 2026</p></body></html>')]);
  pages['/gbk-header'] = { type: 'text/html; charset=GBK', body: wrap('') };
  pages['/gbk-meta'] = { type: 'text/html', body: wrap('<meta http-equiv="Content-Type" content="text/html; charset=gb2312">') };
  await check([src('gbk-header'), src('gbk-meta')], dir, week(0));
  for (const id of ['gbk-header', 'gbk-meta']) {
    const text = await readFile(path.join(dir, 'text', `${id}.txt`), 'utf8');
    assert.ok(text.startsWith('汉语水平考试\n'), `${id}: title decoded`);
    assert.ok(text.includes('汉语水平考试 2026'), `${id}: body decoded`);
    assert.ok(!text.includes('�'), `${id}: no replacement characters`);
  }
});

test('failing source does not fail the run, is not a change, and is reported once after 3 failures', async () => {
  const dir = await tmp();
  pages['/ok'] = page('<p>stable</p>');
  pages['/bad'] = page('<p>will go away</p>');
  const sources = [src('ok'), src('bad')];
  await check(sources, dir, week(0));
  const before = await readFile(path.join(dir, 'text', 'bad.txt'), 'utf8');

  pages['/bad'] = { status: 503, body: 'Service unavailable' };
  for (const n of [1, 2]) {
    const run = await check(sources, dir, week(n));
    assert.deepEqual(run.results.map((r) => r.status), ['unchanged', 'failed']);
    assert.equal(run.results[1].failures, n);
    assert.equal(buildReport(run), null, `failure ${n} is silent`);
  }
  delete pages['/bad']; // 404 now
  const third = await check(sources, dir, week(3));
  const report = buildReport(third);
  assert.equal(report.title, 'HSK watch: 1 page could not be reached (2026-10-26)');
  assert.ok(report.body.includes('### Could not be reached'));
  assert.ok(report.body.includes(`<${base}/bad> failed 3 checks in a row. Last error: HTTP 404`));

  pages['/bad'] = 'hang'; // time-out
  const fourth = await check(sources, dir, week(4), { timeoutMs: 300 });
  assert.match(fourth.results[1].error, /timed out/);
  assert.equal(buildReport(fourth), null, 'not reported a second time');
  assert.equal(await readFile(path.join(dir, 'text', 'bad.txt'), 'utf8'), before, 'old text kept while failing');

  // Recovery with the old text: no change, and the counter starts again.
  pages['/bad'] = page('<p>will go away</p>');
  const back = await check(sources, dir, week(5));
  assert.equal(back.results[1].status, 'unchanged');
  assert.equal(JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')).sources.bad.failures, 0);
});

test('connection refused and near-empty pages count as failures, not changes', async () => {
  const dir = await tmp();
  pages['/spa'] = page('<p>Real content of the page</p>');
  const sources = [src('spa'), { id: 'dead', name: 'Dead', url: 'http://127.0.0.1:1/' }];
  await check(sources, dir, week(0));
  pages['/spa'] = '<html><head><title>App</title></head><body><div id="app"></div><script src="/a.js"></script></body></html>';
  const run = await check(sources, dir, week(1));
  assert.deepEqual(run.results.map((r) => r.status), ['failed', 'failed']);
  assert.match(run.results[0].error, /characters of text/);
  assert.equal(buildReport(run), null);
});

test('changing a source URL starts a new baseline instead of alerting', async () => {
  const dir = await tmp();
  pages['/a'] = page('<p>first address</p>');
  pages['/a2'] = page('<p>completely different page</p>');
  await check([src('a')], dir, week(0));
  const run = await check([{ ...src('a'), url: `${base}/a2` }], dir, week(1));
  assert.equal(run.results[0].status, 'baseline');
  assert.equal(buildReport(run), null);
});

test('identical pages (a site that returns one shell for every URL) are reported once', async () => {
  const dir = await tmp();
  pages['/s1'] = pages['/s2'] = page('<a href="/news/1">2026 Test Calendar</a>');
  const sources = [src('s1'), src('s2')];
  const first = await check(sources, dir, week(0));
  assert.equal(first.results[1].sameAs, 's1');
  pages['/s1'] = pages['/s2'] = page('<a href="/news/2">2027 Test Calendar</a>');
  const report = buildReport(await check(sources, dir, week(1)));
  assert.equal(report.body.split('```diff').length - 1, 1);
  assert.ok(report.body.includes('The same change was seen on: Source s2'));
});

test('long diffs are cut to about 40 lines and long lines are cut safely', async () => {
  const dir = await tmp();
  const items = (tag) => Array.from({ length: 60 }, (_, i) => `<li>${tag} item ${i}</li>`).join('');
  pages['/long'] = page(`<ul>${items('old')}</ul>`);
  await check([src('long')], dir, week(0));
  pages['/long'] = page(`<ul>${items('new')}</ul><p>${'考😀'.repeat(400)}</p><p>fence \`\`\` inside</p>`);
  const run = await check([src('long')], dir, week(1));
  const report = buildReport(run);
  const block = /```diff\n([\s\S]*?)\n```/.exec(report.body)[1].split('\n');
  assert.equal(block.length, MAX_DIFF_LINES);
  assert.ok(block.every((l) => l.startsWith('+ ') || l.startsWith('- ')));
  assert.ok(report.body.includes(`... and ${run.changed[0].diff.length - MAX_DIFF_LINES} more changed lines not shown.`));
  assert.ok(report.body.length < 60000);

  const cut = truncate('考😀'.repeat(400), 11);
  assert.equal(Array.from(cut).length, 11);
  assert.ok(cut.endsWith('…') && !/[\ud800-\udbff]$/.test(cut.slice(0, -1)), 'no half emoji');
  const ex = diffExcerpt([{ op: '+', text: 'a ``` b' }]);
  assert.equal(ex.text, "+ a ''' b");
});

test('dry-run writes no state (command line)', async () => {
  const dir = await tmp();
  const stateDir = path.join(dir, 'state');
  const sourcesFile = path.join(dir, 'sources.json');
  pages['/cli'] = page('<p>Command line page</p>');
  await writeFile(sourcesFile, JSON.stringify({ sources: [src('cli'), { id: 'dead', name: 'Dead', url: 'http://127.0.0.1:1/' }] }));
  const runCli = (args) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [SCRIPT, ...args, '--state-dir', stateDir, '--sources', sourcesFile, '--timeout-ms', '2000'], { env: { PATH: process.env.PATH } });
      let out = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
      child.on('close', (code) => resolve({ code, out }));
    });
  const dry = await runCli(['--dry-run']);
  assert.equal(dry.code, 0, dry.out);
  assert.match(dry.out, /Dry run: no state written/);
  assert.deepEqual(await readdir(dir), ['sources.json'], 'state directory not even created');

  // A real run writes state; a later dry run sees the change but leaves the state alone.
  const real = await runCli([]);
  assert.equal(real.code, 0, real.out); // exit 0 even though one source is unreachable
  const stateBefore = await readFile(path.join(stateDir, 'state.json'), 'utf8');
  pages['/cli'] = page('<p>Command line page, edited</p>');
  const dry2 = await runCli(['--dry-run']);
  assert.equal(dry2.code, 0, dry2.out);
  assert.match(dry2.out, /Would report:/);
  assert.match(dry2.out, /HSK watch: 1 page changed/);
  assert.match(dry2.out, /\+ Command line page, edited/);
  assert.equal(await readFile(path.join(stateDir, 'state.json'), 'utf8'), stateBefore);
  assert.match(await readFile(path.join(stateDir, 'text', 'cli.txt'), 'utf8'), /Command line page\n/);
});

test('GitHub: opens an issue, or comments when an open hsk-watch issue exists', async () => {
  const report = { title: 'HSK watch: 1 page changed (2026-10-12)', body: 'body text' };
  const opts = { token: 'tkn', repo: 'owner/repo', apiUrl: `${base}/api`, log: quiet };
  apiCalls.length = 0;
  openIssues = [];
  assert.deepEqual(await postToGitHub(report, opts), { action: 'issue', number: 7 });
  const created = apiCalls.find((c) => c.method === 'POST' && c.path === '/api/repos/owner/repo/issues');
  assert.equal(created.body.title, report.title);
  assert.deepEqual(created.body.labels, ['hsk-watch']);
  assert.deepEqual(created.body.assignees, ['owner']);
  assert.equal(created.auth, 'Bearer tkn');

  apiCalls.length = 0;
  openIssues = [{ number: 3, html_url: 'x', pull_request: {} }, { number: 5, html_url: 'x' }];
  assert.deepEqual(await postToGitHub(report, opts), { action: 'comment', number: 5 });
  const comment = apiCalls.find((c) => c.path === '/api/repos/owner/repo/issues/5/comments');
  assert.ok(comment.body.body.startsWith(`## ${report.title}`));
  assert.ok(!apiCalls.some((c) => c.method === 'POST' && c.path === '/api/repos/owner/repo/issues'));
});

test('the shipped source list is valid', async () => {
  const list = await loadSources(path.join(path.dirname(SCRIPT), 'hsk_watch_sources.json'));
  assert.ok(list.length >= 4 && list.length <= 8);
  for (const s of list) assert.ok(s.id && s.name && s.url && s.why && s.verified === false, s.id);
});

// --- runner ---------------------------------------------------------------
let failed = 0;
for (const t of tests) {
  try {
    await t.fn();
    console.log(`ok    ${t.name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${t.name}\n      ${String(e.stack || e).split('\n').join('\n      ')}`);
  }
}
server.closeAllConnections();
server.close();
for (const d of tmpDirs) await rm(d, { recursive: true, force: true });
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
