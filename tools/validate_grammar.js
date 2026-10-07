#!/usr/bin/env node
/* Validates the grammar checklists:
     data/grammar.js        -> window.CB_GRAMMAR        (HSK 4, ids g01..g99)
     data/hsk5/grammar.js   -> window.CB_HSK5_GRAMMAR   (HSK 5, ids h5g01..h5g99)
   Usage: node tools/validate_grammar.js      (exit code 1 on any error) */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");

const QUIZ_PER_POINT = 5, OPTIONS = 4, MIN_EXAMPLES = 2, EX_MIN = 8, EX_MAX = 22;
const SETS = [
  { name: "HSK 4", file: "data/grammar.js", global: "CB_GRAMMAR", id: /^g(\d\d)$/, prefix: "g" },
  { name: "HSK 5", file: "data/hsk5/grammar.js", global: "CB_HSK5_GRAMMAR", id: /^h5g(\d\d)$/, prefix: "h5g" }
];

const CJK = /[一-鿿]/, CJK_G = /[一-鿿]/g;
const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i, TONE_G = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/gi;
const PY_OK = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ\s,.?!;:'’“”"…\-—–·()%/&+]+$/; // same set as tools/validate.js
const VI_MARK = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
// a few very common traditional-only characters; the app is simplified Chinese only
const TRAD = /[們這個來時說對為會過還沒學習問題點錢買賣開關認識讓請謝東車長門間電話語漢國經應該當場業務員資種樣處離難雖與給從後術據類報較選擇決結論]/;

const errors = [], warns = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warns.push(`${w}: ${m}`);
const str = v => typeof v === "string" && v.trim().length > 0;

function bilingual(o, where, zhToo) {
  if (!o || typeof o !== "object") return err(where, "missing object");
  if (zhToo) { if (!str(o.zh)) err(where, "missing zh"); else if (!CJK.test(o.zh)) err(where, "zh has no Chinese characters"); }
  if (!str(o.vi)) err(where, "missing vi"); else if (!VI_MARK.test(o.vi)) err(where, "vi has no Vietnamese diacritics");
  if (!str(o.en)) err(where, "missing en");
}
function checkChinese(s, where) {
  if (TRAD.test(s)) err(where, `traditional character found: ${s.match(TRAD)[0]} in "${s}"`);
}
function checkPinyin(py, zh, where) {
  if (!str(py)) return err(where, "missing py");
  if (/\d/.test(py)) err(where, `pinyin contains digits: ${py}`);
  if (CJK.test(py)) err(where, `pinyin contains Chinese characters: ${py}`);
  if (!PY_OK.test(py)) err(where, `pinyin contains invalid characters "${[...py].filter(c => !PY_OK.test(c)).join("")}": ${py}`);
  if (!TONE.test(py)) err(where, `pinyin has no tone marks: ${py}`);
  if (!/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(py)) err(where, `pinyin should start with a capital letter: ${py}`);
  const han = (zh.match(CJK_G) || []).length, tones = (py.match(TONE_G) || []).length;
  // every syllable has at most one tone mark; neutral tones have none
  if (tones > han) err(where, `more tone marks (${tones}) than characters (${han}): ${py}`);
  if (tones < han * 0.6) err(where, `too few tone marks (${tones}) for ${han} characters: ${py}`);
}

