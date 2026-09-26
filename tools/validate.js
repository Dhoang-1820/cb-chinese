#!/usr/bin/env node
/* Validates data/*.js content.  Usage:  node tools/validate.js
   Exit code 1 if any ERROR is found (warnings don't fail). */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const WORDS_PER_LESSON = 10;
const QUIZ_LEN = 10;
const LEVELS = ["HSK4", "Beyond HSK4"];
const TONE_VOWELS = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
const CJK = /^[㐀-鿿]+$/;

const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const sandbox = { window: {} };
vm.createContext(sandbox);
function run(file) {
  const full = path.join(DATA, file);
  if (!fs.existsSync(full)) { err(file, "file listed in manifest does not exist"); return; }
  try { vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: file }); }
  catch (e) { err(file, "JavaScript error: " + e.message); }
}

run("manifest.js");
const manifest = sandbox.window.CB_MANIFEST || [];
const plan = sandbox.window.CB_PLAN || [];
if (!manifest.length) err("manifest.js", "CB_MANIFEST is empty or missing");
manifest.forEach(run);
const days = sandbox.window.CB_DAYS || [];

const has = (o, keys, where) => keys.forEach(k => {
  if (o == null || o[k] == null || (typeof o[k] === "string" && !o[k].trim())) err(where, `missing field "${k}"`);
});
const tri = (o, where) => has(o, ["zh", "py", "vi", "en"], where);

const seenDay = {}, seenHanzi = {}, seenId = {};
let totalWords = 0;
const levelCount = { HSK4: 0, "Beyond HSK4": 0 };

days.forEach(d => {
  const W = `Day ${d.day}`;
  if (!Number.isInteger(d.day)) { err("?", "day number missing"); return; }
  if (seenDay[d.day]) err(W, "duplicate day number");
  seenDay[d.day] = d;
  if (!["lesson", "review"].includes(d.type)) err(W, `type must be "lesson" or "review"`);
  has(d.title, ["zh", "vi", "en"], W + " title");
  const p = plan.find(x => x.day === d.day);
  if (!p) warn(W, "not in CB_PLAN");
  else if (p.type !== d.type) warn(W, `type "${d.type}" differs from plan "${p.type}"`);

  const words = d.words || [];
  if (d.type === "lesson" && words.length !== WORDS_PER_LESSON) err(W, `has ${words.length} words, expected ${WORDS_PER_LESSON}`);
  if (d.type === "review") {
    if (words.length) err(W, "review days must not add new words");
    if (!Array.isArray(d.reviewOf) || !d.reviewOf.length) err(W, "review day needs reviewOf: [day numbers]");
  }

  words.forEach((w, i) => {
    const WW = `${W} word ${i + 1} (${w.hanzi || "?"})`;
    has(w, ["id", "hanzi", "pinyin", "pos", "vi", "en", "level"], WW);
    if (w.id) { if (seenId[w.id]) err(WW, `duplicate id ${w.id}`); seenId[w.id] = true; }
    if (w.hanzi) {
      if (!CJK.test(w.hanzi)) err(WW, "hanzi contains non-Chinese characters");
      if (seenHanzi[w.hanzi]) err(WW, `duplicate hanzi (also Day ${seenHanzi[w.hanzi]})`);
      else seenHanzi[w.hanzi] = d.day;
    }
    if (w.pinyin) {
      const marks = (w.pinyin.match(TONE_VOWELS) || []).length;
      if (w.hanzi && marks !== w.hanzi.length && !(w.neutral && marks < w.hanzi.length)) warn(WW, `pinyin "${w.pinyin}" has ${marks} tone marks for ${w.hanzi.length} characters (add neutral: true if a syllable is neutral tone)`);
      if (/[1-5]/.test(w.pinyin)) err(WW, "use tone marks, not tone numbers");
    }
    if (w.level && !LEVELS.includes(w.level)) err(WW, `level must be one of ${LEVELS.join(", ")}`);
    else if (w.level) levelCount[w.level]++;
    const col = w.collocations || [];
    if (col.length < 1 || col.length > 2) err(WW, `needs 1–2 collocations (has ${col.length})`);
    col.forEach((c, k) => tri(c, `${WW} collocation ${k + 1}`));
    tri(w.example, WW + " example");
    if (w.example && w.hanzi && w.example.zh && !w.example.zh.includes(w.hanzi)) err(WW, "example sentence does not contain the word");
    totalWords++;
  });

  // reading
  const r = d.reading;
  if (!r) err(W, "missing reading (dialogue or passage)");
  else {
    has(r.title, ["zh", "vi", "en"], W + " reading title");
    if (!Array.isArray(r.lines) || r.lines.length < 4) err(W, "reading needs at least 4 lines");
    (r.lines || []).forEach((l, k) => tri(l, `${W} reading line ${k + 1}`));
    const text = (r.lines || []).map(l => l.zh).join("");
    const unused = words.filter(w => !text.includes(w.hanzi)).map(w => w.hanzi);
    if (unused.length) warn(W, `words not used in the reading: ${unused.join(" ")}`);
  }

  // grammar
  if (d.type === "lesson") {
    const g = d.grammar;
    if (!g) err(W, "missing grammar point");
    else {
      has(g, ["point", "py", "structure"], W + " grammar");
      has(g.meaning, ["vi", "en"], W + " grammar meaning");
      has(g.explain, ["vi", "en"], W + " grammar explanation");
      if (!g.examples || g.examples.length < 2) err(W, "grammar needs at least 2 examples");
      (g.examples || []).forEach((e, k) => tri(e, `${W} grammar example ${k + 1}`));
    }
  }

  // exercises
  const ex = d.exercises || {};
  const fill = ex.fill || [];
  if (fill.length < 3) err(W, `needs at least 3 fill-in-the-blank items (has ${fill.length})`);
  const pool = d.type === "review"
    ? (d.reviewOf || []).flatMap(n => (seenDay[n] ? seenDay[n].words : []) || []).map(w => w.hanzi)
    : words.map(w => w.hanzi);
  fill.forEach((f, k) => {
    const FW = `${W} fill ${k + 1}`;
    has(f, ["zh", "answer", "vi", "en"], FW);
    if (f.zh && (f.zh.match(/___/g) || []).length !== 1) err(FW, "must contain exactly one ___ blank");
    if (f.answer && pool.length && !pool.includes(f.answer)) warn(FW, `answer "${f.answer}" is not one of the day's words`);
  });
  const tr = ex.translate || [];
  if (tr.length < 2) err(W, `needs at least 2 translation items (has ${tr.length})`);
  tr.forEach((t, k) => tri(t, `${W} translate ${k + 1}`));

  // quiz
  const quiz = d.quiz || [];
  if (quiz.length !== QUIZ_LEN) err(W, `quiz has ${quiz.length} questions, expected ${QUIZ_LEN}`);
  quiz.forEach((q, k) => {
    const QW = `${W} quiz ${k + 1}`;
    if (!q.q) err(QW, "missing question text");
    if (!Array.isArray(q.options) || q.options.length < 2) { err(QW, "needs at least 2 options"); return; }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(QW, `answer index ${q.answer} is not a valid option`);
    const keys = q.options.map(o => typeof o === "string" ? o : JSON.stringify(o));
    if (new Set(keys).size !== keys.length) err(QW, "duplicate options");
    q.options.forEach((o, j) => { if (typeof o !== "string") has(o, ["vi", "en"], `${QW} option ${j + 1}`); });
  });
});

