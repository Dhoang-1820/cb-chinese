#!/usr/bin/env node
/* Validates data/hsk5/drills.js (window.CB_HSK5_DRILLS).  Usage:  node tools/validate_hsk5_drills.js
   Exit code 1 if any ERROR is found (warnings don't fail).
   Checks, per set: fields present, ids valid/unique (also against the HSK 4 drills), answer keys consistent
   (answer among the options, ordering answer uses A, B, C exactly once and rebuilds the full sentence),
   no duplicate questions, simplified characters only, pinyin consistent with vendor/dict/cedict.v1.js. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data", "hsk5", "drills.js");
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function load(file, sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: path.basename(file) });
  return sandbox.window;
}
if (!fs.existsSync(FILE)) { console.error("✗ data/hsk5/drills.js not found"); process.exit(1); }
let D;
try { D = load(FILE, { window: {} }).CB_HSK5_DRILLS; } catch (e) { console.error("✗ JavaScript error in data/hsk5/drills.js: " + e.message); process.exit(1); }
if (!D || typeof D !== "object") { console.error("✗ window.CB_HSK5_DRILLS is missing"); process.exit(1); }

/* ---------- helpers ---------- */
const HAN = /[㐀-鿿]/g;
const hanCount = s => (String(s || "").match(HAN) || []).length;
const isStr = v => typeof v === "string" && v.trim().length > 0;
const REF = /^(drill|mock|gq|word|grammar):[A-Za-z0-9_.-]{1,24}(:\d{1,3})?$/;   // the app's problem-report reference
const ID_PREFIX = { confuse: "h5c", order: "h5o", picture: "h5p", measure: "h5m", gapfill: "h5g", essay: "h5e" };
const VI_MARK = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
// a few hundred common traditional-only characters; any hit means the text is not simplified Chinese
const TRAD = /[這個們來時會對說國過還發經樣學現點實當動種業麼開關長問題應機與產無電體為將進員從兩間門見聽氣愛資認讓設計買賣報請選擇變單雙優質價歲結構網絡視頻觀歡況際達術務險護標準備調適響續總驗證條專輕鬆難極廣場隊圖書館歷記錄訓練語漢參觀節約財職責繫領導層組織幾歲線約紙給絕編緊縣習聯腦臉興舊藥處號衛見親覺記許訴該認誤調謝識讀負貴費趕輛輸辦農這邊還鄰醫錢錯鐘長門開間陽陰隨雖離難電頭願類風飛飯館馬驚體鬧魚鳥麗黃點]/;

function mustStr(o, keys, where) { keys.forEach(k => { if (!o || !isStr(o[k])) err(where, `missing field "${k}"`); }); }
function mustBi(o, where) {            // { vi, en }
  mustStr(o, ["vi", "en"], where);
  if (o && isStr(o.vi) && !VI_MARK.test(o.vi)) warn(where, "vi text has no Vietnamese diacritics: " + o.vi);
  if (o && isStr(o.en) && VI_MARK.test(o.en.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, ""))) warn(where, "en text looks Vietnamese: " + o.en);
}
function zhOk(s, where) { const m = TRAD.exec(String(s || "")); if (m) err(where, `traditional character "${m[0]}" in: ${s}`); if (/[A-Za-z]/.test(String(s || ""))) warn(where, "Latin letters in Chinese text: " + s); }

/* ids: valid, unique inside this file and against the HSK 4 drills */
const seenId = {};
try {
  const d4 = load(path.join(ROOT, "data", "drills.js"), { window: {} }).CB_DRILLS || {};
  Object.keys(d4).forEach(k => (Array.isArray(d4[k]) ? d4[k] : []).forEach(it => { seenId[it.id] = "HSK 4 " + k; }));
} catch (e) { warn("ids", "could not load data/drills.js to check for id collisions: " + e.message); }
function checkId(set, it, where) {
  if (!isStr(it.id)) { err(where, "missing id"); return; }
  if (!REF.test("drill:" + it.id)) err(where, `id "${it.id}" does not fit the report reference pattern`);
  if (!new RegExp("^" + ID_PREFIX[set] + "\\d{3}$").test(it.id)) err(where, `id "${it.id}" should look like ${ID_PREFIX[set]}001`);
  if (seenId[it.id]) err(where, `duplicate id ${it.id} (also in ${seenId[it.id]})`);
  seenId[it.id] = "HSK 5 " + set;
}
function noDup(seen, key, where, what) { if (seen[key]) err(where, `duplicate ${what} (same as ${seen[key]})`); else seen[key] = where; }

