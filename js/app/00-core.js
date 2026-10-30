/* C&B 中文 — main app (vanilla JS, hash routing). Mobile-first, tuned for iPhone.
   The app is split into feature files js/app/00-core.js … 15-boot.js that share this one scope (this file opens the
   wrapper, 15-boot.js closes it); tools/build.js joins them in order. For a no-build run: node tools/join_app.js. */
(function () {
  "use strict";
  var BUILD = "dev"; // replaced with the commit SHA at deploy time

  var DAYS = [], DAYMAP = {}, WORDS = [], WORDMAP = {}, LOAD_ERRORS = [], CORE = [], COREMAP = {};
  var app = document.getElementById("app");
  var keyHandler = null, searchQuery = "", pendingJump = null;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function M(o) {
    if (o == null) return "";
    if (typeof o === "string") return esc(o);
    return '<span class="m"><span class="m-vi">' + esc(o.vi) + '</span><span class="m-en">' + esc(o.en) + "</span></span>";
  }
  function PY(t) { return '<span class="py">' + esc(t) + "</span>"; }
  function SAY(t, voice, big) {
    return '<button type="button" class="say' + (big ? " big" : "") + '" data-say="' + esc(t) + '"' + (voice ? ' data-voice="' + voice + '"' : "") + ' aria-label="Play audio">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg></button>';
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function render(html, cls) {
    app.className = "container " + (cls || "");
    app.innerHTML = html;
    window.scrollTo(0, 0);
    if (!UI.reduced) { app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter"); }
  }
  /* ---------- crash safety net ----------
     A script error must never leave a blank or frozen screen. The error is saved under Me → Problem reports
     (on this phone only) and the learner gets a way out: Reload or Home. */
  var crashN = 0, crashSeen = {};
  function crashNote(msg, stack) {
    msg = String(msg || "Unknown error").slice(0, 200);
    if (/ResizeObserver loop|Script error\.?$/.test(msg) || crashSeen[msg] || crashN >= 5) return false;
    crashSeen[msg] = 1; crashN++;
    try {
      var s = Store.state; s.reports = s.reports || [];
      s.reports.push({ id: Date.now().toString(36), date: Store.today(), route: /^#\/[\w\/-]*$/.test(location.hash) ? location.hash : "#/",
        text: "App error: " + msg, ctx: String(stack || "").replace(/https?:\/\/[^\s)]+\//g, "").replace(/\s+/g, " ").slice(0, 300) });
      if (s.reports.length > 100) s.reports.shift();
      Store.save();
    } catch (e) { /* storage blocked: still show the way out */ }
    return true;
  }
  function crashScreen(msg) {
    var html = '<section class="card result crash" role="alert"><h2>Something broke on this screen</h2>' +
      '<p class="sub">Your progress is saved. Reload to carry on. The error was noted under Me → Problem reports.</p>' +
      '<p class="sub crash-msg">' + esc(String(msg || "").slice(0, 160)) + "</p>" +
      '<div class="actions center"><button type="button" class="btn primary" id="crash-reload">Reload</button>' + (/^#\/?$/.test(location.hash || "#/") ? "" : '<a class="btn" href="#/">Home</a>') + "</div></section>";
    try { render(html); } catch (e) { app.innerHTML = html; }
    var b = document.getElementById("crash-reload"); if (b) b.onclick = function () { location.reload(); };
  }
  function crashBar() {
    if (document.getElementById("crash-bar")) return;
    var d = document.createElement("div"); d.id = "crash-bar"; d.setAttribute("role", "alert");
    d.innerHTML = '<span>Something went wrong. If this screen is stuck, reload.</span><button type="button" class="btn small" id="cb-reload">Reload</button><button type="button" class="x" id="cb-x" aria-label="Dismiss">✕</button>';
    document.body.appendChild(d);
    document.getElementById("cb-reload").onclick = function () { location.reload(); };
    document.getElementById("cb-x").onclick = function () { d.remove(); };
  }
  function onCrash(msg, stack) {
    if (!crashNote(msg, stack)) return;
    var blank = !app.children.length || !!app.querySelector(".skel");
    if (blank) crashScreen(msg); else crashBar();
  }
  window.addEventListener("error", function (e) {
    if (e.target && e.target !== window && e.target.nodeType) return; // a file that failed to load, handled where it is requested
    onCrash(e.message || (e.error && e.error.message), e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason, m = r && (r.message || String(r));
    if (!(r instanceof Error) || /Failed to fetch|Load failed|NetworkError|AbortError|NotAllowedError/i.test((r.name || "") + " " + m)) return; // offline and declined permissions are not crashes
    onCrash(m, r.stack);
  });

  /* ---------- screen-reader basics ----------
     The page language is Vietnamese, so Chinese text is tagged as Chinese wherever it appears (a screen reader then
     switches voice). Dialogs get focus, Escape and a focus trap. Both are done in one observer so new screens,
     games and dialogs are covered without touching each of them. */
  var ZH_SEL = ".zh, .hz, .rd-text";
  function tagZh(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches(ZH_SEL) && !root.lang) root.lang = "zh-CN";
    var l = root.querySelectorAll(ZH_SEL);
    for (var i = 0; i < l.length; i++) if (!l[i].lang) l[i].lang = "zh-CN";
  }
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  function topDialog() { var l = document.querySelectorAll(".modal-wrap"); return l.length ? l[l.length - 1] : null; }
  function trapDialog(wrap) {
    if (wrap._trap) return; wrap._trap = true;
    var prev = document.activeElement, n = 0;
    function box() { return wrap.querySelector(".modal") || wrap; }
    function label() { // the dialog is re-drawn between steps (guide, setup), so label and focus it each time
      var b = box(), h = b.querySelector("h2, h3");
      if (!b.hasAttribute("tabindex")) b.setAttribute("tabindex", "-1");
      if (h && !b.getAttribute("aria-labelledby") && !b.getAttribute("aria-label")) { if (!h.id) h.id = "dlg-t" + Date.now().toString(36) + (n++); b.setAttribute("aria-labelledby", h.id); }
      if (!b.contains(document.activeElement)) { try { b.focus({ preventScroll: true }); } catch (e) { /* old browser */ } }
    }
    function key(e) {
      if (!document.body.contains(wrap)) { document.removeEventListener("keydown", key, true); return; }
      if (topDialog() !== wrap) return;
      var b = box();
      if (e.key === "Escape") { var c = b.querySelector("[data-close]"); if (c) { e.preventDefault(); c.click(); } return; }
      if (e.key !== "Tab") return;
      var f = [].filter.call(b.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
      if (!f.length) { e.preventDefault(); b.focus(); return; }
      var inside = b.contains(document.activeElement) && document.activeElement !== b;
      if (e.shiftKey && (!inside || document.activeElement === f[0])) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === f[f.length - 1])) { e.preventDefault(); f[0].focus(); }
    }
    document.addEventListener("keydown", key, true);
    setTimeout(label, 30);
    wrap._relabel = label;
    wrap._release = function () {
      document.removeEventListener("keydown", key, true);
      if (prev && prev.focus && document.body.contains(prev)) { try { prev.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    };
  }
  /* every "AI is thinking" card gets the little robot in place of the 🤖 emoji */
  function robotWait(root) {
    var l = [].slice.call(root.querySelectorAll(".ai-wait")); if (root.matches(".ai-wait")) l.push(root);
    l.forEach(function (el) {
      if (el.querySelector(".lt")) return;
      var t = el.textContent.replace(/^\s*🤖\s*/, "");
      el.innerHTML = UI.anim("robot", 34, "🤖") + "<span></span>"; el.lastChild.textContent = t; el.classList.add("has-robot");
    });
  }
  function watchDom() {
    tagZh(document.body); UI.mountAnims(document.body);
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i], k, nd;
        for (k = 0; k < m.addedNodes.length; k++) {
          nd = m.addedNodes[k]; if (nd.nodeType !== 1) continue;
          tagZh(nd); robotWait(nd); UI.mountAnims(nd);
          if (nd.classList.contains("modal-wrap")) trapDialog(nd);
          else { var w = nd.closest && nd.closest(".modal-wrap"); if (w && w._relabel) setTimeout(w._relabel, 30); }
        }
        for (k = 0; k < m.removedNodes.length; k++) { nd = m.removedNodes[k]; if (nd.nodeType === 1) { UI.unmountAnims(nd); if (nd._release) nd._release(); } }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function levelBadge(l) {
    var m = /^HSK([1-6])$/.exec(l || "");
    return m ? '<span class="tag t-hsk">HSK ' + m[1] + "</span>" : l === "Mine" ? '<span class="tag t-mine">My word</span>' : '<span class="tag t-dom">C&amp;B · beyond HSK 4</span>';
  }
  function boxBadge(id) { var c = SRS.get(id); return c ? '<span class="tag t-box">Box ' + c.box + "</span>" : ""; }
  function dayWords(d) {
    if (!d) return [];
    if (d.type === "review") {
      var out = [];
      (d.reviewOf || []).forEach(function (n) { if (DAYMAP[n]) out = out.concat(DAYMAP[n].words || []); });
      return out;
    }
    return d.words || [];
  }
  function studiedWords() {
    var w = WORDS.filter(function (x) { return SRS.has(x.id); });
    return w.length >= 8 ? w : WORDS.filter(function (x) { return x._day <= Math.max(4, maxStudiedDay()); });
  }
  function maxStudiedDay() {
    var m = 0;
    WORDS.forEach(function (w) { if (SRS.has(w.id) && w._day > m) m = w._day; });
    Object.keys(Store.state.days).forEach(function (k) { if (+k > m) m = +k; });
    return m;
  }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/ü/g, "v").replace(/[\s'’·\-]/g, "");
  }
  function setKeys(fn) {
    if (keyHandler) document.removeEventListener("keydown", keyHandler);
    keyHandler = fn;
    if (fn) document.addEventListener("keydown", fn);
  }
  function typing(e) { return /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); }
  function rect(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; }
  function nextDay() {
    for (var i = 0; i < DAYS.length; i++) if (!(Store.state.days[DAYS[i].day] || {}).completed) return DAYS[i];
    return DAYS[DAYS.length - 1];
  }
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);

  /* ---------- settings / chrome ---------- */
  function applySettings() {
    var s = Store.state.settings, root = document.documentElement, b = document.body;
    if (s.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", s.theme);
    b.classList.toggle("hide-py", !s.showPinyin);
    root.classList.remove("ts-l", "ts-xl"); if (s.textSize === "l" || s.textSize === "xl") root.classList.add("ts-" + s.textSize);
    b.classList.remove("lang-vi", "lang-en", "lang-both");
    b.classList.add("lang-" + s.lang);
    var py = document.getElementById("btn-py");
    if (py) py.setAttribute("aria-pressed", s.showPinyin ? "true" : "false");
    /* status bar colour: one meta per colour scheme; a manual theme sets both to that theme's background */
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", s.theme === "dark" ? THEME_BG.dark : s.theme === "light" ? THEME_BG.light : (metas[i].getAttribute("data-c") || THEME_BG.light));
  }
  var THEME_BG = { light: "#ece8fa", dark: "#17161f" }; // --bg in css/style.css
  function refreshChrome() {
    var s = Store.state, lv = Game.level(s.xp);
    var st = document.getElementById("chip-streak"); if (st) { st.innerHTML = "🔥 <b>" + Store.streak() + "</b>"; st.setAttribute("aria-label", "Streak: " + Store.streak() + " days"); }
    var xp = document.getElementById("chip-xp"); if (xp) { xp.innerHTML = "⭐ <b>" + s.xp + "</b>"; xp.setAttribute("aria-label", s.xp + " XP"); }
    var hc = document.getElementById("chip-heart"), nh = s.stats.hearts || 0;
    if (hc && !UI.heartsInFlight()) { hc.innerHTML = UI.heartIcon() + "<b>" + nh + "</b>"; hc.hidden = nh === 0; hc.setAttribute("aria-label", nh + " hearts earned, one for each correct answer"); } // "❤ 0" read like "no lives left"
    var lvEl = document.getElementById("chip-lv"); if (lvEl) lvEl.textContent = "Lv " + lv.n;
    var n = SRS.dueIds(WORDMAP).length, b = document.getElementById("due-badge");
    if (b) { b.textContent = n; b.hidden = n === 0; }
  }

  /* ---------- loading ---------- */
  /* Download all files in parallel but run them in order (async=false keeps insertion order). */
  function loadAll(files, quiet) {
    return Promise.all(files.map(function (f) {
      return new Promise(function (res) {
        var s = document.createElement("script");
        s.src = "data/" + f; s.async = false;
        s.onload = res;
        s.onerror = function () { if (!quiet) LOAD_ERRORS.push(f); s.remove(); res(); };
        document.head.appendChild(s);
      });
    }));
  }
  /* Lazy data. In the deployed build (window.CB_BUNDLED) the app starts from a light word index;
     dialogues, grammar, exercises and quizzes (data/full.js) and the mock exams (data/mocks.js) load on demand.
     In the source tree everything is loaded up front, so local testing is unchanged. */
  var BUNDLED = !!window.CB_BUNDLED, fullReady = !BUNDLED, mocksReady = false, fullP = null, mocksP = null;
  function ensureFull() {
    if (fullReady) return Promise.resolve();
    return fullP || (fullP = loadAll(["full.js"]).then(function () {
      var F = window.CB_FULL || {};
      Object.keys(F).forEach(function (n) { if (DAYMAP[n]) Object.assign(DAYMAP[n], F[n]); });
      var CX = window.CB_CORE_EX || {};
      Object.keys(CX).forEach(function (id) { if (WORDMAP[id]) WORDMAP[id].example = CX[id]; });
      fullReady = !!window.CB_FULL;
      if (!fullReady) fullP = null; // allow a retry later (e.g. offline before it was cached)
    }));
  }
  function ensureMocks() {
    if (mocksReady) return Promise.resolve();
    return mocksP || (mocksP = loadAll(BUNDLED ? ["mocks.js"] : (window.CB_MOCK_FILES || [])).then(function () {
      buildMockIndex();
      mocksReady = MOCK.length > 0;
      if (!mocksReady) mocksP = null;
    }));
  }
  /* Extra content, loaded only when the learner opens it (never on first load):
       HSK 5       data/hsk5/*   word packs, grammar, drills (one file, data/hsk5.<hash>.js, in the deployed build)
       HSK 4 extra data/hsk4x/*  91 more HSK 1-4 words, common phrases, word families, opposites (data/hsk4x.<hash>.js)
     The service worker keeps both for offline use once they were fetched. A failed load is not an error: a screen
     that needs the data says so, everything else carries on without it. */
  var H5_FILE = "hsk5.js", X4_FILE = "hsk4x.js"; // replaced with the hashed file names at build time
  var h5P = null, x4P = null, h5Tried = false, x4Tried = false, x4Want = false, x4Idx = null;
  function h5Loaded() { return (window.CB_HSK5 || []).length > 0 && (window.CB_HSK5_GRAMMAR || []).length > 0 && !!window.CB_HSK5_DRILLS; }
  function x4Loaded() { var X = window.CB_HSK4X || []; return X.length > 0 && (BUNDLED || X.length >= (window.CB_HSK4X_FILES || []).length); }
  function h5Wanted() { var st = Store.state.settings; return st.h5 === true || st.level === 5; }
  function x4Wanted() { if (!x4Want) x4Want = Object.keys(Store.state.srs).some(function (id) { return id.indexOf("x4-") === 0; }); return x4Want; }
  function h5Files() { var f = []; for (var i = 1; i <= 62; i++) f.push("hsk5/words" + (i < 10 ? "0" : "") + i + ".js"); return f.concat(["hsk5/grammar.js", "hsk5/drills.js"]); }
  /* The very first fetch can happen before the service worker controls the page, so store the file ourselves as well. */
  function keepOffline(file) {
    try {
      if (BUNDLED && window.caches && location.protocol.indexOf("http") === 0) caches.open("cb-packs").then(function (c) { return c.match("data/" + file).then(function (hit) { return hit || c.add("data/" + file); }); }).catch(function () { /* optional */ });
    } catch (e) { /* optional */ }
  }
  function packsReady() {
    buildIndex(); x4Idx = null; refreshChrome();
    if (window.Content) { try { Content.apply(); } catch (e) { /* fixes must never block loading */ } }
  }
  function ensureH5() {
    if (h5Loaded()) return Promise.resolve(true);
    return h5P || (h5P = loadAll(BUNDLED ? [H5_FILE] : h5Files(), true).then(function () {
      h5P = null; h5Tried = true;
      if (!h5Loaded()) return false;
      keepOffline(H5_FILE); packsReady(); return true;
    }));
  }
  function ensureX4() {
    if (x4Loaded()) return Promise.resolve(true);
    return x4P || (x4P = (BUNDLED ? loadAll([X4_FILE], true) : loadAll(["hsk4x/manifest.js"], true).then(function () { return loadAll((window.CB_HSK4X_FILES || []).map(function (f) { return "hsk4x/" + f; }), true); })).then(function () {
      x4P = null; x4Tried = true;
      if (!x4Loaded()) return false;
      keepOffline(X4_FILE); packsReady(); return true;
    }));
  }
  /* Word packs: "h5" = HSK 5 words (62 packs), "x4" = extra HSK 1-4 words missing from the lessons and decks (5 packs). */
  function packList(kind) {
    var l = kind === "h5" ? (window.CB_HSK5 || []) : (window.CB_HSK4X || []).filter(function (p) { return p.kind === "missing"; });
    return l.slice().sort(function (a, b) { return a.pack - b.pack; });
  }
  function packGet(kind, n) { return packList(kind).filter(function (p) { return p.pack === n; })[0] || null; }
  function packFromArg(arg) { var m = /^p-(h5|x4)-(\d{1,2})$/.exec(arg || ""); return m ? { kind: m[1], n: +m[2], pack: packGet(m[1], +m[2]) } : null; }
  function packName(kind) { return kind === "h5" ? "HSK 5 words" : "Extra HSK 4 words"; }
  function packHome(kind) { return kind === "h5" ? "#/learn/h5" : "#/learn/extra"; }
  function packRec(kind, n) { return (Store.state.packs || {})[kind + "-" + n] || null; }
  /* A pack is finished when its quiz was passed (8 of 10, or every question in a short pack). */
  function packDone(kind, n) { var r = packRec(kind, n); return !!r && r.b >= 8; }
  function packQuizDone(kind, n, score, total) {
    var s = Store.state, k = kind + "-" + n; if (!s.packs) s.packs = {};
    var r = s.packs[k] || (s.packs[k] = { b: 0, p: 0 });
    r.p++; r.b = Math.max(r.b, Math.round(score / Math.max(1, total) * 10)); Store.save();
  }

  /* Extra HSK 4 word resources by word id: common phrases (163 words), opposites (65 pairs), word families (61). */
  function x4Index() {
    if (x4Idx) return x4Idx;
    var idx = { col: {}, opp: {}, fam: [] };
    if (!x4Loaded()) return idx;
    window.CB_HSK4X.forEach(function (pk) {
      if (pk.kind === "collocations") pk.items.forEach(function (it) { idx.col[it.ref] = it; });
      else if (pk.kind === "opposites") pk.items.forEach(function (it) {
        (idx.opp[it.a.ref] || (idx.opp[it.a.ref] = [])).push({ me: it.a, other: it.b });
        (idx.opp[it.b.ref] || (idx.opp[it.b.ref] = [])).push({ me: it.b, other: it.a });
      });
      else if (pk.kind === "families") idx.fam = idx.fam.concat(pk.items);
    });
    return (x4Idx = idx);
  }
  function wordBtn(ref, hanzi) { return WORDMAP[ref] ? '<button type="button" class="linklike zh wlink" data-w="' + esc(ref) + '">' + esc(hanzi) + "</button>" : '<span class="zh">' + esc(hanzi) + "</span>"; }
  /* The blocks shown under a word: phrases it is commonly used in, and its opposite. "" until the data is loaded. */
  function wordExtras(w) {
    if (!w || !x4Loaded()) return "";
    var X = x4Index(), c = X.col[w.id], opp = X.opp[w.id] || [], html = "", have = {};
    (w.collocations || []).forEach(function (x) { have[x.zh] = 1; });
    var ph = c ? c.phrases.filter(function (x) { return !have[x.zh]; }) : [];
    if (ph.length) html += '<div class="wx-b"><h4 class="wx-h">Common phrases</h4>' + ph.map(function (x) {
      return '<div class="coll"><div><span class="zh">' + esc(x.zh) + "</span> " + PY(x.py) + '<div class="dim">' + M(x) + "</div></div>" + SAYX(x.zh) + "</div>";
    }).join("") + "</div>";
    opp.forEach(function (o) {
      html += '<div class="wx-b"><h4 class="wx-h">Opposite</h4><div class="coll"><div>' + wordBtn(o.other.ref, o.other.hanzi) + " " + PY(o.other.pinyin) + '<div class="dim">' + M(o.other) + "</div></div></div>" +
        '<details class="wx-d"><summary>Example for each</summary>' + [o.me, o.other].map(function (x) { return '<div class="wx-ex"><span class="zh">' + esc(x.example.zh) + "</span>" + PY(x.example.py) + '<div class="dim">' + M(x.example) + "</div></div>"; }).join("") + "</details></div>";
    });
    return html;
  }
  function fillExtras() {
    if (!document.querySelector("[data-wx]")) return;
    if (!x4Loaded() && x4Tried && navigator.onLine === false) return; // offline and not on the phone: the cards simply stay as they are
    ensureX4().then(function (ok) {
      if (!ok) return;
      [].forEach.call(document.querySelectorAll("[data-wx]"), function (el) { if (!el.firstChild) el.innerHTML = wordExtras(WORDMAP[el.getAttribute("data-wx")]); });
    });
  }

  /* What a screen still needs before it can be drawn: "full", "mocks", "h5", "x4". */
  function missing(v, parts) {
    var m = [], a = parts[1] || "", b = parts[2] || "";
    if (!fullReady && ((v === "day" && parts[2] && parts[2] !== "words") || v === "core" || v === "parts" || (v === "cards" && /^k/.test(parts[1] || "")) || (v === "game" && /^(builder|drill|type|confuse|order|picture|measure|bank|wordorder|reading)$/.test(parts[1] || "")) || v === "session" || v === "grammar" || v === "mistakes" || v === "weekly" || v === "catchup")) m.push("full");
    if (!mocksReady && (v === "mock" || v === "mistakes" || v === "session" || v === "exam" || v === "parts" || v === "games" || v === "sprint" || v === "newq" || (v === "game" && parts[1] === "reading"))) m.push("mocks");
    var hard5 = (v === "learn" && (a === "h5" || a === "h5p" || (!a && Store.state.settings.level === 5))) || (v === "pack" && a === "h5") || (v === "grammar" && /^h5/.test(a)) || (v === "game" && (b === "h5" || /^p-h5-/.test(b))) || (v === "cards" && /^p-h5-/.test(a));
    var hard4 = (v === "learn" && a === "extra") || (v === "pack" && a === "x4") || v === "families" || (v === "game" && /^p-x4-/.test(b)) || (v === "cards" && /^p-x4-/.test(a));
    /* screens that list or review words wait once for the packs this learner uses, so those words are there too */
    var soft = /^(review|search|listen-mode|mistakes|session|read)$/.test(v) || (v === "cards" && a === "all");
    if (!h5Loaded() && (hard5 || (soft && !h5Tried && h5Wanted()))) m.push("h5");
    if (!x4Loaded() && (hard4 || (soft && !x4Tried && x4Wanted()))) m.push("x4");
    return m;
  }
  function needs(v, parts) {
    return missing(v, parts).map(function (k) { return k === "full" ? ensureFull() : k === "mocks" ? ensureMocks() : k === "h5" ? ensureH5() : ensureX4(); });
  }
  function missingHTML(miss) {
    if (miss.indexOf("full") >= 0 || miss.indexOf("mocks") >= 0) return '<p class="warn">Couldn\'t load this part of the app. Check your connection and try again.</p>';
    var h5 = miss.indexOf("h5") >= 0;
    return (h5 ? levelSwitch(5) : "") + '<div class="card result" id="pack-miss">' + UI.mascot("think", 80) + "<h2>" + (h5 ? "HSK 5 is not on this phone yet" : "These extra words are not on this phone yet") + "</h2>" +
      '<p class="sub">Connect to the internet and open this screen once. After that it works offline.</p>' +
      '<div class="actions center"><button class="btn primary" id="miss-retry">Try again</button><a class="btn" href="#/">Home</a></div></div>';
  }
  function buildIndex() {
    DAYS = (window.CB_DAYS || []).slice().sort(function (a, b) { return a.day - b.day; });
    DAYMAP = {}; WORDS = []; WORDMAP = {};
    DAYS.forEach(function (d) {
      DAYMAP[d.day] = d;
      (d.words || []).forEach(function (w) { w._day = d.day; WORDS.push(w); WORDMAP[w.id] = w; });
    });
    // HSK 4 Core deck: general exam vocabulary, organised in sets of ~20
    CORE = (window.CB_CORE || []).slice().sort(function (a, b) { return a.set - b.set; }); COREMAP = {};
    CORE.forEach(function (set) {
      COREMAP[set.set] = set;
      set.words.forEach(function (w) { w._set = set.set; if (!w.level) w.level = "HSK4"; WORDS.push(w); WORDMAP[w.id] = w; });
    });
    // word packs loaded on demand (HSK 5, extra HSK 1-4 words): same ids in review, search and games as any other word
    ["x4", "h5"].forEach(function (kind) {
      packList(kind).forEach(function (pk) { pk.words.forEach(function (w) { w._pk = kind; w._pn = pk.pack; if (!WORDMAP[w.id]) { WORDS.push(w); WORDMAP[w.id] = w; } }); });
    });
    // the learner's own words
    (Store.state.custom || []).forEach(function (w) { w._mine = true; w.level = "Mine"; WORDS.push(w); WORDMAP[w.id] = w; });
    WORD_RE = null;
  }
  function wordHome(w) { return w._mine ? "#/learn/mine" : w._pk ? "#/pack/" + w._pk + "/" + w._pn : w._set ? "#/core/" + w._set : "#/day/" + w._day + "/words"; }
  function wordPlace(w) { return w._mine ? "My words" : w._pk ? (w._pk === "h5" ? "HSK 5 pack " : "Extra HSK 4 pack ") + w._pn : w._set ? (w._set > 100 ? "HSK 1–3 set F" + (w._set - 100) : "Core set " + w._set) : "Day " + w._day; }
  function nextCoreSet(track) {
    for (var i = 0; i < CORE.length; i++) if ((track === "found") === (CORE[i].track === "found") && CORE[i].words.some(function (w) { return !SRS.has(w.id); })) return CORE[i];
    return null;
  }

  /* ---------- router ---------- */
  var TITLES = { "": "Home", learn: "Learn", day: "Lesson", cards: "Flashcards", review: "Review", games: "Practice", game: "Practice", search: "Search", me: "Me", mock: "Mock Exam", parts: "Exam parts", sprint: "Exam words", newq: "New questions", exams: "My exams", eve: "Day before the exam", warmup: "Exam-morning warm-up", chat: "Messages", mistakes: "Mistakes", plan: "Study plan", progress: "Progress", core: "HSK words", check: "Quick check", "listen-mode": "Listen", session: "Today's session", grammar: "Grammar", official: "Official practice", fixes: "Content review", learners: "Learner tracking", exam: "Exam plan", track: "Pro track", talk: "Role-play", ready: "Am I ready?", read: "Reader", pack: "Word pack", families: "Word families", weekly: "Weekly review", catchup: "Catch-up" };
  var routed = 0;
  function route() {
    try { route0(); }
    catch (e) { crashNote(e && e.message, e && e.stack); crashScreen(e && e.message); }
  }
  function route0() {
    Audio2.stop(); Audio2.noise(0); setKeys(null); workDone = false; if (LM) { LM.stop(); LM = null; }
    try { weekTick(); } catch (e) { /* the weekly report must never block navigation */ }
    if (location.hash.indexOf("#/session") !== 0) sessionBar(null);
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var v = parts[0] || "";
    document.body.classList.remove("sim");
    if (EXAM && EXAM.strict && !EXAM.finished && !(v === "mock" && parseInt(parts[1], 10) === EXAM.id && /^(listening|reading|writing|result)$/.test(parts[2] || ""))) { // simulator: leaving (or going back to the intro) ends the attempt
      clearExamTimer(); EXAM = null; UI.toast("Simulator attempt ended", "🎯");
    }
    if (!(v === "mock" && parts[2] && !/^(result|review|sim)$/.test(parts[2]))) clearExamTimer();
    document.body.classList.toggle("on-tab", v === "" || v === "games" || v === "review" || v === "me" || (v === "learn" && !parts[1])); // hearts, 拼 and ⚑ only where they matter // leaving an exam pauses its clock
    var pending = needs(v, parts);
    if (pending.length) {
      var h = location.hash;
      render(skeleton());
      Promise.all(pending).then(function () {
        if (location.hash !== h) return;
        var miss = missing(v, parts);
        if (miss.length) { render(missingHTML(miss), "learn"); var rb = document.getElementById("miss-retry"); if (rb) rb.onclick = route; return; }
        route();
      });
      return;
    }
    if (window.Content) { try { Content.apply(); } catch (e) { /* fixes must never block navigation */ } }
    if (v === "day") viewDay(parseInt(parts[1], 10), parts[2] || "words");
    else if (v === "cards") viewCards(parts[1]);
    else if (v === "review") viewReview();
    else if (v === "games") Games.hub();
    else if (v === "game") Games.run(parts[1], parts[2]);
    else if (v === "quiz") { location.replace("#/game/quick"); return; }
    else if (v === "search") viewSearch();
    else if (v === "learn") viewLearn(parts[1]);
    else if (v === "core") viewCoreSet(parseInt(parts[1], 10));
    else if (v === "pack") viewPack(parts[1], parseInt(parts[2], 10));
    else if (v === "families") viewFamilies();
    else if (v === "check") viewQuickCheck(parseInt(parts[1], 10));
    else if (v === "listen-mode") viewListenMode();
    else if (v === "talk") viewTalk(parts[1]);
    else if (v === "session") viewSession(parts[1]);
    else if (v === "weekly") viewWeeklyQuiz();
    else if (v === "catchup") viewCatchup();
    else if (v === "grammar") { if (parts[1] === "h5") viewGrammarList(5); else if (parts[1]) viewGrammarPoint(parts[1], parts[2]); else viewGrammarList(4); }
    else if (v === "official") viewOfficial(parts[1]);
    else if (v === "me" || v === "settings") viewMe(parts[1]);
    else if (v === "reports") viewReports();
    else if (v === "fixes") viewFixes();
    else if (v === "learners") viewLearners(parts[1], parts[2]);
    else if (v === "chat") viewChat();
    else if (v === "track") viewTrack(parseInt(parts[1], 10) || 0, parseInt(parts[2], 10) || 0);
    else if (v === "mistakes") viewMistakes(parts[1]);
    else if (v === "parts") viewParts(parts[1]);
    else if (v === "sprint") viewSprint();
    else if (v === "newq") viewNewQ(parts[1]);
    else if (v === "exams") viewExams();
    else if (v === "eve") viewEve();
    else if (v === "warmup") viewWarmup();
    else if (v === "plan") viewPlan();
    else if (v === "exam") viewExamPlan();
    else if (v === "ready") viewReady();
    else if (v === "read") viewRead();
    else if (v === "progress") viewProgress();
    else if (v === "mock") {
      if (!parts[1]) viewMockList();
      else if (parts[2] === "result") viewMockResult(parts[1]);
      else if (parts[2] === "review") viewMockReview(parts[1]);
      else if (parts[2] === "sim") { var sm0 = MOCKMAP[parseInt(parts[1], 10)]; if (sm0) { clearExamTimer(); EXAM = null; viewSimPreflight(sm0.id, sm0); } else viewMockIntro(parts[1]); }
      else if (!parts[2]) viewMockIntro(parts[1]);
      else viewMockSection(parts[1], parts[2]);
    }
    else viewHome();
    fillExtras();
    /* which tab is lit: the tab a screen is reached from (mock tests and exam parts live in Practice, My exams in Me) */
    var tab = { "": "home", read: "games", ready: "home", day: "learn", cards: "learn", search: "learn", learn: "learn", review: "review", games: "games", game: "games", me: "me", settings: "me", reports: "me", fixes: "me", learners: "me", exam: "home", mock: "games", parts: "games", newq: "games", sprint: "games", chat: "me", mistakes: "review", plan: "home", progress: "me", core: "learn", check: "learn", pack: "learn", families: "learn", "listen-mode": "review", talk: "games", session: "home", grammar: "learn", official: "me", weekly: "learn", catchup: "home", quiz: "learn", track: "learn", exams: "me", eve: "home", warmup: "home" }[v] || "home";
    document.querySelectorAll(".tabbar a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-tab") === tab); });
    var title = TITLES[v] || "C&B 中文";
    document.getElementById("page-title").textContent = title;
    document.title = (TITLES[v] ? title + " · " : "") + "C&B 中文";
    app.setAttribute("aria-label", title);
    /* after a navigation (not the first paint) put keyboard and screen-reader focus on the new screen */
    if (routed++ && !topDialog() && !app.contains(document.activeElement)) { try { app.focus({ preventScroll: true }); } catch (e2) { /* old browser */ } }
    refreshChrome();
    var jump = pendingJump && document.getElementById("w-" + pendingJump);
    pendingJump = null;
    if (jump) { jump.scrollIntoView({ block: "center" }); jump.classList.add("flash"); }
    else window.scrollTo(0, 0);
  }

