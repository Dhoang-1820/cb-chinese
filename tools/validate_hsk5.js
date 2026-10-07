#!/usr/bin/env node
/* Validates the HSK 5 word packs in data/hsk5/wordsNN.js.  Usage:  node tools/validate_hsk5.js
   Exit code 1 if any ERROR is found (warnings don't fail). */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const H5 = path.join(DATA, "hsk5");
const PACK_SIZE = 20;
const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const TONE_G = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
const CJK = /^[㐀-鿿]+$/;
const ZH_ALLOWED = /^[㐀-鿿，。？！、：；“”…—《》]+$/;      // example sentences: Chinese characters + Chinese punctuation
const PY_ALLOWED = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜĀÁǍÀĒÉĚÈŌÓǑÒ ,.?!:;'“”…—-]+$/;
const VI_MARK = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const POS = new Set(["n.", "v.", "adj.", "adv.", "m.", "conj.", "prep.", "pron.", "int.", "num.", "part.", "aux."]);
const EX_MIN = 8, EX_MAX = 20;

const errors = [], warnings = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warnings.push(`${w}: ${m}`);

function load(files, dir, ctx) {
  for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f }); }
    catch (e) { err(f, "JavaScript error: " + e.message); }
  }
}

/* ---- words already taught in the app: the 90 daily lessons (and, as a warning only, the core decks) */
const app = { window: {} };
vm.createContext(app);
const dayFiles = fs.readdirSync(DATA).filter(f => /^day\d+\.js$/.test(f)).sort();
load(dayFiles, DATA, app);
const lessonWords = new Map();
(app.window.CB_DAYS || []).forEach(d => (d.words || []).forEach(w => lessonWords.set(w.hanzi, "Day " + d.day)));
const lessonIds = new Set();
(app.window.CB_DAYS || []).forEach(d => (d.words || []).forEach(w => lessonIds.add(w.id)));
const coreFiles = fs.readdirSync(DATA).filter(f => /^core\d+\.js$/.test(f)).sort();
load(coreFiles, DATA, app);
const coreWords = new Map();
(app.window.CB_CORE || []).forEach((c, i) => (c.words || []).forEach(w => { if (w && w.hanzi) coreWords.set(w.hanzi, "core deck " + (c.deck || c.id || i + 1)); }));
if (!lessonWords.size) err("data/day*.js", "no lesson words could be loaded");

/* ---- the packs */
const ctx = { window: {} };
vm.createContext(ctx);
const packFiles = fs.existsSync(H5) ? fs.readdirSync(H5).filter(f => /^words\d+\.js$/.test(f)).sort() : [];
if (!packFiles.length) err("data/hsk5", "no wordsNN.js files found");
load(packFiles, H5, ctx);
const packs = ctx.window.CB_HSK5 || [];
if (packs.length !== packFiles.length) err("data/hsk5", `${packFiles.length} files but ${packs.length} packs pushed to CB_HSK5`);

const need = (o, keys, where) => keys.forEach(k => {
  if (o == null || typeof o[k] !== "string" || !o[k].trim()) err(where, `missing field "${k}"`);
});
const zhLen = s => (s.match(/[㐀-鿿]/g) || []).length;

const seenId = new Map(), seenHanzi = new Map(), seenZh = new Map(), posCount = {};
let total = 0, zhChars = 0, exMin = 99, exMax = 0, neutral = 0, bytes = 0;
packFiles.forEach(f => { bytes += fs.statSync(path.join(H5, f)).size; });

