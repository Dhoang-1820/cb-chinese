#!/usr/bin/env node
/* Audits HSK 2.0 level 1-4 coverage of the app's word data.
   Usage: node tools/audit_hsk4.js      (prints a report, writes data/hsk4x/audit.json)
   Reference list: data/hsk4x/hsk2-ref.json (snapshot of an MIT-licensed list, see data/hsk4x/README.md).
   "lessons" = data/day01.js..day90.js;  "decks" = HSK 4 Core (core*.js) + HSK 1-3 Foundation (found.js);
   "hsk4x" = gap packs in data/hsk4x/missing*.js (if present). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DATA = path.join(__dirname, "..", "data"), X = path.join(DATA, "hsk4x");
const sb = { window: {} }; vm.createContext(sb);
const run = f => vm.runInContext(fs.readFileSync(f, "utf8"), sb, { filename: f });
const files = fs.readdirSync(DATA);
files.filter(f => /^day\d+\.js$/.test(f)).sort().forEach(f => run(path.join(DATA, f)));
files.filter(f => /^(core\d+|found)\.js$/.test(f)).sort().forEach(f => run(path.join(DATA, f)));
fs.readdirSync(X).filter(f => /^missing\d+\.js$/.test(f)).sort().forEach(f => run(path.join(X, f)));

const lesson = new Map();            // hanzi -> {id, day, level}
(sb.window.CB_DAYS || []).forEach(d => (d.words || []).forEach(w => lesson.set(w.hanzi, { id: w.id, day: d.day, level: w.level })));
const deck = new Map();
(sb.window.CB_CORE || []).forEach(s => (s.words || []).forEach(w => deck.set(w.hanzi, { id: w.id, set: s.set })));
const gap = new Map();
(sb.window.CB_HSK4X || []).filter(p => p.kind === "missing").forEach(p => p.words.forEach(w => gap.set(w.hanzi, w.id)));

const ref = JSON.parse(fs.readFileSync(path.join(X, "hsk2-ref.json"), "utf8"));
const official = new Map();
for (const l of [1, 2, 3, 4]) ref.levels[l].forEach(h => { if (!official.has(h)) official.set(h, l); });

const out = { generated: "tools/audit_hsk4.js", reference: { source: ref.source, commit: ref.commit, licence: ref.licence, path: ref.path },
  lessonWords: lesson.size, deckWords: deck.size, gapPackWords: gap.size, levels: {}, lessonWordsNotOfficial: [] };
console.log(`Reference: ${ref.source} @ ${ref.commit.slice(0, 7)} (${ref.licence})`);
console.log(`Lesson words (day01-90): ${lesson.size};  deck words (core + foundation): ${deck.size};  hsk4x gap-pack words: ${gap.size}\n`);
console.log("Level  official  in lessons  +decks  +hsk4x  still missing");
let T = [0, 0, 0, 0, 0];
for (const l of [1, 2, 3, 4]) {
  const all = ref.levels[l].filter(h => official.get(h) === l);
  const inLessons = all.filter(h => lesson.has(h));
  const notLessons = all.filter(h => !lesson.has(h));
  const inDecksOnly = notLessons.filter(h => deck.has(h));
  const notApp = notLessons.filter(h => !deck.has(h));
  const inGap = notApp.filter(h => gap.has(h));
  const still = notApp.filter(h => !gap.has(h));
  out.levels["HSK" + l] = { official: all.length, coveredByLessons: inLessons.length, coveredByDecksOnly: inDecksOnly.length,
    coveredByGapPacks: inGap.length, stillMissing: still, missingFromLessons: notLessons, missingFromLessonsAndDecks: notApp, lessonCovered: inLessons };
  console.log(`HSK${l}   ${String(all.length).padStart(7)}  ${String(inLessons.length).padStart(10)}  ${String(inDecksOnly.length).padStart(6)}  ${String(inGap.length).padStart(6)}  ${String(still.length).padStart(13)}`);
  [all.length, inLessons.length, inDecksOnly.length, inGap.length, still.length].forEach((n, i) => T[i] += n);
}
console.log(`Total  ${String(T[0]).padStart(7)}  ${String(T[1]).padStart(10)}  ${String(T[2]).padStart(6)}  ${String(T[3]).padStart(6)}  ${String(T[4]).padStart(13)}\n`);
out.totals = { official: T[0], coveredByLessons: T[1], coveredByDecksOnly: T[2], coveredByGapPacks: T[3], stillMissing: T[4] };
for (const l of [1, 2, 3, 4]) {
  const L = out.levels["HSK" + l];
  console.log(`HSK${l} missing from lessons AND decks (${L.missingFromLessonsAndDecks.length}): ${L.missingFromLessonsAndDecks.join(" ") || "-"}`);
}
const extra = [...lesson.entries()].filter(([h]) => !official.has(h));
out.lessonWordsNotOfficial = extra.map(([h, v]) => ({ hanzi: h, id: v.id, day: v.day, level: v.level }));
const mis = extra.filter(([, v]) => v.level === "HSK4");
console.log(`\nLesson words not on the official HSK 1-4 list: ${extra.length} (tagged "Beyond HSK4": ${extra.length - mis.length}; tagged "HSK4": ${mis.length})`);
console.log(extra.map(([h]) => h).join(" "));
if (mis.length) console.log(`\nTagged HSK4 in lessons but not on the list: ${mis.map(([h]) => h).join(" ")}`);
const under = [...lesson.entries()].filter(([h, v]) => official.has(h) && v.level !== "HSK4");
out.lessonWordsOfficialButTaggedBeyond = under.map(([h, v]) => ({ hanzi: h, id: v.id, officialLevel: official.get(h) }));
if (under.length) console.log(`\nOn the official list but tagged "Beyond HSK4" in lessons: ${under.map(([h, v]) => h + "(HSK" + official.get(h) + ")").join(" ")}`);
const deckExtra = [...deck.keys()].filter(h => !official.has(h));
out.deckWordsNotOfficial = deckExtra;
console.log(`\nDeck words not on the official list: ${deckExtra.length}${deckExtra.length ? " -> " + deckExtra.join(" ") : ""}`);
fs.writeFileSync(path.join(X, "audit.json"), JSON.stringify(out, null, 1) + "\n");
console.log("\nWrote data/hsk4x/audit.json");
