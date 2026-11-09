#!/usr/bin/env node
/* Splits the joined main app (js/app/*.js, one shared scope) into a start-up part and screen chunks that load the
   first time their screen opens. Source files stay as they are; this runs inside tools/build.js.

   How: the joined code is parsed (acorn) and its scopes analysed (eslint-scope). For each chunk (a list of feature
   files), every top-level function declared in those files moves to the chunk unless code outside the chunk needs it
   synchronously. Functions whose name starts with "view" are screen entry points: outside callers get a small stub
   that loads the chunk and then runs the real function (routes already render asynchronously). Anything else used
   from outside, and everything that is not a function declaration (variables, statements), stays in the start-up
   part, in its original place. Inside a chunk, every name from the shared scope is read and written through a bridge
   object (getters / setters), so values that change later (loaded data, state) are always current.

   split(appCode, chunks) -> { core, chunks: { name: code }, report }
     appCode: the joined text of js/app/*.js (from join_app.js)
     chunks:  { admin: ["04-admin.js"], ... }
   node tools/split_app.js            prints what would move, per chunk */
"use strict";
const fs = require("fs"), path = require("path");
const acorn = require("acorn"), escope = require("eslint-scope");

/* Screens that load on first visit, by feature file. Keep the list to screens that are not needed at start-up. */
const CHUNKS = {
  admin: ["04-admin.js"],
  track: ["09-track.js"],
  plan: ["14-exam-plan.js", "10-plan-progress.js"],
  mock: ["07-mock.js", "08-mistakes.js"]
};

