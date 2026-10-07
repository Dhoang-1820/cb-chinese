#!/usr/bin/env node
/* Validates data/hsk4x/*.js (HSK 1-4 gap words + HSK 4 extra word resources).
   Usage: node tools/validate_hsk4x.js      Exit code 1 if any ERROR is found. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DATA = path.join(__dirname, "..", "data"), X = path.join(DATA, "hsk4x");
const errors = [], warnings = [];
const err = (w, m) => errors.push(`${w}: ${m}`), warn = (w, m) => warnings.push(`${w}: ${m}`);
const sb = { window: {} }; vm.createContext(sb);
const run = f => { try { vm.runInContext(fs.readFileSync(f, "utf8"), sb, { filename: f }); } catch (e) { err(path.basename(f), "JavaScript error: " + e.message); } };

// app word data the packs refer to
fs.readdirSync(DATA).filter(f => /^(day\d+|core\d+|found)\.js$/.test(f)).sort().forEach(f => run(path.join(DATA, f)));
const appById = new Map(), appHanzi = new Map();
(sb.window.CB_DAYS || []).forEach(d => (d.words || []).forEach(w => { appById.set(w.id, w); appHanzi.set(w.hanzi, w); }));
(sb.window.CB_CORE || []).forEach(s => (s.words || []).forEach(w => { appById.set(w.id, w); if (!appHanzi.has(w.hanzi)) appHanzi.set(w.hanzi, w); }));

run(path.join(X, "manifest.js"));
const listed = sb.window.CB_HSK4X_FILES || [];
if (!listed.length) err("manifest.js", "CB_HSK4X_FILES is empty or missing");
const onDisk = fs.readdirSync(X).filter(f => /^(missing|extra).*\.js$/.test(f));
onDisk.filter(f => !listed.includes(f)).forEach(f => err(f, "file not listed in data/hsk4x/manifest.js"));
listed.forEach(f => fs.existsSync(path.join(X, f)) ? run(path.join(X, f)) : err(f, "listed in manifest but missing"));
const packs = sb.window.CB_HSK4X || [];

const ref = JSON.parse(fs.readFileSync(path.join(X, "hsk2-ref.json"), "utf8"));
const official = new Map();
[1, 2, 3, 4].forEach(l => ref.levels[l].forEach(h => { if (!official.has(h)) official.set(h, l); }));

const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const PY_OK = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ\s,.?!;:'"…\-—()]+$/;
const CJK = /^[一-鿿]+$/, HAS_CJK = /[一-鿿]/;
const VI_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const str = v => typeof v === "string" && v.trim().length > 0;
function has(o, keys, where) { let ok = true; keys.forEach(k => { if (!o || !str(o[k])) { err(where, `missing field "${k}"`); ok = false; } }); return ok; }
function pinyin(py, where) {
  if (!str(py)) return;
  if (/[0-9]/.test(py)) err(where, `pinyin has digits: "${py}"`);
  if (!TONE.test(py)) err(where, `pinyin has no tone marks: "${py}"`);
  if (!PY_OK.test(py)) err(where, `pinyin has unexpected characters: "${py}"`);
}
function viText(vi, where) { if (str(vi) && vi.length > 12 && !VI_MARK.test(vi)) warn(where, `Vietnamese without diacritics? "${vi}"`); }
function quad(o, where, word) {            // {zh, py, vi, en}
  if (!has(o, ["zh", "py", "vi", "en"], where)) return;
  if (!HAS_CJK.test(o.zh)) err(where, "zh has no Chinese text");
  if (/[A-Za-z]/.test(o.zh)) err(where, "zh contains Latin letters");
  pinyin(o.py, where); viText(o.vi, where);
  if (HAS_CJK.test(o.vi + o.en)) err(where, "gloss contains Chinese characters");
  if (word && !o.zh.includes(word)) err(where, `text does not contain the word ${word}`);
}
function gloss(o, where) { has(o, ["hanzi", "pinyin", "vi", "en"], where); if (o && str(o.hanzi) && !CJK.test(o.hanzi)) err(where, "hanzi contains non-Chinese characters"); pinyin(o && o.pinyin, where); viText(o && o.vi, where); }
function refOk(o, where) {                 // ref id must exist and match the hanzi
  if (!str(o.ref)) { err(where, 'missing field "ref"'); return; }
  const w = appById.get(o.ref) || gapById.get(o.ref);
  if (!w) err(where, `ref ${o.ref} does not exist in lessons, decks or gap packs`);
  else if (w.hanzi !== o.hanzi) err(where, `ref ${o.ref} is ${w.hanzi}, not ${o.hanzi}`);
  const src = o.ref.startsWith("x4-") ? "hsk4x" : /^d\d/.test(o.ref) ? "lesson" : /^k/.test(o.ref) ? "core" : "foundation";
  if (o.src !== src) err(where, `src "${o.src}" does not match ref ${o.ref} (expected "${src}")`);
}
const inHsk = h => official.has(h) || gapHanzi.has(h) || (appHanzi.has(h) && (!/^d\d/.test(appHanzi.get(h).id) || appHanzi.get(h).level === "HSK4"));

const KINDS = ["missing", "collocations", "families", "opposites"];
const count = { missing: 0, collocations: 0, phrases: 0, families: 0, familyWords: 0, opposites: 0 };
const ids = new Set(), packKeys = new Set(), gapById = new Map(), gapHanzi = new Set();
const id = (v, re, where) => { if (!str(v)) return err(where, 'missing field "id"'); if (!re.test(v)) err(where, `id "${v}" has the wrong form`); if (ids.has(v) || appById.has(v)) err(where, `duplicate id ${v}`); ids.add(v); };
const sentences = new Map();
const uniqueText = (zh, where) => { if (sentences.has(zh)) err(where, `duplicate sentence (also ${sentences.get(zh)}): ${zh}`); else sentences.set(zh, where); };

packs.forEach((p, i) => {
  const P = `pack[${i}] ${p.kind || "?"} ${p.pack || "?"}`;
  if (!KINDS.includes(p.kind)) return err(P, `kind must be one of ${KINDS.join(", ")}`);
  if (!Number.isInteger(p.pack)) err(P, "pack number missing");
  if (packKeys.has(p.kind + p.pack)) err(P, "duplicate pack number for this kind"); packKeys.add(p.kind + p.pack);
  if (typeof p.checked !== "boolean") err(P, "checked must be true or false");
  has(p.title, ["en", "vi"], P + " title");
  const list = p.kind === "missing" ? p.words : p.items;
  if (!Array.isArray(list) || !list.length) return err(P, p.kind === "missing" ? "words is empty" : "items is empty");
  if (p.kind === "missing" && list.length > 20) err(P, `has ${list.length} words (max 20)`);
});

// gap words first: other kinds may refer to them
packs.filter(p => p.kind === "missing").forEach(p => (p.words || []).forEach((w, k) => {
  const W = `missing ${p.pack} word ${k + 1} (${w.hanzi || "?"})`;
  id(w.id, /^x4-\d{4}$/, W);
  if (!has(w, ["hanzi", "pinyin", "pos", "vi", "en", "level"], W)) return;
  gloss(w, W);
  if (!/^HSK[1-4]$/.test(w.level)) err(W, "level must be HSK1..HSK4");
  if (!official.has(w.hanzi)) err(W, "not on the reference HSK 1-4 list");
  else if ("HSK" + official.get(w.hanzi) !== w.level) err(W, `level ${w.level} differs from reference HSK${official.get(w.hanzi)}`);
  if (appHanzi.has(w.hanzi)) err(W, `already taught in the app (${appHanzi.get(w.hanzi).id})`);
  if (gapHanzi.has(w.hanzi)) err(W, "duplicate hanzi in gap packs");
  gapHanzi.add(w.hanzi); gapById.set(w.id, w);
  const marks = (w.pinyin.match(new RegExp(TONE.source, "g")) || []).length;
  if (marks !== w.hanzi.length && !(w.neutral && marks < w.hanzi.length)) warn(W, `pinyin "${w.pinyin}" has ${marks} tone marks for ${w.hanzi.length} characters`);
  const col = w.collocations || [];
  if (col.length < 1 || col.length > 2) err(W, `needs 1-2 collocations (has ${col.length})`);
  col.forEach((c, j) => quad(c, `${W} collocation ${j + 1}`));
  quad(w.example, W + " example", w.hanzi);
  if (w.example && w.example.zh) uniqueText(w.example.zh, W);
  count.missing++;
}));

const colWords = new Set(), famChars = new Set(), oppPairs = new Set();
packs.forEach(p => {
  if (p.kind === "collocations") (p.items || []).forEach((it, k) => {
    const W = `collocations ${p.pack} item ${k + 1} (${it.hanzi || "?"})`;
    id(it.id, /^x4c-\d{3}$/, W);
    if (!has(it, ["hanzi", "pinyin"], W)) return;
    pinyin(it.pinyin, W); refOk(it, W);
    if (colWords.has(it.hanzi)) err(W, "duplicate word in collocations"); colWords.add(it.hanzi);
    const ph = it.phrases || [];
    if (ph.length !== 3) err(W, `needs exactly 3 phrases (has ${ph.length})`);
    const seen = new Set();
    ph.forEach((c, j) => { quad(c, `${W} phrase ${j + 1}`, it.hanzi); if (c && c.zh === it.hanzi) err(W, "phrase is just the word itself"); if (c && seen.has(c.zh)) err(W, `duplicate phrase ${c.zh}`); seen.add(c && c.zh); count.phrases++; });
    count.collocations++;
  });
  if (p.kind === "families") (p.items || []).forEach((it, k) => {
    const W = `families item ${k + 1} (${it.char || "?"})`;
    id(it.id, /^x4f-\d{2}$/, W);
    if (!has(it, ["char", "pinyin"], W)) return;
    if (!CJK.test(it.char) || it.char.length !== 1) err(W, "char must be one Chinese character");
    pinyin(it.pinyin, W); has(it.note, ["en", "vi"], W + " note"); viText(it.note && it.note.vi, W + " note");
    if (famChars.has(it.char)) err(W, "duplicate family"); famChars.add(it.char);
    const ws = it.words || [];
    if (ws.length < 2) err(W, `needs at least 2 words (has ${ws.length})`);
    const seen = new Set();
    ws.forEach((w, j) => {
      const WW = `${W} word ${j + 1} (${w.hanzi || "?"})`;
      gloss(w, WW); if (!str(w.hanzi)) return;
      if (!w.hanzi.includes(it.char)) err(WW, `does not contain ${it.char}`);
      if (seen.has(w.hanzi)) err(WW, "duplicate word in family"); seen.add(w.hanzi);
      if (!inHsk(w.hanzi)) err(WW, "not an HSK 1-4 word");
      if (!/^HSK[1-4]$/.test(w.level || "")) err(WW, "level must be HSK1..HSK4");
      refOk(w, WW); count.familyWords++;
    });
    count.families++;
  });
  if (p.kind === "opposites") (p.items || []).forEach((it, k) => {
    const W = `opposites item ${k + 1} (${(it.a || {}).hanzi || "?"}/${(it.b || {}).hanzi || "?"})`;
    id(it.id, /^x4o-\d{2}$/, W);
    if (!it.a || !it.b) return err(W, "needs both sides a and b");
    [it.a, it.b].forEach((s, j) => {
      const WW = `${W} side ${"ab"[j]}`;
      gloss(s, WW); if (!str(s.hanzi)) return;
      if (!inHsk(s.hanzi)) err(WW, "not an HSK 1-4 word");
      refOk(s, WW); quad(s.example, WW + " example", s.hanzi);
      if (s.example && s.example.zh) uniqueText(s.example.zh, WW);
    });
    if (it.a.hanzi === it.b.hanzi) err(W, "both sides are the same word");
    const key = [it.a.hanzi, it.b.hanzi].sort().join("/");
    if (oppPairs.has(key)) err(W, "duplicate pair"); oppPairs.add(key);
    count.opposites++;
  });
});

// traditional-only characters that would signal non-simplified text (small sanity list)
const TRAD = /[們這個來時國會學說對麼為與員經過還進開關應資錢發後報業務標準數練習聽讀寫漢語體質]/;
(function scan(n, where) {
  if (typeof n === "string") { if (TRAD.test(n)) err(where, `traditional character in "${n}"`); return; }
  if (Array.isArray(n)) return n.forEach((x, i) => scan(x, `${where}[${i}]`));
  if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) scan(v, `${where}.${k}`);
})(packs, "CB_HSK4X");

console.log(`hsk4x: ${packs.length} packs in ${listed.length} files`);
console.log(`  missing (gap words):  ${count.missing}`);
console.log(`  collocations:         ${count.collocations} words, ${count.phrases} phrases (lesson refs: ${[...colWords].filter(h => /^d\d/.test((appHanzi.get(h) || {}).id || "")).length})`);
console.log(`  families:             ${count.families} families, ${count.familyWords} member words`);
console.log(`  opposites:            ${count.opposites} pairs, ${count.opposites * 2} example sentences`);
if (count.collocations && count.collocations < 150) warn("collocations", `only ${count.collocations} words (target 150)`);
if (count.families && count.families < 40) warn("families", `only ${count.families} (target 40)`);
if (count.opposites && count.opposites < 60) warn("opposites", `only ${count.opposites} (target 60)`);
warnings.forEach(w => console.log("WARN  " + w));
errors.forEach(e => console.log("ERROR " + e));
console.log(errors.length ? `\nFAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `\nOK: 0 errors, ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
