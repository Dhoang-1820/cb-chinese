#!/usr/bin/env node
/* Content audit, step 2: deterministic checks on the output of tools/audit/dump.js.
   Usage: node tools/audit/lint.js DUMP_DIR [--json]
   Needs pinyin-pro (npm install --no-save pinyin-pro) for the pinyin checks; without it they are skipped.
   Checks:
     pinyin    word pinyin, example / collocation / line pinyin vs pinyin-pro (with and without tone sandhi)
     options   duplicate options, key out of range, blank count, ABC key not a permutation,
               token answers that do not use exactly the given tokens
     usage     example sentence or picture sample that does not contain its word
     glossary  data/glossary.json terms rendered differently from the agreed vi / en wording
   Exit code 0 always (advisory); the result is printed or written as JSON. */
"use strict";
const fs = require("fs"), path = require("path");
const DIR = process.argv[2]; if (!DIR) { console.error("usage: lint.js DUMP_DIR [--json]"); process.exit(2); }
const load = f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const items = load("items.json"), words = load("words.json"), lines = load("lines.json");
let PP = null; try { PP = require("pinyin-pro"); } catch (e) { /* optional */ }
const out = { pinyin: [], options: [], usage: [], glossary: [] };

/* ---------- pinyin ---------- */
const HAN = /[㐀-鿿]/;
const strip = s => String(s || "").normalize("NFC").toLowerCase().replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, "");
const toneless = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü/g, "u");
const hanOnly = s => String(s || "").replace(/[^㐀-鿿]/g, "");
function expect(zh) {
  const h = hanOnly(zh); if (!h) return null;
  const opt = { toneType: "symbol", type: "string", nonZh: "removed" };
  return [strip(PP.pinyin(h, opt)), strip(PP.pinyin(h, Object.assign({ toneSandhi: false }, opt)))];
}
/* every reading a character may have: all dictionary readings, their neutral-tone form, tone-sandhi forms of 一/不,
   and 儿 as an r-suffix */
const neutral = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
const readCache = new Map();
function readings(c) {
  if (readCache.has(c)) return readCache.get(c);
  const r = new Set();
  PP.pinyin(c, { multiple: true, type: "array", toneType: "symbol" }).forEach(p => { r.add(p); r.add(neutral(p)); });
  if (c === "一") ["yī", "yí", "yì"].forEach(x => r.add(x));
  if (c === "不") ["bù", "bú"].forEach(x => r.add(x));
  if (c === "儿") ["r", "er", "ér"].forEach(x => r.add(x));
  const a = [...r].map(strip).filter(Boolean); readCache.set(c, a); return a;
}
/* can the written pinyin be split into one valid reading per character? returns the readings used, or null */
function align(chars, s) {
  const memo = new Map();
  const go = (i, j) => {
    const k = i + ":" + j; if (memo.has(k)) return memo.get(k);
    let res = null;
    if (i === chars.length) res = j === s.length ? [] : null;
    else for (const r of readings(chars[i])) if (s.startsWith(r, j)) { const rest = go(i + 1, j + r.length); if (rest) { res = [r].concat(rest); break; } }
    memo.set(k, res); return res;
  };
  return go(0, 0);
}
function checkPy(id, zh, py, what) {
  if (!PP || !zh || !py || !HAN.test(zh)) return;
  if (/\d/.test(zh)) return;                         // Arabic numerals: spoken form varies
  const latin = (String(zh).match(/[A-Za-z]+/g) || []).map(t => t.toLowerCase());
  let pys = String(py); latin.forEach(t => { pys = pys.replace(new RegExp("\\b" + t + "\\b", "i"), " "); });
  const got = strip(pys), exp = expect(zh); if (!exp) return;
  if (exp.includes(got)) return;
  const chars = [...hanOnly(zh)], used = align(chars, got);
  const libArr = PP.pinyin(hanOnly(zh), { type: "array", toneType: "symbol" }).map(strip);
  if (!used) { out.pinyin.push({ id, what, zh, py, lib: exp[0], sev: "invalid" }); return; }
  /* valid readings everywhere; flag characters where the reading differs from the library's context pick
     in more than tone-neutralisation, and is not one of the usual particles */
  const soft = new Set([..."的地得了着过儿子头们么个里上下来去一不么呢吧啊吗"]);
  const diffs = chars.map((c, i) => ({ c, w: used[i], l: libArr[i] }))
    .filter(d => d.l && d.w !== d.l && d.w !== neutral(d.l) && d.l !== neutral(d.w) && !soft.has(d.c));
  if (diffs.length) out.pinyin.push({ id, what, zh, py, lib: exp[0], sev: "polyphone", chars: diffs.map(d => `${d.c}: ${d.w} (lib ${d.l})`).join("; ") });
}
words.forEach(w => {
  checkPy(w.id, w.hanzi, w.pinyin, "word");
  if (w.example) checkPy(w.id, w.example.zh, w.example.py, "example");
  (w.collocations || []).forEach((c, i) => checkPy(w.id, c.zh, c.py, "collocation " + i));
});
lines.forEach(l => {
  if (l.zh) checkPy(l.id, l.zh, l.py, "line");
  if (l.card && l.card.cn) checkPy(l.id, l.card.cn.zh, l.card.cn.py, "card");
  if (l.extra) (l.extra.phrases || []).forEach((p, i) => checkPy(l.id, p.zh, p.py, "phrase " + i));
});