// every pinyin string must contain only Latin letters, tone-marked vowels and punctuation
const PY_OK = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ\s,.?!;:'’“”"…\-—–·()%/&+]+$/;
function scanPinyin(node, where) {
  if (Array.isArray(node)) return node.forEach((n, i) => scanPinyin(n, `${where}[${i}]`));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if ((k === "py" || k === "pinyin") && typeof v === "string" && !PY_OK.test(v)) {
      const bad = [...v].filter(c => !PY_OK.test(c)).join("");
      err(where, `pinyin contains invalid characters "${bad}": ${v}`);
    } else if (typeof v === "object") scanPinyin(v, `${where}.${k}`);
  }
}
days.forEach(d => scanPinyin(d, `Day ${d.day}`));

// review days must point to existing earlier lesson days
days.filter(d => d.type === "review").forEach(d => (d.reviewOf || []).forEach(n => {
  if (!seenDay[n]) warn(`Day ${d.day}`, `reviewOf day ${n} is not loaded yet`);
  else if (n >= d.day) err(`Day ${d.day}`, `reviewOf day ${n} is not an earlier day`);
}));

// ---- HSK 4 Core deck ----
run("core-manifest.js");
(sandbox.window.CB_CORE_FILES || []).forEach(run);
const core = sandbox.window.CB_CORE || [];
const coreIds = {}, coreHz = {};
let coreWords = 0;
core.forEach(set => (set.words || []).forEach(w => {
  const where = `Core set ${set.set} · ${w.id || "?"}`;
  coreWords++;
  has(w, ["id", "hanzi", "pinyin", "pos", "vi", "en", "example"], where);
  if (w.example) has(w.example, ["zh", "py", "vi", "en"], where + " example");
  if (coreIds[w.id]) err(where, "duplicate core id"); coreIds[w.id] = 1;
  if (coreHz[w.hanzi]) err(where, `duplicate hanzi ${w.hanzi} in core`); coreHz[w.hanzi] = 1;
  if (seenHanzi[w.hanzi]) err(where, `${w.hanzi} is already a C&B lesson word`);
  if (w.example && w.example.zh && !w.example.zh.includes(w.hanzi)) err(where, `example doesn't contain ${w.hanzi}`);
}));
scanPinyin(core, "Core");