packs.forEach((p, pi) => {
  const P = `pack ${p.pack}`;
  if (p.pack !== pi + 1) err(P, `pack number should be ${pi + 1} (file ${packFiles[pi]})`);
  if (packFiles[pi] !== `words${String(pi + 1).padStart(2, "0")}.js`) err(P, `unexpected file name ${packFiles[pi]}`);
  if (typeof p.checked !== "boolean") err(P, `"checked" must be true or false`);
  need(p.title, ["en", "vi"], P + " title");
  const words = Array.isArray(p.words) ? p.words : [];
  if (!words.length) err(P, "has no words");
  if (words.length > PACK_SIZE) err(P, `has ${words.length} words, at most ${PACK_SIZE}`);
  if (words.length < PACK_SIZE && pi !== packs.length - 1) err(P, `has ${words.length} words; only the last pack may be short`);

  words.forEach((w, i) => {
    const W = `${P} word ${i + 1} (${w.hanzi || "?"})`;
    total++;
    need(w, ["id", "hanzi", "pinyin", "pos", "vi", "en", "level"], W);
    if (w.id) {
      if (!/^h5-\d{4}$/.test(w.id)) err(W, `id "${w.id}" must look like h5-0001`);
      else if (Number(w.id.slice(3)) !== total) err(W, `id ${w.id} is out of sequence (expected h5-${String(total).padStart(4, "0")})`);
      if (seenId.has(w.id)) err(W, `duplicate id ${w.id}`);
      if (lessonIds.has(w.id)) err(W, `id ${w.id} collides with a lesson word id`);
      seenId.set(w.id, W);
    }
    if (w.level !== "HSK5") err(W, `level must be "HSK5"`);
    if (w.hanzi) {
      if (!CJK.test(w.hanzi)) err(W, "hanzi contains non-Chinese characters");
      if (seenHanzi.has(w.hanzi)) err(W, `duplicate hanzi (also ${seenHanzi.get(w.hanzi)})`);
      seenHanzi.set(w.hanzi, W);
      if (lessonWords.has(w.hanzi)) err(W, `already taught in the HSK 1-4 lessons (${lessonWords.get(w.hanzi)})`);
      else if (coreWords.has(w.hanzi)) warn(W, `also in ${coreWords.get(w.hanzi)}`);
    }
    if (w.pinyin) {
      if (/\d/.test(w.pinyin)) err(W, "pinyin uses digits; use tone marks");
      if (!TONE.test(w.pinyin)) err(W, `pinyin "${w.pinyin}" has no tone mark`);
      if (!PY_ALLOWED.test(w.pinyin)) err(W, `pinyin "${w.pinyin}" has unexpected characters`);
      if (/\s/.test(w.pinyin)) err(W, `headword pinyin "${w.pinyin}" should be written as one word`);
      const marks = (w.pinyin.match(TONE_G) || []).length;
      if (w.hanzi && marks > w.hanzi.length) err(W, `pinyin "${w.pinyin}" has more tone marks than characters`);
      if (w.hanzi && marks < w.hanzi.length) neutral++;
    }
    if (w.pos) {
      w.pos.split("/").forEach(x => { if (!POS.has(x)) err(W, `unknown part of speech "${x}"`); });
      posCount[w.pos.split("/")[0]] = (posCount[w.pos.split("/")[0]] || 0) + 1;
    }

    const e = w.example;
    if (!e || typeof e !== "object") { err(W, "missing example"); return; }
    need(e, ["zh", "py", "vi", "en"], W + " example");
    if (typeof e.zh === "string" && e.zh) {
      if (w.hanzi && !e.zh.includes(w.hanzi)) err(W, `example does not contain the word: ${e.zh}`);
      if (!ZH_ALLOWED.test(e.zh)) err(W, `example has characters that are not Chinese or allowed punctuation: ${e.zh}`);
      if (!/[。？！]$/.test(e.zh)) err(W, `example must end with 。？ or ！: ${e.zh}`);
      const n = zhLen(e.zh);
      zhChars += n; exMin = Math.min(exMin, n); exMax = Math.max(exMax, n);
      if (n < EX_MIN || n > EX_MAX) err(W, `example has ${n} Chinese characters (allowed ${EX_MIN}-${EX_MAX}): ${e.zh}`);
      if (seenZh.has(e.zh)) err(W, `example sentence repeated (also ${seenZh.get(e.zh)})`);
      seenZh.set(e.zh, W);
    }
    if (typeof e.py === "string" && e.py) {
      if (/\d/.test(e.py)) err(W, "example pinyin uses digits");
      if (!TONE.test(e.py)) err(W, "example pinyin has no tone marks");
      if (!PY_ALLOWED.test(e.py)) err(W, `example pinyin has unexpected characters: ${e.py}`);
      if (/[㐀-鿿]/.test(e.py)) err(W, "example pinyin contains Chinese characters");
      if (e.py[0] !== e.py[0].toUpperCase() && e.py[0] !== "“") err(W, `example pinyin should start with a capital: ${e.py}`);
      if (!/[.?!”]$/.test(e.py)) err(W, `example pinyin should end with punctuation: ${e.py}`);
      // every Chinese character is one syllable: the number of tone marks can never exceed it
      if (typeof e.zh === "string" && (e.py.match(TONE_G) || []).length > zhLen(e.zh)) err(W, `example pinyin has more tone marks than the sentence has characters`);
      if (w.pinyin && !e.py.toLowerCase().replace(/[ '-]/g, "").includes(w.pinyin.toLowerCase().replace(/[ '-]/g, "")))
        warn(W, `example pinyin does not contain the headword reading "${w.pinyin}": ${e.py}`);
    }
    if (e.vi && !VI_MARK.test(e.vi)) err(W, `example vi has no Vietnamese diacritics: ${e.vi}`);
    if (e.en && !/^[\x20-\x7e“”‘’—–é]+$/.test(e.en)) err(W, `example en has unexpected characters: ${e.en}`);
  });
});

console.log("HSK 5 word packs");
console.log(`  packs: ${packs.length}   words: ${total}   unchecked packs: ${packs.filter(p => p.checked === false).length}`);
console.log(`  compared with ${lessonWords.size} lesson words (${dayFiles.length} day files) and ${coreWords.size} core-deck words`);
console.log(`  examples: ${seenZh.size} sentences, ${exMin}-${exMax} characters, average ${(zhChars / Math.max(1, seenZh.size)).toFixed(1)}`);
console.log(`  headwords with a neutral-tone syllable: ${neutral}`);
console.log(`  first part of speech: ${Object.entries(posCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  size: ${(bytes / 1024).toFixed(0)} KB in ${packFiles.length} files`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.forEach(w => console.log("  WARN  " + w)); }
if (errors.length) { console.log(`\n${errors.length} error(s):`); errors.forEach(e => console.log("  ERROR " + e)); process.exit(1); }
console.log("\nOK: no errors.");
