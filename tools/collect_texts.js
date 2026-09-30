#!/usr/bin/env node
/* Collects every Chinese text the app can play, with the voice to use.
   Usage: node tools/collect_texts.js > audio_texts.json
   Output: [{ "v": "F" | "M", "t": "中文" }, ...]  (unique)
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

add("你好，这是薪酬福利中文。");
process.stdout.write(JSON.stringify([...out.values()]));
process.stderr.write(`collected ${out.size} texts\n`);