// ---- mock exams ----
run("mock-manifest.js");
const mockFiles = sandbox.window.CB_MOCK_FILES || [];
mockFiles.forEach(run);
const mocks = sandbox.window.CB_MOCK || [];
if (!mocks.length) warn("mock-manifest.js", "CB_MOCK is empty — mock exam tab will show nothing");
mocks.forEach(m => {
  const where = `Mock ${m.id}`;
  if (!m.title) err(where, "missing title");
  const checkMC = (item, label, nOpts) => {
    if (!Array.isArray(item.options) || item.options.length !== nOpts) err(where, `${label} needs exactly ${nOpts} options`);
    if (typeof item.answer !== "number" || item.answer < 0 || item.answer >= (item.options || []).length) err(where, `${label} answer index out of range`);
  };
  (m.listening.p1 || []).forEach(it => { has(it, ["audio", "statement"], where); if (typeof it.answer !== "boolean") err(where, `${it.id} answer must be true/false`); });
  (m.listening.p2 || []).forEach(it => { if (!Array.isArray(it.dialogue) || !it.dialogue.length) err(where, `${it.id} missing dialogue`); checkMC(it, it.id, 4); });
  (m.listening.p3 || []).forEach(it => { has(it, ["audio", "question"], where); checkMC(it, it.id, 4); });
  (m.reading.p1 || []).concat(m.reading.p2 || []).forEach(it => { if (!it.sentence.includes("____")) err(where, `${it.id} sentence needs a ____ blank`); checkMC(it, it.id, 4); });
  (m.reading.p3 || []).forEach((pg, i) => (pg.questions || []).forEach(q => checkMC(q, `passage ${i + 1} · ${q.id}`, 4)));
  (m.writing.p1 || []).forEach(it => {
    if (!Array.isArray(it.tokens) || it.tokens.length < 3) err(where, `${it.id} needs 3+ tokens`);
    if (it.tokens.join("") !== it.answer) err(where, `${it.id} tokens joined don't equal the answer`);
    const sorted = x => [...x].sort().join("");
    (it.alt || []).forEach(alt => { if (sorted(alt) !== sorted(it.answer)) err(where, `${it.id} alt "${alt}" uses different characters than the answer`); });
  });
  (m.writing.p2 || []).forEach(it => has(it, ["word", "emoji", "sample"], where));
  const counts = { L1: (m.listening.p1 || []).length, L2: (m.listening.p2 || []).length, L3: (m.listening.p3 || []).length,
    R1: (m.reading.p1 || []).length, R2: (m.reading.p2 || []).length, R3: (m.reading.p3 || []).reduce((s, p) => s + (p.questions || []).length, 0),
    W1: (m.writing.p1 || []).length, W2: (m.writing.p2 || []).length };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total < 20) warn(where, `only ${total} items total — feels thin for a mock test`);
});

// report
const lessons = days.filter(d => d.type === "lesson").length;
const reviews = days.filter(d => d.type === "review").length;
console.log("C&B Chinese — content validation");
console.log("================================");
console.log(`Files in manifest : ${manifest.length}`);
console.log(`Days loaded       : ${days.length} (${lessons} lesson, ${reviews} review) → ${days.map(d => d.day).join(", ")}`);
console.log(`Words             : ${totalWords} (unique hanzi: ${Object.keys(seenHanzi).length})`);
console.log(`Level mix         : HSK4 ${levelCount.HSK4} · Beyond HSK4 ${levelCount["Beyond HSK4"]}` +
  (totalWords ? ` (${Math.round(levelCount.HSK4 / totalWords * 100)}% HSK4)` : ""));
console.log(`Quiz questions    : ${days.reduce((s, d) => s + (d.quiz || []).length, 0)}`);
console.log("");
const checks = [
  ["All required fields present", !errors.some(e => /missing|needs/.test(e))],
  ["No duplicate hanzi", !errors.some(e => /duplicate hanzi/.test(e))],
  ["Correct word count per day", !errors.some(e => /words, expected|must not add new words/.test(e))],
  ["Every quiz answer exists in its options", !errors.some(e => /answer index|quiz has/.test(e))],
  ["Mock exams well-formed", !errors.some(e => /^Mock \d/.test(e))]
];
console.log(`Mock exams        : ${mocks.length}`);
console.log(`HSK 4 Core        : ${core.length} sets, ${coreWords} words`);
checks.forEach(([name, ok]) => console.log(`${ok ? "PASS" : "FAIL"}  ${name}`));
console.log("");
if (warnings.length) { console.log(`Warnings (${warnings.length}):`); warnings.forEach(w => console.log("  ⚠ " + w)); console.log(""); }
if (errors.length) { console.log(`Errors (${errors.length}):`); errors.forEach(e => console.log("  ✗ " + e)); process.exit(1); }
console.log("✓ No errors.");
