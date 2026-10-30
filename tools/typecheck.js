#!/usr/bin/env node
/* Type check (TypeScript's checker, no rewrite):
     server  supabase/functions/ai/*.ts   strict, must have no errors (tsconfig.server.json)
     app     js/*.js + js/app/ joined       loose checking of plain JavaScript (tsconfig.json, types/globals.d.ts)
   The app still has known findings that come from its loose object shapes; they are counted in types/baseline.json and a
   check fails only when a change ADDS one (same file, same error, same message). Fix a finding, then update the baseline:
     node tools/typecheck.js            check (needs: npm install --no-save typescript@5.9.3)
     node tools/typecheck.js --update   write the current app findings to types/baseline.json */
"use strict";
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), BASE = path.join(ROOT, "types", "baseline.json");
let tsc;
try { tsc = require.resolve("typescript/lib/tsc.js", { paths: [ROOT].concat((process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean)) }); }
catch (e) { console.error("typecheck: TypeScript is not installed (npm install --no-save typescript@5.9.3)"); process.exit(2); }
function run(cfg) {
  try { execFileSync(process.execPath, [tsc, "-p", cfg, "--pretty", "false"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); return []; }
  catch (e) { return String(e.stdout || "").split("\n").filter((l) => / error TS\d+:/.test(l)); }
}
fs.writeFileSync(path.join(ROOT, "js", "app.dev.js"), require("./join_app.js").join());
const server = run("tsconfig.server.json");
if (server.length) { console.log(server.join("\n")); console.log("\ntypecheck: " + server.length + " error(s) in the server function"); process.exit(1); }
const key = (l) => { const m = /^(.*?)\(\d+,\d+\): error (TS\d+): (.*)$/.exec(l); return m ? m[1] + " | " + m[2] + " | " + m[3] : l; };
const lines = run("tsconfig.json"), now = {};
lines.forEach((l) => { const k = key(l); now[k] = (now[k] || 0) + 1; });
if (process.argv.includes("--update")) {
  const sorted = {}; Object.keys(now).sort().forEach((k) => { sorted[k] = now[k]; });
  fs.writeFileSync(BASE, JSON.stringify(sorted, null, 1) + "\n");
  console.log("typecheck: baseline written (" + lines.length + " known findings in the app)"); process.exit(0);
}
const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : {};
const added = Object.keys(now).filter((k) => now[k] > (base[k] || 0));
if (added.length) {
  added.forEach((k) => { lines.filter((l) => key(l) === k).forEach((l) => console.log(l)); });
  console.log("\ntypecheck: " + added.length + " new kind(s) of finding in the app (see above; js/app.dev.js lines map to js/app/*.js in order)");
  process.exit(1);
}
const fixed = Object.keys(base).filter((k) => (now[k] || 0) < base[k]).length;
console.log("typecheck: server clean · app " + lines.length + " known findings, nothing new" + (fixed ? " · " + fixed + " fixed: run with --update to lower the baseline" : ""));