/* ---------- pinyin check against the bundled CC-CEDICT ---------- */
const TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
function mark(syl) {                  // "lu:e4"/"lve4"/"hao3" → tone-marked
  let m = /^([a-zü:v]+)([1-5])$/.exec(syl); if (!m) return null;
  let s = m[1].replace(/u:|v/g, "ü"), t = +m[2];
  if (t === 5) return s;
  const at = s.indexOf("a") >= 0 ? s.indexOf("a") : s.indexOf("e") >= 0 ? s.indexOf("e") : s.indexOf("ou") >= 0 ? s.indexOf("o") : (() => { for (let i = s.length - 1; i >= 0; i--) if ("iouü".includes(s[i])) return i; return -1; })();
  if (at < 0) return s;
  return s.slice(0, at) + TONES[s[at]][t - 1] + s.slice(at + 1);
}
const plain = s => s.replace(/[āáǎà]/g, "a").replace(/[ēéěè]/g, "e").replace(/[īíǐì]/g, "i").replace(/[ōóǒò]/g, "o").replace(/[ūúǔù]/g, "u").replace(/[ǖǘǚǜ]/g, "ü");
let READ = null;
(function loadDict() {
  const f = path.join(ROOT, "vendor", "dict", "cedict.v1.js");
  if (!fs.existsSync(f)) { warn("pinyin", "vendor/dict/cedict.v1.js not found, pinyin not checked against the dictionary"); return; }
  const raw = load(f, { window: {} }).CB_DICT_RAW || "";
  READ = new Map();
  raw.split("\n").forEach(line => {
    const p = line.split("\t"), w = p[0];
    for (let k = 1; k + 1 < p.length; k += 2) {
      const syl = p[k].split(" ");
      if (syl.length !== w.length) continue;
      for (let i = 0; i < w.length; i++) { const m = mark(syl[i]); if (!m) continue; if (!READ.has(w[i])) READ.set(w[i], new Set()); READ.get(w[i]).add(m); }
    }
  });
  // tone sandhi and neutral tones the app writes out (same style as data/drills.js: yí gè, bú huì, de, le)
  const add = (ch, list) => { if (!READ.has(ch)) READ.set(ch, new Set()); list.forEach(x => READ.get(ch).add(x)); };
  add("一", ["yī", "yí", "yì", "yi"]); add("不", ["bù", "bú", "bu"]); add("儿", ["ér", "r"]);
  add("个", ["gè", "ge"]); add("着", ["zhe", "zháo", "zhuó"]); add("了", ["le", "liǎo"]); add("过", ["guò", "guo"]); add("得", ["de", "dé", "děi"]); add("地", ["de", "dì"]); add("的", ["de", "dí", "dì"]);
  add("来", ["lái", "lai"]); add("去", ["qù", "qu"]); add("上", ["shàng", "shang"]); add("下", ["xià", "xia"]); add("里", ["lǐ", "li"]); add("吧", ["ba"]); add("吗", ["ma"]); add("呢", ["ne"]); add("们", ["men"]); add("子", ["zǐ", "zi"]); add("么", ["me"]);
})();
function pinyinMatches(zh, py) {      // every character must be covered, in order, by one of its dictionary readings
  const chars = String(zh).match(HAN) || [], s = String(py).toLowerCase().replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, "");
  const memo = new Map();
  function go(ci, pi) {
    if (ci === chars.length) return pi === s.length ? -1 : ci;       // -1 = full match
    const key = ci * 4096 + pi; if (memo.has(key)) return memo.get(key);
    let best = ci;
    const cand = new Set(READ.get(chars[ci]) || []);
    if (ci > 0 && chars[ci] === chars[ci - 1]) cand.forEach(r => cand.add(plain(r)));   // 爸爸 bàba, 看看 kànkan
    for (const r of cand) {
      if (s.startsWith(r, pi)) { const x = go(ci + 1, pi + r.length); if (x === -1) { memo.set(key, -1); return -1; } if (x > best) best = x; }
    }
    memo.set(key, best); return best;
  }
  const res = go(0, 0);
  return res === -1 ? null : chars[Math.min(res, chars.length - 1)];
}
const PY_OK = /^[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈŌÓǑÒ\s,.?!;:'’“”"…\-—–·()%/&+]+$/;   // same as tools/validate.js
function checkPy(zh, py, where) {
  if (!isStr(py)) return;
  if (!PY_OK.test(py)) err(where, "pinyin has unexpected characters: " + py);
  if (/[0-9]/.test(py)) err(where, "use tone marks, not tone numbers: " + py);
  if (!/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(py)) err(where, "pinyin should start with a capital letter: " + py);
  if (!/[.?!]$/.test(py)) err(where, "pinyin should end with . ? or !: " + py);
  if (/[，。？！；：、]/.test(py)) err(where, "pinyin has Chinese punctuation: " + py);
  if (READ) { const bad = pinyinMatches(zh, py); if (bad) err(where, `pinyin does not match the characters near "${bad}": ${zh} / ${py}`); }
}

/* ---------- top level ---------- */
if (D.checked !== false) err("top level", "checked must be false until a human has reviewed the content");
if (D.level !== "HSK5") err("top level", 'level must be "HSK5"');
const MIN = { confuse: 80, order: 100, picture: 50, measure: 40 };
const OPTIONAL_MIN = { gapfill: 40, essay: 40 };
Object.keys(MIN).forEach(k => { if (!Array.isArray(D[k])) err(k, "set is missing"); else if (D[k].length < MIN[k]) err(k, `has ${D[k].length} items, needs at least ${MIN[k]}`); });
Object.keys(OPTIONAL_MIN).forEach(k => { if (D[k] != null && (!Array.isArray(D[k]) || D[k].length < OPTIONAL_MIN[k])) err(k, `optional set needs at least ${OPTIONAL_MIN[k]} items`); });
Object.keys(D).forEach(k => { if (!["level", "checked"].includes(k) && !(k in ID_PREFIX)) warn("top level", `unknown key "${k}"`); });

/* ---------- 1. confuse ---------- */
const seenQ = {}, answerUse = {};
(D.confuse || []).forEach((it, n) => {
  const w = "confuse " + (it.id || "#" + (n + 1)); checkId("confuse", it, w);
  mustStr(it, ["q", "answer"], w); mustBi(it.explain, w + " explain"); zhOk(it.q, w);
  if (!Array.isArray(it.words) || it.words.length < 2 || it.words.length > 4) { err(w, "words must list 2 to 4 options"); return; }
  if (new Set(it.words).size !== it.words.length) err(w, "duplicate options in words");
  it.words.forEach(x => { if (!isStr(x) || !/^[㐀-鿿]+$/.test(x)) err(w, `option "${x}" must be Chinese characters only`); });
  if (!it.words.includes(it.answer)) err(w, `answer "${it.answer}" is not one of the options`);
  if (String(it.q || "").split("____").length !== 2) err(w, "q needs exactly one ____");
  if (/_/.test(String(it.q || "").replace("____", ""))) err(w, "stray underscore in q");
  it.words.forEach(x => { if (String(it.q || "").includes(x)) err(w, `option "${x}" already appears in the question`); });
  if (!/[。？！]$/.test(it.q || "")) err(w, "q should end with 。？or ！");
  if (hanCount(it.q) < 8) err(w, "q is too short to give context");
  noDup(seenQ, "c|" + it.q, w, "question");
  if (it.explain && isStr(it.explain.vi) && isStr(it.explain.en)) ["vi", "en"].forEach(l => { if (!it.explain[l].includes(it.answer)) warn(w, `${l} explanation does not mention the answer ${it.answer}`); });
  answerUse[it.answer] = (answerUse[it.answer] || 0) + 1;
});

/* ---------- 2. order ---------- */
const PERMS = ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"], permUse = {};
(D.order || []).forEach((it, n) => {
  const w = "order " + (it.id || "#" + (n + 1)); checkId("order", it, w);
  mustStr(it, ["answer", "vi", "en", "zh"], w); mustBi(it, w); mustBi(it.clue, w + " clue");
  const P = it.parts || {};
  if (Object.keys(P).sort().join("") !== "ABC") { err(w, "parts must be exactly A, B, C"); return; }
  if (!PERMS.includes(it.answer)) { err(w, "answer must use A, B and C exactly once"); return; }
  ["A", "B", "C"].forEach(k => { if (!isStr(P[k])) err(w, `part ${k} is empty`); else { zhOk(P[k], w); if (/[，。？！、；：\s]/.test(P[k])) err(w, `part ${k} must not contain punctuation or spaces (it would give the order away)`); } });
  if (new Set([P.A, P.B, P.C]).size !== 3) err(w, "two parts are identical, so more than one order would be correct");
  const joined = it.answer.split("").map(k => P[k]).join("");
  const bare = String(it.zh || "").replace(/[，。？！]/g, "");
  if (joined !== bare) err(w, `parts in answer order ("${joined}") do not rebuild zh ("${it.zh}")`);
  if (!/[。？！]$/.test(it.zh || "")) err(w, "zh should end with 。？or ！");
  if (!Array.isArray(it.chunks) || it.chunks.length < 4 || it.chunks.length > 7) err(w, "chunks must have 4 to 7 pieces");
  else {
    if (it.chunks.join("") !== joined) err(w, "chunks do not rebuild the sentence");
    if (new Set(it.chunks).size !== it.chunks.length) err(w, "duplicate chunk, so more than one order would be correct");
    // each of the three parts must be a run of whole chunks
    let pos = 0; const cuts = new Set([0]); it.chunks.forEach(c => { pos += c.length; cuts.add(pos); });
    const a = P[it.answer[0]].length, b = a + P[it.answer[1]].length;
    if (!cuts.has(a) || !cuts.has(b)) err(w, "the A/B/C cuts do not fall on chunk boundaries");
  }
  if (hanCount(joined) < 9 || hanCount(joined) > 30) warn(w, `sentence has ${hanCount(joined)} characters (expected 9 to 30)`);
  noDup(seenQ, "o|" + joined, w, "sentence");
  permUse[it.answer] = (permUse[it.answer] || 0) + 1;
});
PERMS.forEach(p => { if ((D.order || []).length >= 60 && !(permUse[p] > 0)) warn("order", `no item has the answer ${p}`); });
if ((D.order || []).length && Math.max(...PERMS.map(p => permUse[p] || 0)) > (D.order.length / 6) * 1.6) warn("order", "answer keys are unevenly spread: " + JSON.stringify(permUse));

/* ---------- 3. picture ---------- */
const seenWord = {};
(D.picture || []).forEach((it, n) => {
  const w = "picture " + (it.id || "#" + (n + 1)); checkId("picture", it, w);
  mustStr(it, ["emoji", "word"], w); mustBi(it.scene, w + " scene"); zhOk(it.word, w);
  if (isStr(it.word) && !/^[㐀-鿿]{1,4}$/.test(it.word)) err(w, "word must be 1 to 4 Chinese characters");
  if (isStr(it.emoji) && /[A-Za-z0-9㐀-鿿]/.test(it.emoji)) err(w, "emoji field should hold emoji only");
  noDup(seenWord, it.word, w, "target word");
  if (!Array.isArray(it.samples) || it.samples.length < 2) { err(w, "needs at least 2 sample sentences"); return; }
  it.samples.forEach((x, k) => {
    const ws = `${w} sample ${k + 1}`;
    mustStr(x, ["zh", "py", "vi", "en"], ws); mustBi(x, ws); zhOk(x.zh, ws);
    if (!String(x.zh || "").includes(it.word)) err(ws, `sample does not contain ${it.word}`);
    if (hanCount(x.zh) < 7) err(ws, "sample is shorter than the 7 characters the game asks for");
    if (!/[。！？]$/.test(x.zh || "")) err(ws, "sample should end with 。！or ？");
    checkPy(x.zh, x.py, ws);
    noDup(seenQ, "p|" + x.zh, ws, "sample sentence");
  });
});

/* ---------- 4. measure ---------- */
const idxUse = [0, 0, 0, 0];
(D.measure || []).forEach((it, n) => {
  const w = "measure " + (it.id || "#" + (n + 1)); checkId("measure", it, w);
  mustStr(it, ["q"], w); mustBi(it.explain, w + " explain"); zhOk(it.q, w);
  if (String(it.q || "").split("____").length !== 2) err(w, "q needs exactly one ____");
  if (!Array.isArray(it.options) || it.options.length !== 4 || new Set(it.options).size !== 4) { err(w, "needs 4 unique options"); return; }
  it.options.forEach(o => { if (!isStr(o) || !/^[㐀-鿿]{1,2}$/.test(o)) err(w, `option "${o}" must be 1 or 2 Chinese characters`); });
  if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer > 3) { err(w, "answer index out of range"); return; }
  idxUse[it.answer]++;
  const ans = it.options[it.answer];
  if (it.explain && isStr(it.explain.vi) && isStr(it.explain.en)) ["vi", "en"].forEach(l => { if (!it.explain[l].includes(ans)) err(w, `${l} explanation does not mention the keyed answer ${ans} (answer index may be wrong)`); });
  noDup(seenQ, "m|" + it.q, w, "question");
});
if ((D.measure || []).length >= 20 && Math.max(...idxUse) > D.measure.length * 0.4) warn("measure", "correct option position is unevenly spread: " + idxUse.join("/"));

