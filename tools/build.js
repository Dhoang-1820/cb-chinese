#!/usr/bin/env node
/* Production build for GitHub Pages.
   Usage:  node tools/build.js [outDir=_site] [version=dev]
   Needs:  npm i --no-save esbuild   (done in the deploy workflow)

   Output (the source tree is left untouched, so local testing works as before):
   - data/index.js   light start-up data: word lists + day titles + plan (what Home, Review and games need)
   - data/full.js    dialogues, grammar, exercises, quizzes — loaded on demand / in the background
   - data/mocks.js   the mock exams — loaded on demand / in the background
   - app.<hash>.js   all app scripts in one minified file
   - style.<hash>.css minified CSS
   - index.html / sw.js rewritten to use the files above; version stamped in sw.js and app */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const OUT = path.resolve(ROOT, process.argv[2] || "_site");
const VERSION = (process.argv[3] || process.env.GITHUB_SHA || "dev").slice(0, 8);
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const kb = n => (n / 1024).toFixed(1) + " KB";

function copy(rel) {
  const src = path.join(ROOT, rel), dst = path.join(OUT, rel);
  if (!fs.existsSync(src)) return;
  // skip bookkeeping and temp files (e.g. audio/.shrunk, *.tmp.mp3, *.part)
  fs.cpSync(src, dst, { recursive: true, filter: f => !/(^|[\\/])\.[^\\/]+$|\.tmp\.mp3$|\.part$/.test(path.relative(ROOT, f)) || f === src });
}
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  return content.length;
}
function minifyJS(code) { return esbuild.transformSync(code, { minify: true, target: "safari14", charset: "utf8" }).code; }

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- 1. static files ----
["manifest.webmanifest", "icons", "vendor", "audio", "fonts"].forEach(copy);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// ---- 2. data bundles ----
const sb = { window: {} };
vm.createContext(sb);
const load = f => vm.runInContext(read("data/" + f), sb, { filename: f });
load("manifest.js");
sb.window.CB_MANIFEST.forEach(load);
load("core-manifest.js");
sb.window.CB_CORE_FILES.forEach(load);
(sb.window.CB_EXTRA_FILES || []).forEach(load);
load("mock-manifest.js");
sb.window.CB_MOCK_FILES.forEach(load);
load("track-manifest.js");
sb.window.CB_TRACK_FILES.forEach(load);
// HSK 4 Core: word basics start up with the app; example sentences go with the lazy data
const coreLight = [], coreEx = {};
(sb.window.CB_CORE || []).forEach(set => coreLight.push({ set: set.set, track: set.track, words: set.words.map(w => {
  const o = Object.assign({}, w); delete o.example; if (w.example) coreEx[w.id] = w.example; return o;
}) }));

const days = sb.window.CB_DAYS.slice().sort((a, b) => a.day - b.day);
const light = days.map(d => {
  const o = { day: d.day, type: d.type, title: d.title, words: d.words || [] };
  if (d.reviewOf) o.reviewOf = d.reviewOf;
  if (d.reading && d.reading.kind) o._rk = d.reading.kind;
  if (d.grammar) o._g = 1;
  return o;
});
const full = {};
days.forEach(d => {
  const rest = {};
  Object.keys(d).forEach(k => { if (!["day", "type", "title", "words", "reviewOf"].includes(k)) rest[k] = d[k]; });
  full[d.day] = rest;
});
const J = x => JSON.stringify(x);
const sizes = {};
sizes["data/index.js"] = write("data/index.js", minifyJS(
  "window.CB_BUNDLED=true;window.CB_PLAN=" + J(sb.window.CB_PLAN || []) + ";window.CB_DAYS=" + J(light) + ";window.CB_CORE=" + J(coreLight) + ";"));