function split(appCode, chunks, files) {
  const ast = acorn.parse(appCode, { ecmaVersion: 2020, sourceType: "script", ranges: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2020, sourceType: "script" });
  const wrapFn = ast.body[0] && ast.body[0].expression && ast.body[0].expression.callee;
  if (!wrapFn || wrapFn.type !== "FunctionExpression") throw new Error("split_app: the app wrapper (function () { … })() not found");
  const scope = sm.acquire(wrapFn);
  const top = wrapFn.body.body;

  /* which feature file each top-level statement comes from */
  const bounds = []; let at = 0;
  files.forEach(f => { bounds.push({ f: f.name, from: at, to: at + f.text.length }); at += f.text.length; });
  const fileOf = node => (bounds.find(b => node.range[0] >= b.from && node.range[0] < b.to) || {}).f;
  const chunkOfFile = {}; Object.keys(chunks).forEach(c => chunks[c].forEach(f => { chunkOfFile[f] = c; }));

  /* every top-level function declaration, and the shared-scope names each top-level statement refers to */
  const fnDecl = new Map(); // name -> { node, chunk }
  top.forEach(st => { if (st.type === "FunctionDeclaration") fnDecl.set(st.id.name, { node: st, chunk: chunkOfFile[fileOf(st)] || null }); });
  const shared = new Set(scope.variables.map(v => v.name));
  const ownerOf = ref => { // the top-level statement a reference sits in
    const p = ref.identifier.range[0];
    return top.find(st => p >= st.range[0] && p < st.range[1]);
  };
  /* users[name] = list of { st, call } where st is the top-level statement that refers to the shared name */
  const users = new Map();
  const walkRefs = s => {
    s.references.forEach(r => {
      if (!r.resolved || r.resolved.scope !== scope) return;
      const st = ownerOf(r); if (!st) return;
      const n = r.identifier.name; if (!users.has(n)) users.set(n, []);
      users.get(n).push({ st, id: r.identifier });
    });
    s.childScopes.forEach(walkRefs);
  };
  walkRefs(scope);

  /* decide: a candidate moves unless something outside its chunk needs it (stubs allowed for view* names) */
  const where = st => (st.type === "FunctionDeclaration" && fnDecl.get(st.id.name).moved) ? fnDecl.get(st.id.name).chunk : null;
  fnDecl.forEach(d => { d.moved = !!d.chunk; });
  let changed = true;
  while (changed) {
    changed = false;
    fnDecl.forEach((d, name) => {
      if (!d.moved) return;
      const outside = (users.get(name) || []).filter(u => where(u.st) !== d.chunk && u.st !== d.node);
      if (!outside.length) return;
      if (/^view[A-Z]/.test(name)) { d.stub = true; return; }
      d.moved = false; d.stub = false; changed = true;
    });
  }

  /* chunk code: moved functions with shared names rewritten to A.name */
  const out = {}, report = {}, bridge = new Set();
  Object.keys(chunks).forEach(c => {
    const fns = [...fnDecl].filter(([, d]) => d.moved && d.chunk === c);
    const own = new Set(fns.map(([n]) => n));
    const edits = [];
    fns.forEach(([, d]) => {
      const visit = s => {
        s.references.forEach(r => {
          if (!r.resolved || r.resolved.scope !== scope || own.has(r.identifier.name)) return;
          const id = r.identifier; if (id.range[0] < d.node.range[0] || id.range[1] > d.node.range[1]) return;
          bridge.add(id.name); edits.push(id);
        });
        s.childScopes.forEach(visit);
      };
      visit(sm.acquire(d.node));
    });
    const shorthand = new Set();
    acornWalk(ast, (node) => { if (node.type === "Property" && node.shorthand && node.value.type === "Identifier") shorthand.add(node.value.range[0]); });
    let code = fns.map(([, d]) => ({ from: d.node.range[0], to: d.node.range[1] }));
    const pieces = code.map(r => {
      let t = appCode.slice(r.from, r.to);
      edits.filter(id => id.range[0] >= r.from && id.range[1] <= r.to).sort((a, b) => b.range[0] - a.range[0]).forEach(id => {
        const a = id.range[0] - r.from, b = id.range[1] - r.from;
        t = t.slice(0, a) + (shorthand.has(id.range[0]) ? id.name + ": A." + id.name : "A." + id.name) + t.slice(b);
      });
      return t;
    });
    const exportsOf = fns.filter(([, d]) => d.stub).map(([n]) => n);
    out[c] = "(window.CB_LAZY = window.CB_LAZY || {})[" + JSON.stringify(c) + "] = function (A) {\n\"use strict\";\n" + pieces.join("\n") +
      "\nreturn { " + exportsOf.map(n => n + ": " + n).join(", ") + " };\n};\n";
    report[c] = { moved: fns.length, kept: [...fnDecl].filter(([, d]) => d.chunk === c && !d.moved).map(([n]) => n), entry: exportsOf,
      bytes: pieces.join("").length };
  });

  /* start-up part: moved functions removed; stubs, bridge and loader added after "use strict" */
  const cut = [...fnDecl.values()].filter(d => d.moved).map(d => d.node.range).sort((a, b) => b[0] - a[0]);
  let core = appCode;
  cut.forEach(([a, b]) => { core = core.slice(0, a) + core.slice(b); });
  const stubs = [...fnDecl].filter(([, d]) => d.moved && d.stub).map(([n, d]) =>
    "function " + n + "() { var a = arguments; return __lazy(" + JSON.stringify(d.chunk) + ").then(function (m) { return m && m." + n + ".apply(null, a); }); }").join("\n  ");
  const names = [...bridge].filter(n => shared.has(n)).sort();
  const bridgeCode = "var __A = {" + names.map(n => " get " + n + "() { return " + n + "; }, set " + n + "(v) { " + n + " = v; }").join(",") + " };";
  const loader = "var __LAZY_FILES = /*LAZY_FILES*/{}, __LAZY = {};\n" +
    "  function __lazy(name) {\n" +
    "    if (__LAZY[name]) return __LAZY[name];\n" +
    "    return (__LAZY[name] = new Promise(function (res) {\n" +
    "      var done = function () { var f = window.CB_LAZY && window.CB_LAZY[name]; if (f) { res(f(__A)); return; } __LAZY[name] = null;\n" +
    "        try { render('<p class=\"warn\" role=\"alert\">' + (window.tx ? tx(\"Couldn't load this part of the app. Check your connection and try again.\") : \"Couldn't load this part of the app. Check your connection and try again.\") + '</p>'); } catch (e) { /* no screen yet */ }\n" +
    "        res(null); };\n" +
    "      var s = document.createElement(\"script\"); s.src = __LAZY_FILES[name]; s.onload = done; s.onerror = function () { s.remove(); done(); };\n" +
    "      document.head.appendChild(s);\n" +
    "    }));\n" +
    "  }";
  const strict = wrapFn.body.body[0];
  if (!(strict && strict.type === "ExpressionStatement" && strict.directive === "use strict")) throw new Error("split_app: \"use strict\" not first in the wrapper");
  const ins = strict.range[1];
  core = core.slice(0, ins) + "\n  " + loader + "\n  " + bridgeCode + "\n  " + stubs + "\n" + core.slice(ins);
  return { core, chunks: out, report };
}

function acornWalk(node, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node);
  for (const k in node) { const v = node[k]; if (k === "range") continue;
    if (Array.isArray(v)) v.forEach(x => acornWalk(x, fn)); else if (v && typeof v.type === "string") acornWalk(v, fn); }
}

function appFiles() {
  const DIR = path.join(__dirname, "..", "js", "app"), join = require("./join_app.js");
  return join.files().map(f => ({ name: f, text: fs.readFileSync(path.join(DIR, f), "utf8") }));
}

module.exports = { split, CHUNKS, appFiles };
if (require.main === module) {
  const files = appFiles(), r = split(files.map(f => f.text).join(""), CHUNKS, files);
  Object.keys(r.report).forEach(c => { const x = r.report[c];
    console.log(c.padEnd(6), "moved", String(x.moved).padStart(3), "functions,", Math.round(x.bytes / 1024) + " KB; entry points:", x.entry.join(" ") || "-");
    console.log("        kept at start-up (used elsewhere):", x.kept.join(" ") || "-"); });
  console.log("start-up part", Math.round(r.core.length / 1024) + " KB (was " + Math.round(files.reduce((a, f) => a + f.text.length, 0) / 1024) + " KB)");
}
