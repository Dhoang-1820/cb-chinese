/* Service worker: offline app shell + cached audio.
   VERSION is replaced with the commit SHA at deploy time (see .github/workflows/deploy.yml). */
var VERSION = "dev";
var SHELL = "cb-shell-" + VERSION;
var AUDIO = "cb-audio";
var STROKES = "cb-strokes"; // handwriting data: never changes, kept across app versions
/* PRECACHE:START — tools/build.js replaces this block with the built file list */
var DAYS = [];
for (var i = 1; i <= 90; i++) DAYS.push("data/day" + (i < 10 ? "0" + i : i) + ".js");
var MOCKS = ["data/mock-manifest.js", "data/track-manifest.js", "data/track_w01-06.js", "data/track_w07-12.js", "data/track_w13-18.js", "data/track_w19-24.js", "data/mock1.js", "data/mock2.js", "data/mock3.js", "data/mock4.js", "data/mock5.js", "data/mock6.js", "data/core-manifest.js", "data/grammar.js", "data/drills.js", "data/found.js"];
for (var j = 1; j <= 25; j++) MOCKS.push("data/core" + (j < 10 ? "0" + j : j) + ".js");
var PRECACHE = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/storage.js", "js/srs.js", "js/audio.js", "js/gamify.js", "js/learn.js", "js/ai.js", "js/content.js", "js/games.js", "js/app.js",
  "audio/manifest.js", "data/manifest.js", "vendor/hanzi-writer.min.js",
  "icons/icon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/nunito-latin-wght-normal.woff2", "fonts/nunito-latin-ext-wght-normal.woff2", "fonts/nunito-vietnamese-wght-normal.woff2"
].concat(DAYS).concat(MOCKS);
/* PRECACHE:END */

self.addEventListener("install", function (e) {
  // cache: "reload" skips the browser's HTTP cache (GitHub Pages allows 10 min), so a new version
  // never gets stored with a stale copy of the previous version's files.
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return c.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("cb-shell-") === 0 && k !== SHELL; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Audio: cache-first (files are content-hashed, so they never change).
  if (url.origin === location.origin && /\/audio\/[0-9a-f]+\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }

  // Stroke data for handwriting: cache-first in a cache that survives app updates.
  if (url.origin === location.origin && /\/vendor\/hanzi\/[^/]+\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(STROKES).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }

  // App shell & fonts: stale-while-revalidate (fast, and picks up updates on the next visit).
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(SHELL).then(function (c) {
      return c.match(req, { ignoreSearch: url.origin === location.origin }).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