sizes["data/full.js"] = write("data/full.js", minifyJS("window.CB_FULL=" + J(full) + ";window.CB_CORE_EX=" + J(coreEx) + ";window.CB_GRAMMAR=" + J(sb.window.CB_GRAMMAR || []) + ";window.CB_DRILLS=" + J(sb.window.CB_DRILLS || {}) + ";"));
sizes["data/track.js"] = write("data/track.js", minifyJS("window.CB_TRACK=" + J((sb.window.CB_TRACK || []).slice().sort((a, b) => a.week - b.week)) + ";"));
sizes["data/mocks.js"] = write("data/mocks.js", minifyJS("window.CB_MOCK=" + J(sb.window.CB_MOCK) + ";"));

// ---- 3. app bundle (same order as index.html; data/audio manifests stay separate) ----
const APP_FILES = ["js/storage.js", "js/srs.js", "js/audio.js", "js/gamify.js", "js/learn.js", "js/ai.js", "js/content.js", "js/games.js", "js/app.js"];
let app = APP_FILES.map(read).join("\n;\n").replace('var BUILD = "dev";', 'var BUILD = "' + VERSION + '";');
if (!app.includes('var BUILD = "' + VERSION + '"')) throw new Error("BUILD marker not found in js/app.js");
app = minifyJS(app);
const appName = "app." + hash(app) + ".js";
sizes[appName] = write(appName, app);

// the built CSS sits at the site root, so font URLs move from ../fonts/ to fonts/
const css = esbuild.transformSync(read("css/style.css").split("../fonts/").join("fonts/"), { loader: "css", minify: true, target: "safari14" }).code;
const cssName = "style." + hash(css) + ".css";
sizes[cssName] = write(cssName, css);

// ---- 4. index.html ----
let html = read("index.html");
const s0 = html.indexOf("<!-- SCRIPTS:START"), s1 = html.indexOf("<!-- SCRIPTS:END -->");
if (s0 < 0 || s1 < 0) throw new Error("SCRIPTS markers missing in index.html");
html = html.slice(0, s0) +
  '<script src="data/index.js"></script>\n  <script src="' + appName + '"></script>\n  <script src="audio/manifest.js" async></script>' +
  html.slice(s1 + "<!-- SCRIPTS:END -->".length);
if (!html.includes('href="css/style.css"')) throw new Error("stylesheet link not found in index.html");
html = html.replace('href="css/style.css"', 'href="' + cssName + '"');
// the audio index (~100 KB) isn't needed to draw the first screen, so it loads async after the app
write("index.html", html);

// ---- 5. service worker ----
let sw = read("sw.js").replace('var VERSION = "dev";', 'var VERSION = "' + VERSION + '";');
const p0 = sw.indexOf("/* PRECACHE:START"), p1 = sw.indexOf("/* PRECACHE:END */");
if (p0 < 0 || p1 < 0) throw new Error("PRECACHE markers missing in sw.js");
const precache = ["./", "index.html", cssName, appName, "manifest.webmanifest", "audio/manifest.js",
  "data/index.js", "data/full.js", "data/mocks.js", "data/track.js", "vendor/hanzi-writer.min.js",
  "icons/icon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/nunito-latin-wght-normal.woff2", "fonts/nunito-latin-ext-wght-normal.woff2", "fonts/nunito-vietnamese-wght-normal.woff2"];
// iOS launch screens (tools/gen_splash.py): precached like the icons
if (fs.existsSync(path.join(OUT, "icons", "splash"))) fs.readdirSync(path.join(OUT, "icons", "splash")).filter(f => /\.png$/.test(f)).sort().forEach(f => precache.push("icons/splash/" + f));
precache.forEach(f => { if (f !== "./" && !fs.existsSync(path.join(OUT, f))) throw new Error("precache file missing: " + f); });
sw = sw.slice(0, p0) + "var PRECACHE = " + J(precache) + ";" + sw.slice(p1 + "/* PRECACHE:END */".length);
write("sw.js", sw);

// ---- report ----
const zlib = require("zlib");
console.log("Built " + OUT + " (version " + VERSION + ")");
Object.keys(sizes).forEach(f => {
  const buf = fs.readFileSync(path.join(OUT, f));
  console.log("  " + f.padEnd(26) + kb(buf.length).padStart(10) + "  gzip " + kb(zlib.gzipSync(buf).length).padStart(9));
});
