/* The audio list (tools/collect_texts.js) covers every HSK 5 example sentence, and only Chinese text, without duplicates.
   Run: node tests/audio_list_test.mjs */
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path";
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const items = JSON.parse(execFileSync("node", [path.join(ROOT, "tools/collect_texts.js")], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }).toString());
let pass = 0, fail = 0;
const t = (name, ok, info) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name + "  " + (info || "")); } };
const sb = { window: {} }; vm.createContext(sb);
fs.readdirSync(path.join(ROOT, "data/hsk5")).filter((f) => /^words\d+\.js$/.test(f)).sort().forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, "data/hsk5", f), "utf8"), sb));
const ex = (sb.window.CB_HSK5 || []).flatMap((p) => p.words).map((w) => w.example && w.example.zh).filter(Boolean);
const have = new Set(items.map((i) => i.v + "|" + i.t));
const missing = ex.filter((z) => !have.has("F|" + z));
t("HSK 5: there are example sentences to record", ex.length > 1000, ex.length);
t("HSK 5: every example sentence is in the audio list", missing.length === 0, missing.length + " missing, e.g. " + missing.slice(0, 2).join(" / "));
t("HSK 5: the new example clips are marked optional (they never fail the deploy)", ex.every((z) => { const i = items.find((x) => x.t === z && x.v === "F"); return i && (i.opt || !ex.includes(z) || items.indexOf(i) < items.findIndex((x) => x.opt)); }) && items.filter((i) => i.opt).length >= 2700, items.filter((i) => i.opt).length);
t("audio list: no duplicates", have.size === items.length, items.length - have.size);
t("audio list: every text has Chinese characters and a known voice", items.every((i) => /[㐀-鿿]/.test(i.t) && (i.v === "F" || i.v === "M")));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
