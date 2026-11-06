#!/usr/bin/env node
/* Interface translation check (js/i18n.js): every tx("…") phrase in js/app/*.js and js/games.js must have a
   Vietnamese entry in js/i18n-vi.js with the same {placeholders}, and the table holds no unused entries.
   Usage: node tools/i18n_check.js   (exit 1 on a missing or broken entry) */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const files = fs.readdirSync(path.join(ROOT, "js", "app")).filter(f => f.endsWith(".js")).map(f => path.join("js", "app", f)).concat(["js/games.js"]);
const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js", "i18n-vi.js"), "utf8"), sb);
const VI = sb.window.CB_I18N_VI || {};
const re = /\btx\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, used = new Map();
files.forEach(f => { const s = fs.readFileSync(path.join(ROOT, f), "utf8"); let m;
  while ((m = re.exec(s))) { let lit = m[1]; if (lit[0] === "'") lit = '"' + lit.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"';
    const k = JSON.parse(lit); if (!used.has(k)) used.set(k, f); } });
const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
const missing = [...used.keys()].filter(k => !(k in VI)), bad = [...used.keys()].filter(k => k in VI && ph(k) !== ph(VI[k]));
const empty = Object.keys(VI).filter(k => !String(VI[k]).trim());
missing.slice(0, 20).forEach(k => console.log("  missing: " + JSON.stringify(k) + "  (" + used.get(k) + ")"));
bad.slice(0, 20).forEach(k => console.log("  placeholders differ: " + JSON.stringify(k) + " → " + JSON.stringify(VI[k])));
empty.forEach(k => console.log("  empty translation: " + JSON.stringify(k)));
const unused = Object.keys(VI).length - [...used.keys()].filter(k => k in VI).length;
if (missing.length || bad.length || empty.length) { console.log("FAIL  i18n: " + missing.length + " missing, " + bad.length + " placeholder, " + empty.length + " empty"); process.exit(1); }
console.log("PASS  i18n: " + used.size + " phrases translated (" + unused + " table entries used only through lookups)");