/* ---------- 5. optional sets: gapfill, essay ---------- */
(D.gapfill || []).forEach((it, n) => {
  const w = "gapfill " + (it.id || "#" + (n + 1)); checkId("gapfill", it, w);
  mustStr(it, ["text", "vi", "en"], w); mustBi(it, w); zhOk(it.text, w);
  const marks = (String(it.text || "").match(/\[(\d)\]/g) || []);
  if (!Array.isArray(it.gaps) || it.gaps.length < 3 || it.gaps.length > 4) { err(w, "needs 3 or 4 gaps"); return; }
  if (marks.join("") !== it.gaps.map((g, k) => "[" + (k + 1) + "]").join("")) err(w, "text must contain the markers [1], [2], … once each, in order, one per gap");
  let filled = String(it.text || "");
  it.gaps.forEach((g, k) => {
    const wg = `${w} gap ${k + 1}`;
    mustBi(g.explain, wg + " explain");
    if (!Array.isArray(g.options) || g.options.length !== 4 || new Set(g.options).size !== 4) { err(wg, "needs 4 unique options"); return; }
    g.options.forEach(o => { if (!isStr(o) || !/^[㐀-鿿]+$/.test(o)) err(wg, `option "${o}" must be Chinese characters only`); zhOk(o, wg); });
    if (!Number.isInteger(g.answer) || g.answer < 0 || g.answer > 3) { err(wg, "answer index out of range"); return; }
    const ans = g.options[g.answer];
    if (g.explain && isStr(g.explain.vi) && isStr(g.explain.en)) ["vi", "en"].forEach(l => { if (!g.explain[l].includes(ans)) err(wg, `${l} explanation does not mention the keyed answer ${ans} (answer index may be wrong)`); });
    g.options.forEach(o => { if (String(it.text || "").includes(o)) warn(wg, `option "${o}" also appears in the passage`); });
    filled = filled.replace("[" + (k + 1) + "]", ans);
  });
  const len = hanCount(filled);
  if (len < 60 || len > 100) err(w, `filled passage has ${len} characters (must be 60 to 100)`);
  if (!/[。！？]$/.test(filled)) err(w, "passage should end with 。！or ？");
  noDup(seenQ, "g|" + it.text, w, "passage");
});
(D.essay || []).forEach((it, n) => {
  const w = "essay " + (it.id || "#" + (n + 1)); checkId("essay", it, w);
  mustStr(it, ["model", "vi", "en"], w); mustBi(it, w); mustBi(it.topic, w + " topic"); zhOk(it.model, w);
  if (!Array.isArray(it.words) || it.words.length !== 5 || new Set(it.words).size !== 5) { err(w, "needs exactly 5 different words"); return; }
  it.words.forEach(x => { if (!isStr(x) || !/^[㐀-鿿]+$/.test(x)) err(w, `word "${x}" must be Chinese characters only`); else if (!String(it.model || "").includes(x)) err(w, `model answer does not use the word ${x}`); });
  const len = hanCount(it.model);
  if (len < 70 || len > 100) err(w, `model answer has ${len} characters (must be 70 to 100; the exam asks for about 80)`);
  if (!/[。！？]$/.test(it.model || "")) err(w, "model should end with 。！or ？");
  noDup(seenQ, "e|" + it.words.slice().sort().join(""), w, "word set");
  noDup(seenQ, "em|" + it.model, w, "model answer");
});

/* ---------- report ---------- */
const sets = Object.keys(ID_PREFIX).filter(k => Array.isArray(D[k]));
console.log("C&B Chinese — HSK 5 drill validation");
console.log("====================================");
console.log("Global            : window.CB_HSK5_DRILLS (level " + D.level + ", checked " + D.checked + ")");
console.log("Items             : " + sets.map(k => k + " " + D[k].length).join(" · "));
console.log("Order answer keys : " + PERMS.map(p => p + " " + (permUse[p] || 0)).join(" · "));
console.log("Measure positions : " + idxUse.join(" / "));
console.log("Pinyin dictionary : " + (READ ? "checked against vendor/dict/cedict.v1.js" : "not available"));
console.log("");
if (warnings.length) { console.log(`Warnings (${warnings.length}):`); warnings.forEach(x => console.log("  ⚠ " + x)); console.log(""); }
if (errors.length) { console.log(`Errors (${errors.length}):`); errors.forEach(x => console.log("  ✗ " + x)); process.exit(1); }
console.log("✓ No errors.");
