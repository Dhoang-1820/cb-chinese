#!/usr/bin/env node
/* Checks data/hsk3 (the planned HSK 3.0 track): manifest shape, format table, and every word / char / grammar row
   listed in CB_HSK3_FILES. Passes while the lists are still empty. Usage: node tools/validate_hsk3.js */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DIR = path.join(__dirname, "..", "data", "hsk3");
const sb = { window: {} }; vm.createContext(sb);
const run = f => vm.runInContext(fs.readFileSync(path.join(DIR, f), "utf8"), sb, { filename: f });
const errs = [], err = m => errs.push(m);
run("manifest.js");
const W = sb.window;
if (!Array.isArray(W.CB_HSK3_FILES)) err("CB_HSK3_FILES must be an array");
(W.CB_HSK3_FILES || []).forEach(f => { if (!fs.existsSync(path.join(DIR, f))) err("listed file missing: " + f); else run(f); });
const L = [1, 2, 3, 4, 5, 6];
(W.CB_HSK3_FORMAT || []).forEach((f, i) => {
  if (f.level !== L[i]) err("format: levels must be 1..6 in order");
  if (!(f.written && f.written.minutes > 0 && f.written.src && f.written.src.url)) err("format L" + f.level + ": written minutes and source");
  if (f.level >= 3 && !(f.speaking && f.speaking.minutes > 0)) err("format L" + f.level + ": speaking test expected");
});
if ((W.CB_HSK3_FORMAT || []).length !== 6) err("format: 6 levels expected");
const ids = new Set(), seen = new Set();
(W.CB_HSK3_WORDS || []).forEach(w => {
  const at = "word " + (w.id || "?");
  if (!/^h3-[1-6]-\d{4}$/.test(w.id || "")) err(at + ": id must be h3-<level>-<nnnn>");
  if (ids.has(w.id)) err(at + ": duplicate id"); ids.add(w.id);
  if (!L.includes(w.level) || String(w.level) !== w.id.split("-")[1]) err(at + ": level must match the id");
  ["hanzi", "pinyin", "vi", "en"].forEach(k => { if (!w[k] || typeof w[k] !== "string") err(at + ": missing " + k); });
  if (!/[㐀-鿿]/.test(w.hanzi || "")) err(at + ": hanzi has no Chinese character");
  if (!w.src || !w.src.doc) err(at + ": src.doc required (where the row comes from)");
  if (typeof w.checked !== "boolean") err(at + ": checked must be true or false");
  const k = w.hanzi + "|" + w.pinyin; if (seen.has(k)) err(at + ": same hanzi + pinyin listed twice"); seen.add(k);
});
(W.CB_HSK3_CHARS || []).forEach(c => { if (!c.char || [...c.char].length !== 1 || !L.includes(c.level) || !c.src) err("char " + c.char + ": char, level and src required"); });
(W.CB_HSK3_GRAMMAR || []).forEach(g => { if (!/^h3g-[1-6]-\d{2}$/.test(g.id || "") || !g.code || !g.title || !g.pattern || !Array.isArray(g.examples) || !g.src || typeof g.checked !== "boolean") err("grammar " + g.id + ": id, code, title, pattern, examples, src, checked required"); });
if (errs.length) { errs.slice(0, 30).forEach(e => console.log("  " + e)); console.log("FAIL  tools/validate_hsk3.js (" + errs.length + ")"); process.exit(1); }
console.log("PASS  tools/validate_hsk3.js (" + (W.CB_HSK3_WORDS || []).length + " words, " + (W.CB_HSK3_FILES || []).length + " files; lists not imported yet)");
