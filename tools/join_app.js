#!/usr/bin/env node
/* The main app is kept as feature files in js/app/ (00-core.js … 15-boot.js) that share ONE scope: 00-core.js opens the
   wrapper function and 15-boot.js closes it, so the files are joined in name order, unchanged, before they run.
   tools/build.js joins them for the site. Run this script to get js/app.dev.js for opening index.html without a build:
     node tools/join_app.js        (writes js/app.dev.js, which git ignores) */
"use strict";
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "js", "app");
function files() { return fs.readdirSync(DIR).filter((f) => /^\d\d-[a-z0-9-]+\.js$/.test(f)).sort(); }
function join() { return files().map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join(""); }
module.exports = { join, files };
if (require.main === module) {
  const out = path.join(__dirname, "..", "js", "app.dev.js");
  fs.writeFileSync(out, join());
  console.log("wrote js/app.dev.js from " + files().length + " files");
}
