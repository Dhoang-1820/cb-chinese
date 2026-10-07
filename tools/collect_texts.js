#!/usr/bin/env node
/* Collects every Chinese text the app can play, with the voice to use.
   Usage: node tools/collect_texts.js > audio_texts.json
   Output: [{ "v": "F" | "M", "t": "中文" }, ...]  (unique). Items of the optional packs carry "opt": true:
   tools/gen_audio.py does not count them when it decides whether too much audio is missing.

   Optional packs (decided by cost, counts in README.md "Audio"):
     recorded      HSK 5 headwords, HSK 5 grammar examples, HSK 5 picture-writing model sentences,
                   the 91 extra HSK 4 words with their phrase and example
     not recorded  HSK 5 example sentences (1,231 more clips), the extra HSK 4 "common phrases" and the
                   opposites' examples. The app hides the play button where there is no clip.
   Pass --all to include those as well (prints the same counts).
   Keep MALE_SPEAKERS in sync with js/audio.js. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const MALE_SPEAKERS = ["林浩", "陈明", "王总", "张经理"];
const ROOT = path.join(__dirname, "..");
const sb = { window: {} };
vm.createContext(sb);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, "data", f), "utf8"), sb);
load("manifest.js");
sb.window.CB_MANIFEST.forEach(load);
load("core-manifest.js");
sb.window.CB_CORE_FILES.forEach(load);
(sb.window.CB_EXTRA_FILES || []).forEach(load);
load("mock-manifest.js");
sb.window.CB_MOCK_FILES.forEach(load);
load("track-manifest.js");
sb.window.CB_TRACK_FILES.forEach(load);

const out = new Map();
const add = (t, v = "F") => { if (t && /[㐀-鿿]/.test(t)) out.set(v + "|" + t, { v, t }); };

for (const d of sb.window.CB_DAYS) {
  for (const w of d.words || []) {
    add(w.hanzi);
    (w.collocations || []).forEach(c => add(c.zh));
    if (w.example) add(w.example.zh);
  }
  if (d.reading) {
    for (const l of d.reading.lines) add(l.zh, MALE_SPEAKERS.includes(l.speaker) ? "M" : "F");
    (d.reading.notes || []).forEach(n => add(n.zh));
  }
  if (d.grammar) d.grammar.examples.forEach(e => add(e.zh));
  const ex = d.exercises || {};
  (ex.fill || []).forEach(f => add(f.zh.replace("___", f.answer)));
  (ex.translate || []).forEach(t => add(t.zh));
}
for (const set of sb.window.CB_CORE || []) for (const w of set.words) { add(w.hanzi); if (w.example) add(w.example.zh); }

for (const g of sb.window.CB_GRAMMAR || []) g.examples.forEach(e => add(e.zh));
for (const it of (sb.window.CB_DRILLS || {}).picture || []) it.samples.forEach(x => add(x.zh));

for (const m of sb.window.CB_MOCK || []) {
  for (const it of m.listening.p1) add(it.audio.text, it.audio.voice);
  for (const it of m.listening.p2) it.dialogue.forEach(l => add(l.text, l.voice));
  for (const it of m.listening.p3) { if (it.dialogue) it.dialogue.forEach(l => add(l.text, l.voice)); else add(it.audio.text, it.audio.voice); }
}

/* 6-month track: every Chinese line that has a play button */
const trackT = t => t && t.zh && add(t.zh);
for (const wk of sb.window.CB_TRACK || []) for (const ss of wk.sessions || []) {
  (ss.text || []).forEach(trackT); (ss.phrases || []).forEach(trackT); (ss.sample || []).forEach(trackT); trackT(ss.opener);
  (ss.items || []).forEach(i => i.zh && add(i.zh.replace("___", i.answer)));
  (ss.turns || []).forEach(u => { trackT(u.other); (u.choices || []).forEach(c => trackT(c.t)); });
  (ss.cards || []).forEach(c => { c.cn && c.cn.zh && add(c.cn.zh); trackT(c.ex); });
  (ss.words || []).forEach(w => { add(w.hanzi); trackT(w.ex); }); (ss.lines || []).forEach(trackT);
}

add("你好，这是薪酬福利中文。");

/* ---- optional packs: HSK 5 (data/hsk5) and the extra HSK 4 word resources (data/hsk4x) ---- */
const ALL = process.argv.includes("--all");
const base = out.size, counts = {};
const opt = (name, on, list) => {
  let n = 0;
  for (const t of list) { const k = "F|" + t; if (t && /[㐀-鿿]/.test(t) && !out.has(k)) { n++; if (on) out.set(k, { v: "F", t, opt: true }); } }
  counts[name] = (on ? "+" : "skipped ") + n;
};
fs.readdirSync(path.join(ROOT, "data", "hsk5")).filter(f => /^(words\d+|grammar|drills)\.js$/.test(f)).sort().forEach(f => load("hsk5/" + f));
load("hsk4x/manifest.js");
(sb.window.CB_HSK4X_FILES || []).forEach(f => load("hsk4x/" + f));
const h5 = (sb.window.CB_HSK5 || []).flatMap(p => p.words), x4 = sb.window.CB_HSK4X || [];
const kind = k => x4.filter(p => p.kind === k);
opt("HSK 5 headwords", true, h5.map(w => w.hanzi));
opt("HSK 5 grammar examples", true, (sb.window.CB_HSK5_GRAMMAR || []).flatMap(g => g.examples.map(e => e.zh)));
opt("HSK 5 picture model sentences", true, ((sb.window.CB_HSK5_DRILLS || {}).picture || []).flatMap(it => it.samples.map(x => x.zh)));
opt("extra HSK 4 words (word, phrase, example)", true, kind("missing").flatMap(p => p.words).flatMap(w => [w.hanzi].concat((w.collocations || []).map(c => c.zh), w.example ? [w.example.zh] : [])));
opt("HSK 5 example sentences", ALL, h5.map(w => w.example && w.example.zh));
opt("extra HSK 4 common phrases", ALL, kind("collocations").flatMap(p => p.items).flatMap(i => i.phrases.map(x => x.zh)));
opt("opposites examples", ALL, kind("opposites").flatMap(p => p.items).flatMap(i => [i.a.example.zh, i.b.example.zh]));

process.stdout.write(JSON.stringify([...out.values()]));
process.stderr.write(`collected ${out.size} texts (${base} for the HSK 4 course, ${out.size - base} for the optional packs)\n` +
  Object.keys(counts).map(k => `  ${k}: ${counts[k]}`).join("\n") + "\n");
