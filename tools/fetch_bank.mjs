#!/usr/bin/env node
/* Writes data/bank.js with the questions approved in the shared bank, so the deploy records audio for them and ships
   them inside the app. Run by the deploy workflow before the audio step. Never fails the build: if the server can't be
   reached, the file in the repo (usually empty) is kept and the app still fetches the list itself.
   Usage: node tools/fetch_bank.mjs [function URL]   (default: the built-in URL in js/ai.js) */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "js", "ai.js"), "utf8"), m = /BUILT_IN_URL\s*=\s*"([^"]+)"/.exec(src);
const url = process.argv[2] || (m && m[1]);
const out = path.join(ROOT, "data", "bank.js");
if (!url) { console.log("fetch_bank: no function URL, keeping data/bank.js"); process.exit(0); }
try {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", origin: "https://dhoang-1820.github.io" }, body: JSON.stringify({ task: "bank_get", payload: {} }), signal: AbortSignal.timeout(20000) });
  const j = await r.json();
  if (!j || !j.ok || !Array.isArray(j.result.rows)) throw new Error("answer: " + JSON.stringify(j).slice(0, 200));
  const ok = (x) => x && Number.isInteger(x.id) && x.id > 0 && ["fill", "order", "listen", "passage"].includes(x.kind) && x.data && typeof x.data === "object";
  const rows = j.result.rows.filter(ok).map((x) => ({ id: x.id, kind: x.kind, part: String(x.part || ""), skill: String(x.skill || ""), data: x.data }));
  fs.writeFileSync(out, "/* Shared question bank: written by tools/fetch_bank.mjs at deploy. Do not edit. */\nwindow.CB_BANK = " + JSON.stringify({ at: new Date().toISOString(), rows }) + ";\n");
  console.log("fetch_bank: " + rows.length + " approved questions");
} catch (e) {
  console.log("fetch_bank: could not fetch (" + (e && e.message) + "), keeping data/bank.js");
}
