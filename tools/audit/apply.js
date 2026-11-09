#!/usr/bin/env node
/* Content audit, step 4: applies agreed text fixes to the data files.
   Usage: node tools/audit/apply.js FIXES.json [--dry]
   FIXES.json: [{ "id": "...", "file": "data/...", "current": "exact text now in the file", "fix": "replacement" }]
   The replacement is made at the first occurrence of `current` after the item's id (or its anchor text, when given
   as "anchor"); if neither is found and `current` occurs exactly once in the file, that occurrence is used.
   HSK 5 word packs are generated: fixes to data/hsk5/wordsNN.js are written to tools/hsk5/entries/*.txt instead
   (fields en / vi / pos / example.en / example.vi / example.zh, where example.zh must be given segmented with spaces
   in "fixSegmented"), then run python3 tools/hsk5/build_hsk5.py.
   Prints one line per fix: applied / skipped (and why). */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const fixes = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), DRY = process.argv.includes("--dry");
const cache = new Map();
const read = f => { if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(ROOT, f), "utf8")); return cache.get(f); };
let ok = 0, bad = 0;
const log = (s, x) => console.log(s + "  " + x.id + "  " + (x.field || "") + "  " + String(x.current).slice(0, 50) + " → " + String(x.fix).slice(0, 50));

/* HSK 5 entries: hanzi|pos|en|vi|segmented example|example en|example vi */
const ENTRY_DIR = path.join(ROOT, "tools", "hsk5", "entries");
const entryFiles = fs.existsSync(ENTRY_DIR) ? fs.readdirSync(ENTRY_DIR).filter(f => f.endsWith(".txt")).map(f => "tools/hsk5/entries/" + f) : [];
const COL = { pos: 1, en: 2, vi: 3, "example.zh": 4, "example.en": 5, "example.vi": 6 };
function hsk5(x) {
  const col = COL[x.field]; if (col == null) return "field not editable in entries (" + x.field + ")";
  if (!x.hanzi) return "hanzi missing";
  for (const f of entryFiles) {
    const lines = read(f).split("\n"), i = lines.findIndex(l => l.split("|")[0] === x.hanzi);
    if (i < 0) continue;
    const parts = lines[i].split("|");
    const cur = col === 4 ? parts[4].replace(/\s+/g, "").replace(/\{[^}]*\}/g, "") : parts[col];
    if (cur !== (col === 4 ? String(x.current).replace(/\s+/g, "") : x.current)) return "current text differs: " + parts[col];
    if (col === 4) { if (!x.fixSegmented) return "example.zh needs fixSegmented"; parts[4] = x.fixSegmented; }
    else parts[col] = x.fix;
    lines[i] = parts.join("|"); cache.set(f, lines.join("\n")); return null;
  }
  return "word not in entries";
}

for (const x of fixes) {
  if (/^data\/hsk5\/words\d+\.js$/.test(x.file)) {
    const err = hsk5(x); if (err) { bad++; log("SKIP(" + err + ")", x); } else { ok++; log("ok  ", x); } continue;
  }
  const src = read(x.file);
  const tail = String(x.id).split(":").pop();
  let at = -1;
  for (const a of [x.anchor, `"${tail}"`, `'${tail}'`].filter(Boolean)) { at = src.indexOf(a); if (at >= 0) break; }
  let pos = at >= 0 ? src.indexOf(x.current, at) : -1;
  if (pos < 0) { const first = src.indexOf(x.current); if (first >= 0 && src.indexOf(x.current, first + 1) < 0) pos = first; }
  if (pos < 0) { bad++; log("SKIP(not found or not unique)", x); continue; }
  cache.set(x.file, src.slice(0, pos) + x.fix + src.slice(pos + x.current.length)); ok++; log("ok  ", x);
}
if (!DRY) for (const [f, t] of cache) fs.writeFileSync(path.join(ROOT, f), t);
console.log(`${ok} applied, ${bad} skipped${DRY ? " (dry run)" : ""}`);