/* ---------- options and keys ---------- */
const norm = s => String(s).replace(/\s+/g, "").trim();
items.forEach(x => {
  const bad = m => out.options.push({ id: x.id, problem: m });
  if (x.format === "choice") {
    if (!(x.key >= 0 && x.key < x.options.length)) bad("key out of range");
    const seen = new Set(); x.options.forEach(o => { if (seen.has(norm(o))) bad("duplicate option: " + o); seen.add(norm(o)); });
    const blanks = (String(x.prompt).match(/_{2,}|（\s*）|\(\s*\)/g) || []).length;
    if (/gap|fill|confuse|measure|grammar|bank/.test(x.kind) && blanks > 1 && x.kind !== "grammar4" && x.kind !== "grammar5") bad(`${blanks} blanks in one question`);
  }
  if (x.format === "abc") {
    if (!/^[ABC]{3}$/.test(x.key) || new Set(x.key).size !== 3) bad("ABC key is not a permutation: " + x.key);
  }
  if (x.format === "tokens") {
    const pool = x.tokens.slice().sort().join("|");
    [x.key].concat(x.alt || []).forEach(ans => {
      /* the answer must be a concatenation of all tokens in some order */
      const left = x.tokens.slice(); let s = ans, ok = true;
      while (s.length && ok) { const i = left.findIndex(t => s.startsWith(t)); if (i < 0) ok = false; else { s = s.slice(left[i].length); left.splice(i, 1); } }
      if (!ok || left.length) bad("answer does not use exactly the tokens: " + ans + " / " + pool);
    });
  }
  if (x.format === "best-reply" && (!Array.isArray(x.key) || x.key.length !== 1)) bad(`best-reply has ${x.key && x.key.length} good choices`);
  if (x.format === "sample") (x.samples || []).forEach(s => { const z = s.zh || s; if (!String(z).includes(x.word)) out.usage.push({ id: x.id, problem: `sample does not use ${x.word}: ${z}` }); });
});
words.forEach(w => { if (w.example && w.example.zh && !w.example.zh.includes(w.hanzi) && ![...w.hanzi].every(c => w.example.zh.includes(c)))
  out.usage.push({ id: w.id, problem: `example does not use ${w.hanzi}: ${w.example.zh}` }); });

/* ---------- glossary ---------- */
const GL = path.join(__dirname, "..", "..", "data", "glossary.json");
if (fs.existsSync(GL)) {
  const g = JSON.parse(fs.readFileSync(GL, "utf8")).terms;
  const low = s => String(s || "").toLowerCase();
  const has = (s, alts) => alts.some(a => low(s).includes(low(a)));
  /* 1. word entries for a glossary term must use an agreed wording */
  words.forEach(w => { const t = g.find(t => t.zh === w.hanzi); if (!t) return;
    if (!has(w.vi, t.vi)) out.glossary.push({ id: w.id, term: t.zh, field: "vi", got: w.vi, want: t.vi });
    if (!has(w.en, t.en)) out.glossary.push({ id: w.id, term: t.zh, field: "en", got: w.en, want: t.en });
  });
  /* 2. a translated line containing a term should use one of the agreed wordings (or a listed variant) */
  lines.forEach(l => { if (!l.zh) return; g.forEach(t => {
    if (!l.zh.includes(t.zh) || (t.notIn || []).some(n => l.zh.includes(n))) return;
    if (l.vi && !has(l.vi, t.vi.concat(t.viOk || []))) out.glossary.push({ id: l.id, term: t.zh, field: "vi", got: l.vi, want: t.vi, line: true });
    if (l.en && !has(l.en, t.en.concat(t.enOk || []))) out.glossary.push({ id: l.id, term: t.zh, field: "en", got: l.en, want: t.en, line: true });
  }); });
}

if (process.argv.includes("--json")) { console.log(JSON.stringify(out, null, 1)); }
else Object.keys(out).forEach(k => console.log(`${k}: ${out[k].length}` + (k === "pinyin" ? ` (invalid ${out.pinyin.filter(p => p.sev === "invalid").length}, polyphone ${out.pinyin.filter(p => p.sev === "polyphone").length})${PP ? "" : " — pinyin-pro not installed, skipped"}` : "")));
