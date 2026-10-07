/* Checks data/drills.js (window.CB_DRILLS) and, when present, data/drills_extra.js (window.CB_DRILLS_EXTRA).
   Usage: node tools/validate_drills.js        → prints counts, exits 1 on any error.
   Rules are described in data/DRILLS.md. This does not replace tools/validate.js; it is stricter and only about drills. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DATA = path.join(__dirname, "..", "data");
const errors = [], warnings = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warnings.push(`${w}: ${m}`);

const sandbox = { window: {} };
vm.createContext(sandbox);
function load(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return false;
  try { vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: file }); }
  catch (e) { err(file, "does not run: " + e.message); }
  return true;
}

// Same pattern the server uses for problem reports (supabase/functions/ai/index.ts).
const REPORT_ID = /^(drill|mock|gq|word|grammar):[A-Za-z0-9_.-]{1,24}(:\d{1,3})?$/;
const PY_OK = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ\s,.?!;:'’“”"…\-—–·()%/&+]+$/;
const HAN = /[㐀-鿿]/;
const VI_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const GAP = "____";
const isStr = v => typeof v === "string" && v.trim().length > 0;
const gaps = s => String(s || "").split(GAP).length - 1;
const norm = s => String(s || "").replace(/[\s，。？！、；：“”‘’,.?!;:"']/g, "");

const allIds = new Map();       // id → where, across every set (ids share the "drill:" namespace)
function checkId(id, prefix, where, sub) {
  if (!isStr(id)) { err(where, "missing id"); return; }
  if (!new RegExp("^" + prefix + "\\d{2,3}$").test(id)) err(where, `id "${id}" does not follow the scheme ${prefix}NN`);
  const rid = "drill:" + id + (sub ? ":" + sub : "");
  if (!REPORT_ID.test(rid)) err(where, `"${rid}" does not match the problem-report id pattern`);
  if (!sub) { if (allIds.has(id)) err(where, `duplicate id (also ${allIds.get(id)})`); allIds.set(id, where); }
}
function checkSeq(list, prefix, name) {   // ids must run prefix01, prefix02, … without gaps, in file order
  list.forEach((it, i) => {
    const want = prefix + String(i + 1).padStart(2, "0");
    if (it && it.id !== want) err(`${name}[${i}]`, `expected id ${want}, found ${it && it.id}`);
  });
}
function bilingual(o, where, label) {
  if (!o || !isStr(o.vi) || !isStr(o.en)) { err(where, `${label} needs non-empty vi and en`); return; }
  if (!VI_MARK.test(o.vi)) warn(where, `${label}.vi has no Vietnamese diacritics`);
}
function dupes(list, keyFn, name, what) {
  const seen = new Map();
  list.forEach(it => {
    const k = keyFn(it); if (!k) return;
    if (seen.has(k)) err(`${name} ${it.id}`, `duplicate ${what} (same as ${seen.get(k)})`);
    else seen.set(k, it.id);
  });
}
function isPermutation(tokens, sentence) {   // can `sentence` be built from every token exactly once?
  const used = tokens.map(() => false);
  return (function go(rest) {
    if (!rest.length) return used.every(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      if (used[i] || !rest.startsWith(tokens[i])) continue;
      used[i] = true; if (go(rest.slice(tokens[i].length))) return true; used[i] = false;
    }
    return false;
  })(String(sentence || ""));
}

// ---------------------------------------------------------------- data/drills.js
if (!load("drills.js")) err("drills.js", "file not found");
const D = sandbox.window.CB_DRILLS || {};
["confuse", "order", "picture", "measure"].forEach(k => { if (!Array.isArray(D[k]) || !D[k].length) err("CB_DRILLS", `set "${k}" is missing or empty`); });
Object.keys(D).forEach(k => { if (!["confuse", "order", "picture", "measure"].includes(k)) err("CB_DRILLS", `unknown set "${k}" (new kinds of set go in drills_extra.js)`); });

// confuse: { id, words[2+], q (one gap), answer ∈ words, explain{vi,en} }
const confuse = D.confuse || [];
checkSeq(confuse, "c", "confuse");
confuse.forEach(it => {
  const w = "confuse " + it.id; checkId(it.id, "c", w);
  if (!Array.isArray(it.words) || it.words.length < 2 || !it.words.every(isStr)) { err(w, "words must be 2 or more strings"); return; }
  if (new Set(it.words).size !== it.words.length) err(w, "words has duplicates");
  if (!it.words.includes(it.answer)) err(w, `answer "${it.answer}" is not one of words`);
  if (!isStr(it.q) || gaps(it.q) !== 1) err(w, "q needs exactly one ____");
  else it.words.forEach(x => { if (it.q.includes(x)) warn(w, `the sentence already contains the option ${x}`); });
  bilingual(it.explain, w, "explain");
});
dupes(confuse, it => norm(it.q), "confuse", "question");

// order: { id, parts{A,B,C}, answer (permutation of ABC), vi, en, clue{vi,en} }
const order = D.order || [];
checkSeq(order, "o", "order");
order.forEach(it => {
  const w = "order " + it.id; checkId(it.id, "o", w);
  const keys = Object.keys(it.parts || {}).sort().join("");
  if (keys !== "ABC") { err(w, "parts must be exactly A, B, C"); return; }
  ["A", "B", "C"].forEach(k => { if (!isStr(it.parts[k])) err(w, `part ${k} is empty`); });
  if (new Set(["A", "B", "C"].map(k => norm(it.parts[k]))).size !== 3) err(w, "two parts are the same text");
  if (!isStr(it.answer) || it.answer.length !== 3 || it.answer.split("").sort().join("") !== "ABC") { err(w, `answer "${it.answer}" must use A, B and C exactly once`); return; }
  const seq = it.answer.split("").map(k => it.parts[k]);
  if (!/[。？！?!]$/.test(seq[2])) err(w, "the last part of the answer must end the sentence (。？！)");
  if (/[。？！]$/.test(seq[0]) || /[。？！]$/.test(seq[1])) warn(w, "a non-final part ends with sentence punctuation");
  bilingual(it, w, "translation");
  if (it.clue !== undefined) bilingual(it.clue, w, "clue");
});
dupes(order, it => it.parts && it.answer ? norm(String(it.answer).split("").map(k => it.parts[k]).join("")) : "", "order", "paragraph");
dupes(order.flatMap(it => ["A", "B", "C"].map(k => ({ id: it.id + "." + k, t: it.parts && it.parts[k] }))), x => norm(x.t), "order", "part text");

// picture: { id, emoji, scene{vi,en}, word, samples[{zh,py,vi,en}] with word in every zh }
const picture = D.picture || [];
checkSeq(picture, "p", "picture");
picture.forEach(it => {
  const w = "picture " + it.id; checkId(it.id, "p", w);
  if (!isStr(it.word) || !HAN.test(it.word)) err(w, "word is missing");
  if (!isStr(it.emoji) || HAN.test(it.emoji) || /[A-Za-z]/.test(it.emoji)) err(w, "emoji is missing or contains text");
  bilingual(it.scene, w, "scene");
  if (!Array.isArray(it.samples) || !it.samples.length) { err(w, "needs at least one sample"); return; }
  it.samples.forEach((s, i) => {
    const ws = `${w} sample ${i + 1}`;
    ["zh", "py", "vi", "en"].forEach(k => { if (!isStr(s[k])) err(ws, `missing ${k}`); });
    if (isStr(s.zh) && isStr(it.word) && !s.zh.includes(it.word)) err(ws, `zh does not contain ${it.word}`);
    if (isStr(s.zh) && !/[。？！]$/.test(s.zh)) err(ws, "zh must end with 。？！");
    if (isStr(s.py)) {
      if (!PY_OK.test(s.py)) err(ws, `py has invalid characters: ${[...s.py].filter(c => !PY_OK.test(c)).join("")}`);
      if (/\d/.test(s.py)) err(ws, "py uses tone numbers");
      if (!/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(s.py)) warn(ws, "py should start with a capital letter");
    }
    if (isStr(s.vi) && !VI_MARK.test(s.vi)) warn(ws, "vi has no Vietnamese diacritics");
  });
  if (new Set(it.samples.map(s => norm(s.zh))).size !== it.samples.length) err(w, "two samples are the same");
});
dupes(picture, it => it.word, "picture", "target word");
dupes(picture.flatMap(it => (it.samples || []).map((s, i) => ({ id: it.id + "#" + (i + 1), t: s.zh }))), x => norm(x.t), "picture", "sample sentence");

// measure: { id, q (one gap), options[4 unique], answer (index 0-3), explain{vi,en} }
const measure = D.measure || [];
checkSeq(measure, "m", "measure");
measure.forEach(it => {
  const w = "measure " + it.id; checkId(it.id, "m", w);
  if (!isStr(it.q) || gaps(it.q) !== 1) err(w, "q needs exactly one ____");
  if (!Array.isArray(it.options) || it.options.length !== 4 || !it.options.every(isStr) || new Set(it.options).size !== 4) { err(w, "needs 4 unique options"); return; }
  if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer > 3) err(w, "answer must be an index 0-3 into options");
  bilingual(it.explain, w, "explain");
});
dupes(measure, it => norm(it.q), "measure", "question");

// ---------------------------------------------------------------- data/drills_extra.js (optional, data only)
const hasExtra = load("drills_extra.js");
const X = sandbox.window.CB_DRILLS_EXTRA || {};
let bankItems = 0;
if (hasExtra) {
  if (!sandbox.window.CB_DRILLS_EXTRA) err("drills_extra.js", "does not define window.CB_DRILLS_EXTRA");
  Object.keys(X).forEach(k => { if (!["bank", "wordorder"].includes(k)) err("CB_DRILLS_EXTRA", `unknown set "${k}" (add its rules to tools/validate_drills.js and data/DRILLS.md)`); });

  // bank: { id, bank[6 unique words], items[{ n, q (one gap), answer (index into bank), vi, en }] }; a bank word answers at most one item
  const bank = X.bank || [];
  checkSeq(bank, "bk", "bank");
  bank.forEach(g => {
    const w = "bank " + g.id; checkId(g.id, "bk", w);
    if (!Array.isArray(g.bank) || g.bank.length < 4 || !g.bank.every(isStr) || new Set(g.bank).size !== g.bank.length) { err(w, "bank must be 4 or more unique words"); return; }
    if (!Array.isArray(g.items) || !g.items.length) { err(w, "needs items"); return; }
    if (g.items.length >= g.bank.length) err(w, "the bank must have at least one word more than there are items");
    const used = new Set();
    g.items.forEach((it, i) => {
      const wi = `${w}:${it.n}`; bankItems++;
      if (it.n !== i + 1) err(wi, `n must be ${i + 1}`);
      checkId(g.id, "bk", wi, String(it.n));
      if (!isStr(it.q) || gaps(it.q) !== 1) err(wi, "q needs exactly one ____");
      if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= g.bank.length) { err(wi, "answer must be an index into bank"); return; }
      if (used.has(it.answer)) err(wi, `bank word ${g.bank[it.answer]} is the answer to two items`);
      used.add(it.answer);
      if (isStr(it.q)) g.bank.forEach(x => { if (it.q.includes(x)) err(wi, `the sentence already contains the bank word ${x}`); });
      bilingual(it, wi, "translation");
    });
  });
  dupes(bank.flatMap(g => (g.items || []).map(it => ({ id: g.id + ":" + it.n, t: it.q }))), x => norm(x.t), "bank", "question");
  dupes(bank.flatMap(g => (g.bank || []).map(x => ({ id: g.id + " " + x, t: x }))), x => x.t, "bank", "bank word");

  // wordorder: { id, tokens[3+], answer = tokens joined, alt?[other correct orders], vi, en, point{vi,en} }
  const wo = X.wordorder || [];
  checkSeq(wo, "wo", "wordorder");
  wo.forEach(it => {
    const w = "wordorder " + it.id; checkId(it.id, "wo", w);
    if (!Array.isArray(it.tokens) || it.tokens.length < 3 || !it.tokens.every(isStr)) { err(w, "tokens must be 3 or more strings"); return; }
    if (!isStr(it.answer) || !isPermutation(it.tokens, it.answer)) err(w, "answer must use every token exactly once");
    if (/[，。？！、\s]/.test(it.tokens.join("") + (it.answer || ""))) err(w, "tokens and answer must not contain punctuation or spaces");
    if (it.alt !== undefined) {
      if (!Array.isArray(it.alt) || !it.alt.length) err(w, "alt must be a non-empty array when present");
      else it.alt.forEach(a => {
        if (!isPermutation(it.tokens, a)) err(w, `alt "${a}" must use every token exactly once`);
        if (a === it.answer) err(w, "alt repeats the answer");
      });
      if (Array.isArray(it.alt) && new Set(it.alt).size !== it.alt.length) err(w, "alt has duplicates");
    }
    bilingual(it, w, "translation");
    bilingual(it.point, w, "point");
  });
  dupes(wo, it => norm(it.answer), "wordorder", "sentence");
}

// ---------------------------------------------------------------- report
console.log("C&B Chinese — drill validation");
console.log("==============================");
console.log(`confuse   : ${confuse.length}`);
console.log(`order     : ${order.length}`);
console.log(`picture   : ${picture.length} (${picture.reduce((s, p) => s + (p.samples || []).length, 0)} model sentences)`);
console.log(`measure   : ${measure.length}`);
if (hasExtra) {
  console.log(`extra bank: ${(X.bank || []).length} groups, ${bankItems} items`);
  console.log(`extra wordorder: ${(X.wordorder || []).length}`);
} else console.log("extra     : data/drills_extra.js not present");
console.log("");
if (warnings.length) { console.log(`Warnings (${warnings.length}):`); warnings.forEach(w => console.log("  ! " + w)); console.log(""); }
if (errors.length) { console.log(`Errors (${errors.length}):`); errors.forEach(e => console.log("  x " + e)); process.exit(1); }
console.log("OK: no errors.");
