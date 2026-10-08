/* Service worker: offline app shell + cached audio.
   VERSION is replaced with the commit SHA at deploy time (see .github/workflows/deploy.yml). */
var VERSION = "dev";
var SHELL = "cb-shell-" + VERSION;
var AUDIO = "cb-audio";
var STROKES = "cb-strokes"; // handwriting data: never changes, kept across app versions
/* Optional content packs (HSK 5, extra HSK 4 words): NOT precached. They are stored the first time the app asks for
   them and then served cache-first (the file name carries a content hash). tools/build.js fills in the current names. */
var PACKS = "cb-packs";
var PACK_FILES = [];
var PACK_RE = /\/data\/(hsk5|hsk4x)\.[0-9a-f]+\.js$/;
function packKind(u) { var m = PACK_RE.exec(u); return m ? m[1] : ""; }
/* A learner who already has a pack gets its new edition with the app update, so it still works offline afterwards. */
function refreshPacks() {
  return caches.open(PACKS).then(function (c) {
    return c.keys().then(function (keys) {
      var have = {}; keys.forEach(function (r) { have[packKind(new URL(r.url).pathname)] = 1; });
      return Promise.all(PACK_FILES.map(function (f) {
        if (!have[packKind("/" + f)]) return null;
        return c.match(f).then(function (hit) { return hit || fetch(new Request(f, { cache: "reload" })).then(function (r) { if (r.ok) return c.put(f, r); }); }).catch(function () { /* offline: the app asks again later */ });
      }));
    });
  }).catch(function () { /* optional */ });
}
/* A cached pack of the same kind (any edition), for when the current one cannot be fetched. */
function anyPack(c, pathname) {
  var kind = packKind(pathname);
  return c.keys().then(function (keys) {
    var old = keys.filter(function (r) { return packKind(new URL(r.url).pathname) === kind; })[0];
    return old ? c.match(old) : undefined;
  });
}
/* refreshPacks, but never longer than PACK_WAIT_MS: a stalled download must not hold back the app update. */
var PACK_WAIT_MS = 15000;
function refreshPacksSoon() {
  return Promise.race([refreshPacks(), new Promise(function (res) { setTimeout(res, PACK_WAIT_MS); })]);
}
function prunePacks() {
  if (!PACK_FILES.length) return Promise.resolve();
  return caches.open(PACKS).then(function (c) {
    return c.keys().then(function (keys) {
      return Promise.all(keys.map(function (r) {
        var p = new URL(r.url).pathname, cur = PACK_FILES.some(function (f) { return p.slice(-f.length) === f; });
        if (cur) return null;
        /* drop an old edition only when the new one is stored, so the pack never disappears while offline */
        var kind = packKind(p), next = PACK_FILES.filter(function (f) { return packKind("/" + f) === kind; })[0];
        return next ? c.match(next).then(function (hit) { return hit ? c.delete(r) : null; }) : c.delete(r);
      }));
    });
  }).catch(function () { /* optional */ });
}
/* PRECACHE:START — tools/build.js replaces this block with the built file list */
var DAYS = [];
for (var i = 1; i <= 90; i++) DAYS.push("data/day" + (i < 10 ? "0" + i : i) + ".js");
var MOCKS = ["data/mock-manifest.js", "data/track-manifest.js", "data/track_w01-06.js", "data/track_w07-12.js", "data/track_w13-18.js", "data/track_w19-24.js", "data/mock1.js", "data/mock2.js", "data/mock3.js", "data/mock4.js", "data/mock5.js", "data/mock6.js", "data/core-manifest.js", "data/grammar.js", "data/drills.js", "data/drills_extra.js", "data/found.js"];
for (var j = 1; j <= 25; j++) MOCKS.push("data/core" + (j < 10 ? "0" + j : j) + ".js");
/* iOS launch screens (tools/gen_splash.py) */
var SPLASH = ["750x1334", "1242x2208", "1125x2436", "828x1792", "1242x2688", "1170x2532", "1284x2778", "1179x2556", "1290x2796", "1206x2622", "1320x2868"].map(function (n) { return "icons/splash/" + n + ".png"; });
var PRECACHE = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/storage.js", "js/srs.js", "js/audio.js", "js/gamify.js", "js/learn.js", "js/ai.js", "js/content.js", "js/games.js", "js/app.js",
  "audio/manifest.js", "data/manifest.js", "vendor/hanzi-writer.min.js",
  "icons/icon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/nunito-latin-wght-normal.woff2", "fonts/nunito-latin-ext-wght-normal.woff2", "fonts/nunito-vietnamese-wght-normal.woff2"
].concat(DAYS).concat(MOCKS).concat(SPLASH);
/* PRECACHE:END */

self.addEventListener("install", function (e) {
  // cache: "reload" skips the browser's HTTP cache (GitHub Pages allows 10 min), so a new version
  // never gets stored with a stale copy of the previous version's files.
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return c.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(refreshPacksSoon).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("cb-shell-") === 0 && k !== SHELL; }).map(function (k) { return caches.delete(k); }));
  }).then(prunePacks).then(function () { return self.clients.claim(); }));
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

  // Reader dictionary (optional download): cache-first, kept across app versions. A new edition gets a new file name.
  if (url.origin === location.origin && /\/vendor\/dict\/[^/]+\.js$/.test(url.pathname)) {
    e.respondWith(caches.open("cb-dict").then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }

  // Optional content packs: cache-first, stored on first use (see PACKS above). When this edition cannot be fetched
  // (offline, or the update could not download it), an older edition of the same pack on the phone is used instead.
  if (url.origin === location.origin && PACK_RE.test(url.pathname)) {
    e.respondWith(caches.open(PACKS).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (r) {
          if (r.ok) { c.put(req, r.clone()); return r; }
          return anyPack(c, url.pathname).then(function (old) { return old || r; });
        }, function (err) {
          return anyPack(c, url.pathname).then(function (old) { if (old) return old; throw err; });
        });
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