function validateSet(set) {
  const full = path.join(ROOT, set.file);
  if (!fs.existsSync(full)) { err(set.file, "file not found"); return { points: 0, questions: 0 }; }
  const sandbox = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(full, "utf8"), sandbox, { filename: set.file }); }
  catch (e) { err(set.file, "does not parse: " + e.message); return { points: 0, questions: 0 }; }
  const list = sandbox.window[set.global];
  if (!Array.isArray(list) || !list.length) { err(set.file, `window.${set.global} is missing or empty`); return { points: 0, questions: 0 }; }

  const seen = {}, seenQ = {}, seenEx = {}, pos = [0, 0, 0, 0];
  let questions = 0;
  list.forEach((g, idx) => {
    const W = `${set.name} ${g && g.id || "#" + (idx + 1)}`;
    if (!g || typeof g !== "object") return err(W, "not an object");
    const extra = Object.keys(g).filter(k => !["id", "title", "pattern", "explain", "examples", "quiz"].includes(k));
    if (extra.length) err(W, "unexpected keys: " + extra.join(", "));
    // id
    if (!str(g.id) || !set.id.test(g.id)) err(W, `id must match ${set.id}`);
    else {
      if (seen[g.id]) err(W, "duplicate id"); seen[g.id] = 1;
      const want = set.prefix + String(idx + 1).padStart(2, "0");
      if (g.id !== want) err(W, `ids must be consecutive: expected ${want} at position ${idx + 1}`);
    }
    bilingual(g.title, W + " title", true);
    if (g.title && str(g.title.zh)) checkChinese(g.title.zh, W + " title");
    if (!str(g.pattern)) err(W, "missing pattern"); else if (!CJK.test(g.pattern)) err(W, "pattern has no Chinese characters");
    bilingual(g.explain, W + " explain", false);
    // examples
    if (!Array.isArray(g.examples) || g.examples.length < MIN_EXAMPLES) err(W, `needs at least ${MIN_EXAMPLES} examples`);
    (g.examples || []).forEach((e, i) => {
      const X = `${W} example ${i + 1}`;
      bilingual(e, X, true);
      if (!e || !str(e.zh)) return;
      checkChinese(e.zh, X);
      const n = (e.zh.match(CJK_G) || []).length;
      if (n < EX_MIN || n > EX_MAX) (idx < 25 && set.prefix === "g" ? warn : err)(X, `${n} characters (want ${EX_MIN}-${EX_MAX}): ${e.zh}`);
      if (!/[。？！]$/.test(e.zh)) err(X, "example should end with 。？ or ！");
      if (/[,.?!;:]/.test(e.zh)) err(X, "ASCII punctuation in Chinese sentence");
      checkPinyin(e.py, e.zh, X);
      if (seenEx[e.zh]) err(X, `same example as ${seenEx[e.zh]}`); seenEx[e.zh] = W;
    });
    // quiz
    if (!Array.isArray(g.quiz) || g.quiz.length !== QUIZ_PER_POINT) err(W, `needs exactly ${QUIZ_PER_POINT} questions, has ${(g.quiz || []).length}`);
    (g.quiz || []).forEach((q, i) => {
      const X = `${W} quiz ${i + 1}`;
      questions++;
      if (!q || typeof q !== "object") return err(X, "not an object");
      if (!str(q.q) || !CJK.test(q.q)) err(X, "question text missing or has no Chinese");
      else {
        checkChinese(q.q, X);
        const blanks = (q.q.match(/_{2,}/g) || []).length;
        if (blanks > 1) err(X, "more than one blank");
        if (blanks === 1 && !/____/.test(q.q)) err(X, "blank must be written ____");
        if (seenQ[q.q + "|" + (q.options || []).join("|")]) err(X, "duplicate question");
        seenQ[q.q + "|" + (q.options || []).join("|")] = 1;
      }
      if (!Array.isArray(q.options) || q.options.length !== OPTIONS) err(X, `needs ${OPTIONS} options`);
      else {
        if (new Set(q.options).size !== OPTIONS) err(X, "duplicate options");
        q.options.forEach(o => { if (!str(o)) err(X, "empty option"); else { if (!CJK.test(o)) err(X, `option has no Chinese: ${o}`); checkChinese(o, X); } });
      }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= OPTIONS) err(X, "answer index out of range");
      else pos[q.answer]++;
      bilingual(q.explain, X + " explain", false);
    });
  });
  console.log(`${set.name.padEnd(6)}: ${list.length} points, ${questions} questions, ids ${list[0].id}..${list[list.length - 1].id}, answer positions A/B/C/D = ${pos.join("/")}`);
  return { points: list.length, questions };
}

const totals = SETS.map(validateSet);
console.log(`Total : ${totals.reduce((s, t) => s + t.points, 0)} points, ${totals.reduce((s, t) => s + t.questions, 0)} questions`);
if (warns.length) { console.log(`\n${warns.length} warning(s):`); warns.forEach(w => console.log("  WARN  " + w)); }
if (errors.length) { console.log(`\n${errors.length} error(s):`); errors.forEach(e => console.log("  FAIL  " + e)); process.exit(1); }
console.log("\n✓ Grammar data OK.");
