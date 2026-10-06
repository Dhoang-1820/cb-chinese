/* Builds vendor/dict/cedict.v1.js — a trimmed offline Chinese→English dictionary for the Reader.
   Source: CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), licence CC BY-SA 4.0,
   read from the npm package "cedict-json". The output file is a derivative work and carries the same licence.

   Usage:  npm i cedict-json   (in any folder)
           node tools/build_dict.js <path to cedict.json> [maxLen=5]

   Trimming: simplified words up to maxLen characters; no surnames, variants, archaic/dialect/slang-only entries;
   proper nouns only when 2–3 characters (countries, cities); at most 3 glosses per reading, 2 readings per word. */
"use strict";
const fs = require("fs"), path = require("path");
const src = process.argv[2], MAXLEN = parseInt(process.argv[3] || "5", 10);
if (!src) { console.error("usage: node tools/build_dict.js <cedict.json> [maxLen]"); process.exit(1); }
const D = JSON.parse(fs.readFileSync(src, "utf8"));
const SKIP = /variant of|old variant|erhua variant|\(archaic\)|\(old\)|\(Tw\)|\(dialect\)|\(literary\)|\(Internet slang\)|\(slang\)|\(vulgar\)|\(Cantonese\)|\(Buddhism\)|\(Taiwan|Japanese |\(loanword from Japanese|see also |^see |abbr\. for|\(coll\.\)|\(Shanghainese\)|\(Hong Kong\)|\(bound form\)$/;
const HAN = /^[\u4e00-\u9fff]+$/;
const out = new Map();
let kept = 0;
for (const e of D) {
  const w = e.simplified;
  if (!HAN.test(w) || w.length > MAXLEN) continue;
  const proper = /^[A-Z]/.test(e.pinyin);
  if (proper && (w.length < 2 || w.length > 3)) continue;
  let gl = (e.english || []).filter(g => g && !/^CL:/.test(g) && !/^surname /.test(g) && !SKIP.test(g));
  if (!gl.length) continue;
  gl = gl.map(g => g.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const seen = new Set(); gl = gl.filter(g => !seen.has(g) && seen.add(g));
  let txt = ""; for (const g of gl.slice(0, 3)) { if ((txt + g).length > 64 && txt) break; txt += (txt ? "; " : "") + g; }
  if (!txt) continue;
  const py = e.pinyin.replace(/u:/g, "v").toLowerCase();
  const cur = out.get(w);
  if (!cur) { out.set(w, [[py, txt]]); kept++; }
  else if (cur.length < 2 && !cur.some(r => r[0] === py)) cur.push([py, txt]);
}
const lines = [];
for (const [w, rs] of out) lines.push(w + "\t" + rs.map(r => r[0] + "\t" + r[1]).join("\t"));
lines.sort();
const body = lines.join("\n").replace(/\\/g, "\\\\").replace(/`/g, "'").replace(/\$\{/g, "$ {");
const js = "/* Offline dictionary for the Reader. Derived from CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict),\n" +
  "   licence: Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Trimmed by tools/build_dict.js.\n" +
  "   Format: one word per line — simplified TAB pinyin TAB meaning [TAB pinyin TAB meaning]. */\n" +
  "window.CB_DICT_RAW = `" + body + "`;\n";
const dest = path.join(__dirname, "..", "vendor", "dict", "cedict.v1.js");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, js);
console.log("words:", kept, "| bytes:", js.length, "| file:", Buffer.byteLength(js));
