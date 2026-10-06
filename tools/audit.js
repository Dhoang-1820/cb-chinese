#!/usr/bin/env node
/* Content audit: finds consistency problems the validator does not check.
   Usage: node tools/audit.js [--json]
   Checks (all advisory, exit 0):
   1. same hanzi in C&B lessons and HSK decks with different pinyin
   2. same hanzi with meanings that share no word (possible mismatch)
   3. example sentence that does not contain its own word
   5. Vietnamese or English that is empty, identical to the other, or still has placeholder text
   6. glossary terms (C&B vocabulary) translated in more than one way in the lessons */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DATA = path.join(__dirname, "..", "data");
const sb = { window: {} }; vm.createContext(sb);
const run = f => { const p = path.join(DATA, f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, "utf8"), sb, { filename: f }); };
run("manifest.js"); (sb.window.CB_MANIFEST || []).forEach(run);
run("core-manifest.js"); (sb.window.CB_CORE_FILES || []).forEach(run);
const days = sb.window.CB_DAYS || [], core = sb.window.CB_CORE || [];

const words = [];
days.forEach(d => (d.words || []).forEach(w => words.push({ w, src: "Day " + d.day })));
core.forEach(s => (s.words || []).forEach(w => words.push({ w, src: "Set " + s.set })));

const out = { pinyin: [], meaning: [], example: [], text: [], glossary: [] };
const by = {};
words.forEach(x => (by[x.w.hanzi] = by[x.w.hanzi] || []).push(x));
const norm = s => String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-zà-ỹ0-9 ]/gi, " ").split(/\s+/).filter(t => t.length > 2);

Object.keys(by).forEach(h => {
  const xs = by[h]; if (xs.length < 2) return;
  const py = new Set(xs.map(x => x.w.pinyin.replace(/\s+/g, "").toLowerCase()));
  if (py.size > 1) out.pinyin.push(`${h}: ${xs.map(x => x.src + " " + x.w.pinyin).join(" | ")}`);
  const sets = xs.map(x => new Set(norm(x.w.en)));
  const shares = sets.slice(1).every(s => [...s].some(t => sets[0].has(t)));
  if (!shares) out.meaning.push(`${h}: ${xs.map(x => x.src + " “" + x.w.en + "”").join(" | ")}`);
});

const _unused = s => (String(s).match(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+/g) || []).length;
const hanCount = s => (String(s).match(/[㐀-鿿]/g) || []).length;
words.forEach(({ w, src }) => {
  const ex = w.example; 
  if (ex && ex.zh && !ex.zh.includes(w.hanzi)) {
    // allow split verbs (e.g. 办手续) and measure forms: only flag when no character of the word appears at all
    if (![...w.hanzi].some(c => ex.zh.includes(c))) out.example.push(`${src} ${w.hanzi}: example “${ex.zh}” does not use the word`);
  }
  ["vi", "en"].forEach(k => { if (!w[k] || /todo|tbd|lorem|xxx/i.test(w[k])) out.text.push(`${src} ${w.hanzi}: bad ${k}`); });
  if (w.vi && w.en && w.vi.trim().toLowerCase() === w.en.trim().toLowerCase()) out.text.push(`${src} ${w.hanzi}: vi and en identical (${w.vi})`);
});

/* glossary: a word taught on a day should be rendered the way its entry says in that day's dialogue translation (Vietnamese or English) */
const alts = str => String(str || "").toLowerCase().split(/[,;\/]/).map(x => x.replace(/\(.*?\)/g, "").replace(/^to /, "").trim()).filter(x => x.length > 2);
days.forEach(d => {
  const lines = (d.reading && d.reading.lines) || [];
  (d.words || []).forEach(w => {
    const seen = lines.filter(l => l.zh && l.zh.includes(w.hanzi)); if (!seen.length) return;
    const ok = seen.some(l => alts(w.vi).some(a => (l.vi || "").toLowerCase().includes(a)) || alts(w.en).some(a => (l.en || "").toLowerCase().includes(a.split(" ")[0])));
    if (!ok) out.glossary.push(`Day ${d.day} ${w.hanzi} (${w.vi} / ${w.en}) — dialogue translates it differently: “${seen[0].vi.slice(0, 60)}…”`);
  });
});

if (process.argv.includes("--json")) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
const titles = { pinyin: "Same hanzi, different pinyin", meaning: "Same hanzi, meanings share no word", example: "Example does not use its word", text: "Missing or placeholder text", glossary: "Glossary wording differs in dialogue" };
console.log(`Audited ${words.length} word entries, ${days.length} days, ${core.length} core sets.\n`);
Object.keys(out).forEach(k => { console.log(`## ${titles[k]}: ${out[k].length}`); out[k].slice(0, 25).forEach(x => console.log("  - " + x)); if (out[k].length > 25) console.log(`  … ${out[k].length - 25} more`); console.log(); });
