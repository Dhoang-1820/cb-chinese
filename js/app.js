/* C&B 中文 — main app (vanilla JS, hash routing). Mobile-first, tuned for iPhone. */
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
  function levelBadge(l) {
    return l === "HSK4" ? '<span class="tag t-hsk">HSK 4</span>' : '<span class="tag t-dom">C&amp;B · beyond HSK 4</span>';
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
    b.classList.remove("lang-vi", "lang-en", "lang-both");
    b.classList.add("lang-" + s.lang);
    var py = document.getElementById("btn-py");
    if (py) py.setAttribute("aria-pressed", s.showPinyin ? "true" : "false");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", effectiveDark() ? "#15112a" : "#f6f3ff");
  }
  function effectiveDark() {
    var t = Store.state.settings.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function refreshChrome() {
    var s = Store.state, lv = Game.level(s.xp);
    var st = document.getElementById("chip-streak"); if (st) st.innerHTML = "🔥 <b>" + Store.streak() + "</b>";
    var xp = document.getElementById("chip-xp"); if (xp) xp.innerHTML = "⭐ <b>" + s.xp + "</b>";
    var lvEl = document.getElementById("chip-lv"); if (lvEl) lvEl.textContent = "Lv " + lv.n;
    var n = SRS.dueIds(WORDMAP).length, b = document.getElementById("due-badge");
    if (b) { b.textContent = n; b.hidden = n === 0; }
  }

  /* ---------- loading ---------- */
  /* Download all files in parallel but run them in order (async=false keeps insertion order). */
  function loadAll(files) {
    return Promise.all(files.map(function (f) {
      return new Promise(function (res) {
        var s = document.createElement("script");
        s.src = "data/" + f; s.async = false;
        s.onload = res;
        s.onerror = function () { LOAD_ERRORS.push(f); res(); };
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
  function needs(v, parts) {
    var n = [];
    if (!fullReady && ((v === "day" && parts[2] && parts[2] !== "words") || v === "core" || (v === "cards" && /^k/.test(parts[1] || "")) || (v === "game" && (parts[1] === "builder" || parts[1] === "drill" || parts[1] === "type")) || v === "mistakes")) n.push(ensureFull());
    if (!mocksReady && (v === "mock" || v === "mistakes")) n.push(ensureMocks());
    return n;
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
    WORD_RE = null;
  }
  function wordHome(w) { return w._set ? "#/core/" + w._set : "#/day/" + w._day + "/words"; }
  function wordPlace(w) { return w._set ? "Core set " + w._set : "Day " + w._day; }
  function nextCoreSet() {
    for (var i = 0; i < CORE.length; i++) if (CORE[i].words.some(function (w) { return !SRS.has(w.id); })) return CORE[i];
    return null;
  }

  /* ---------- router ---------- */
  var TITLES = { "": "Home", learn: "Learn", day: "Lesson", cards: "Flashcards", review: "Review", games: "Games", game: "Games", search: "Search", me: "Me", mock: "Mock Exam", mistakes: "Mistakes", plan: "Study plan", progress: "Progress", core: "HSK 4 Core" };
  function route() {
    Audio2.stop(); setKeys(null);
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var v = parts[0] || "";
    if (!(v === "mock" && parts[2] && parts[2] !== "result")) clearExamTimer(); // leaving an exam pauses its clock
    var pending = needs(v, parts);
    if (pending.length) {
      var h = location.hash;
      render('<p class="empty">Loading…</p>');
      Promise.all(pending).then(function () {
        if (location.hash !== h) return;
        if (needs(v, parts).length) { render('<p class="warn">Couldn\'t load this part of the app. Check your connection and try again.</p>'); return; }
        route();
      });
      return;
    }
    if (v === "day") viewDay(parseInt(parts[1], 10), parts[2] || "words");
    else if (v === "cards") viewCards(parts[1]);
    else if (v === "review") viewReview();
    else if (v === "games") Games.hub();
    else if (v === "game") Games.run(parts[1], parts[2]);
    else if (v === "quiz") { location.replace("#/game/quick"); return; }
    else if (v === "search") viewSearch();
    else if (v === "learn") viewLearn(parts[1]);
    else if (v === "core") viewCoreSet(parseInt(parts[1], 10));
    else if (v === "me" || v === "settings") viewMe();
    else if (v === "mistakes") viewMistakes(parts[1]);
    else if (v === "plan") viewPlan();
    else if (v === "progress") viewProgress();
    else if (v === "mock") {
      if (!parts[1]) viewMockList();
      else if (parts[2] === "result") viewMockResult(parts[1]);
      else if (!parts[2]) viewMockIntro(parts[1]);
      else viewMockSection(parts[1], parts[2]);
    }
    else viewHome();
    var tab = { "": "home", day: "learn", cards: "learn", search: "learn", learn: "learn", review: "review", games: "games", game: "games", me: "me", settings: "me", mock: "me", mistakes: "review", plan: "home", progress: "me", core: "learn" }[v] || "home";
    document.querySelectorAll(".tabbar a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-tab") === tab); });
    document.getElementById("page-title").textContent = TITLES[v] || "C&B 中文";
    refreshChrome();
    var jump = pendingJump && document.getElementById("w-" + pendingJump);
    pendingJump = null;
    if (jump) { jump.scrollIntoView({ block: "center" }); jump.classList.add("flash"); }
    else window.scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  function ring(pct, label, sub) {
    var r = 30, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, pct));
    return '<svg class="ring" viewBox="0 0 76 76" width="76" height="76"><circle cx="38" cy="38" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="38" cy="38" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '<text x="38" y="37" class="ring-t">' + label + '</text><text x="38" y="51" class="ring-s">' + sub + "</text></svg>";
  }
  function heatmap() {
    var t = Store.today(), dow = (new Date().getDay() + 6) % 7, start = Store.addDays(t, -(7 * 11 + dow)), log = Store.state.log, cells = "";
    for (var i = 0; i < 84; i++) {
      var d = Store.addDays(start, i), xp = log[d] || 0;
      var lv = d > t ? "f" : xp === 0 ? 0 : xp < 10 ? 1 : xp < 30 ? 2 : xp < 60 ? 3 : 4;
      cells += '<i class="h' + lv + '" title="' + d + ": " + xp + ' XP"></i>';
    }
    return '<div class="heat">' + cells + "</div>";
  }
  function viewHome() {
    var s = Store.state, lv = Game.level(s.xp), goal = s.settings.dailyGoal || 30, todayXP = s.log[Store.today()] || 0;
    var due = SRS.dueIds(WORDMAP).length, nd = nextDay(), exam = Store.daysBetween(Store.today(), s.settings.examDate || "2026-11-14");
    var ch = Games.challenge(), chDone = !!s.challenges[Store.today()];
    var earned = Game.BADGES.filter(function (b) { return s.badges[b.id]; });
    var html = "";
    if (isIOS && !standalone && location.protocol.indexOf("http") === 0 && !s.settings.installHintDismissed) {
      html += '<div class="install card"><div><b>Add to Home Screen</b><p>Tap <b>Share ⬆︎</b> in Chrome → <b>Add to Home Screen</b>. It opens full-screen, works offline and keeps your progress safe.</p></div><button class="x" id="hint-x" aria-label="Dismiss">✕</button></div>';
    }
    html += '<section class="hero card g-violet">' +
      '<div class="hero-top"><div class="bob">' + UI.mascot(todayXP >= goal ? "cheer" : "happy", 72) + "</div>" +
      '<div><p class="hi">' + (todayXP >= goal ? "Đạt mục tiêu hôm nay! 🎉" : "Chào bạn! 加油！") + '</p><p class="lv"><span class="zh">' + lv.zh + "</span> · " + lv.en + '</p><p class="lv-n">Level ' + lv.n + "</p></div></div>" +
      '<div class="xpbar"><span style="width:' + Math.round(lv.pct * 100) + '%"></span></div>' +
      '<p class="xp-t">' + s.xp + " XP" + (lv.next ? " · " + (lv.next - s.xp) + " to next level" : " · max level") + "</p></section>";
    html += '<section class="stats3">' +
      '<div class="card stat"><div class="big-ico flame">🔥</div><b>' + Store.streak() + '</b><span>day streak</span><small>🧊 ' + s.freezes + " freeze" + (s.freezes === 1 ? "" : "s") + "</small></div>" +
      '<div class="card stat">' + ring(todayXP / goal, todayXP, "/ " + goal + " XP") + "<span>daily goal</span></div>" +
      '<div class="card stat"><div class="big-ico">📅</div><b>' + (exam >= 0 ? exam : "✓") + "</b><span>" + (exam >= 0 ? "days to HSK 4" : "exam done") + "</span></div></section>";
    html += todayCard();
    html += '<a class="cta card g-coral" href="#/day/' + nd.day + '"><span class="cta-l"><small>Continue · Day ' + nd.day + '</small><b class="zh">' + esc(nd.title.zh) + "</b><em>" + M(nd.title) + '</em></span><span class="cta-go">▶</span></a>';
    html += '<a class="cta card g-teal" href="#/review"><span class="cta-l"><small>Spaced review</small><b>' + (due ? due + " word" + (due > 1 ? "s" : "") + " due" : "All caught up") + "</b><em>" + (due ? "Keep them fresh" : "Come back tomorrow") + '</em></span><span class="cta-go">🔁</span></a>';
    html += '<a class="cta card g-sun' + (chDone ? " done" : "") + '" href="#/game/' + ch.id + '"><span class="cta-l"><small>Daily challenge' + (chDone ? " · done ✓" : " · +15 XP bonus") + "</small><b>" + ch.icon + " " + ch.name + "</b><em>" + ch.desc + '</em></span><span class="cta-go">🎯</span></a>';
    var nMis = Learn.count();
    if (nMis) html += '<a class="cta card g-coral" href="#/mistakes"><span class="cta-l"><small>Mistake notebook</small><b>📒 ' + nMis + " to fix</b><em>Get each right twice to clear it</em></span><span class=\"cta-go\">▶</span></a>";
    html += '<a class="cta card g-boss" href="#/mock"><span class="cta-l"><small>HSK 4 practice</small><b>📝 Mock exams</b><em>3 full-format tests, timed like the real thing</em></span><span class="cta-go">▶</span></a>';
    html += '<section class="card"><div class="sec-h"><h2>Study activity</h2><span class="muted">12 weeks</span></div>' + heatmap() + '<div class="heat-key"><span>Less</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>More</span></div></section>';
    html += '<section class="card"><div class="sec-h"><h2>Badges</h2><a href="#/me">' + earned.length + "/" + Game.BADGES.length + " ›</a></div>" +
      (earned.length ? '<div class="badge-row">' + earned.slice(-6).reverse().map(function (b) { return '<span class="bdg" title="' + esc(b.en) + '">' + b.icon + "</span>"; }).join("") + "</div>" : '<p class="muted">Grade your first flashcard to earn 🌱</p>') + "</section>";
    if (LOAD_ERRORS.length) html += '<p class="warn">Could not load: ' + esc(LOAD_ERRORS.join(", ")) + "</p>";
    if (!Store.available) html += '<p class="warn">Storage is blocked, so progress won\'t be saved.</p>';
    render(html, "home");
    var x = document.getElementById("hint-x");
    if (x) x.onclick = function () { s.settings.installHintDismissed = true; Store.save(); x.closest(".install").remove(); };
  }

  /* ---------- learn (plan) ---------- */
  function learnSeg(which) {
    return '<nav class="seg"><a class="' + (which === "cb" ? "active" : "") + '" href="#/learn">C&amp;B lessons</a><a class="' + (which === "core" ? "active" : "") + '" href="#/learn/core">HSK 4 Core</a></nav>';
  }
  function viewCoreList() {
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search ' + WORDS.length + ' words — hanzi, pinyin, Việt, English</span></a>' + learnSeg("core") +
      '<section class="card g-blue"><h2>HSK 4 Core</h2><p class="sub">' + CORE.reduce(function (n, s) { return n + s.words.length; }, 0) +
      ' general HSK 4 words the exam expects — the ones not already in your C&amp;B lessons. Add a set to review, then flashcards and games take it from there.</p></section><div class="daygrid">';
    CORE.forEach(function (set) {
      var n = set.words.length, inSrs = set.words.filter(function (w) { return SRS.has(w.id); }).length;
      var strong = set.words.filter(function (w) { var c = SRS.get(w.id); return c && c.box >= 4; }).length, done = inSrs === n;
      html += '<a class="daycard card' + (done ? " done" : "") + '" href="#/core/' + set.set + '"><span class="dnum">' + (done ? "✓ " : "") + "Set " + set.set + '</span><span class="dzh zh">' +
        esc(set.words.slice(0, 3).map(function (w) { return w.hanzi; }).join(" · ")) + '</span><span class="dbar"><i style="width:' + Math.round(inSrs / n * 100) + '%"></i></span><span class="dmeta">' +
        inSrs + "/" + n + " in review" + (strong ? " · " + strong + " strong" : "") + "</span></a>";
    });
    render(html + "</div>", "learn");
  }
  function viewCoreSet(n) {
    var set = COREMAP[n];
    if (!set) { render('<p class="empty">Set not found. <a href="#/learn/core">Back</a></p>'); return; }
    var ws = set.words, notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length;
    var html = '<header class="dayhead card g-blue"><div class="dh-nav">' + (COREMAP[n - 1] ? '<a class="pill" href="#/core/' + (n - 1) + '">‹ ' + (n - 1) + "</a>" : '<a class="pill" href="#/learn/core">‹ All</a>') +
      '<span class="dh-day">HSK 4 Core</span>' + (COREMAP[n + 1] ? '<a class="pill" href="#/core/' + (n + 1) + '">' + (n + 1) + " ›</a>" : "<span></span>") + "</div>" +
      "<h1>Set " + n + '</h1><p class="sub">' + ws.length + " words</p></header>" +
      '<div class="actions"><a class="btn primary" href="#/cards/k' + n + '">🃏 Flashcards</a><a class="btn" href="#/game/quick/k' + n + '">❓ Quiz</a><a class="btn" href="#/game/write/k' + n + '">✍️ Write</a>' +
      (notIn ? '<button class="btn" id="add-all">＋ Add ' + notIn + " to review</button>" : '<span class="ok-text">✓ All in review</span>') + "</div>" +
      ws.map(wordCard).join("");
    render(html, "day");
    var add = document.getElementById("add-all");
    if (add) add.onclick = function () { SRS.addMany(ws.map(function (w) { return w.id; })); Game.award(5); UI.toast(notIn + " words added to review", "➕"); viewCoreSet(n); };
  }
  function viewLearn(sub) {
    if (sub === "core") return viewCoreList();
    var st = Store.state, plan = window.CB_PLAN || [];
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search ' + WORDS.length + ' words — hanzi, pinyin, Việt, English</span></a>' + learnSeg("cb");
    for (var w = 0; w < 6; w++) {
      var weekDays = plan.slice(w * 5, w * 5 + 5);
      html += '<h2 class="week-h"><span class="wk g' + (w % 6) + '">Week ' + (w + 1) + "</span></h2><div class=\"daygrid\">";
      weekDays.forEach(function (p) {
        var d = DAYMAP[p.day], rec = st.days[p.day] || {};
        var inner, meta;
        if (d) {
          var ws = dayWords(d), inSrs = ws.filter(function (x) { return SRS.has(x.id); }).length;
          var pct = p.type === "review" ? (rec.quizBest || 0) / 10 : inSrs / Math.max(1, ws.length);
          meta = (p.type === "review" ? "Review" : inSrs + "/" + ws.length + " words") + (rec.quizBest != null ? " · " + rec.quizBest + "/10" : "");
          inner = '<span class="dnum">' + (rec.completed ? "✓ " : "") + "Day " + p.day + '</span><span class="dzh zh">' + esc(p.zh) + '</span><span class="dmean">' + M(p) + '</span><span class="dbar"><i style="width:' + Math.round(pct * 100) + '%"></i></span><span class="dmeta">' + meta + "</span>";
          html += '<a class="daycard card' + (p.type === "review" ? " review" : "") + (rec.completed ? " done" : "") + '" href="#/day/' + p.day + '">' + inner + "</a>";
        } else {
          html += '<div class="daycard card locked"><span class="dnum">Day ' + p.day + '</span><span class="dzh zh">' + esc(p.zh) + '</span><span class="dmeta">Coming soon</span></div>';
        }
      });
      html += "</div>";
    }
    render(html, "learn");
  }

  /* ---------- day ---------- */
  function viewDay(n, tab) {
    var d = DAYMAP[n];
    if (!d) { render('<p class="empty">Day not available. <a href="#/learn">Back</a></p>'); return; }
    var rk = d.reading ? d.reading.kind : d._rk; // _rk/_g: flags from the light index before full data loads
    var tabs = [["words", "Words"], ["reading", rk === "passage" ? "Reading" : "Dialogue"]];
    if (d.grammar || d._g) tabs.push(["grammar", "Grammar"]);
    tabs.push(["practice", "Practice"], ["quiz", "Quiz"]);
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = "words";
    var html = '<header class="dayhead card g-w' + (Math.floor((n - 1) / 5) % 6) + '">' +
      '<div class="dh-nav">' + (DAYMAP[n - 1] ? '<a class="pill" href="#/day/' + (n - 1) + '">‹ ' + (n - 1) + "</a>" : "<span></span>") +
      '<span class="dh-day">Day ' + n + (d.type === "review" ? " · Review" : "") + "</span>" +
      (DAYMAP[n + 1] ? '<a class="pill" href="#/day/' + (n + 1) + '">' + (n + 1) + " ›</a>" : "<span></span>") + "</div>" +
      '<h1 class="zh">' + esc(d.title.zh) + '</h1><p class="sub">' + M(d.title) + "</p></header>" +
      '<nav class="seg" role="tablist">' + tabs.map(function (t) {
        return '<a role="tab" class="' + (t[0] === tab ? "active" : "") + '" href="#/day/' + n + "/" + t[0] + '">' + t[1] + "</a>";
      }).join("") + "</nav><section id=\"tabbody\"></section>";
    render(html, "day");
    var body = document.getElementById("tabbody");
    ({ words: tabWords, reading: tabReading, grammar: tabGrammar, practice: tabPractice, quiz: tabQuiz })[tab](d, body);
    var act = document.querySelector(".seg .active"); if (act && act.scrollIntoView) act.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function exHTML(w) {
    return w.example ? '<div class="w-ex"><div class="ex-zh"><span class="zh">' + esc(w.example.zh) + "</span>" + SAY(w.example.zh) + "</div>" + PY(w.example.py) + '<div class="tr">' + M(w.example) + "</div></div>" : "";
  }
  function wordCard(w) {
    return '<article class="word card" id="w-' + esc(w.id) + '">' +
      '<div class="w-top"><div><div class="hz">' + esc(w.hanzi) + "</div>" + PY(w.pinyin) + "</div>" + SAY(w.hanzi, null, true) + "</div>" +
      '<div class="w-mean">' + M(w) + "</div>" +
      '<div class="tags"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + boxBadge(w.id) + "</div>" +
      (w.note ? '<div class="w-note">💡 ' + M(w.note) + "</div>" : "") +
      '<div class="colls">' + (w.collocations || []).map(function (c) {
        return '<div class="coll"><div><span class="zh">' + esc(c.zh) + "</span> " + PY(c.py) + '<div class="dim">' + M(c) + "</div></div>" + SAY(c.zh) + "</div>";
      }).join("") + "</div>" +
      exHTML(w) + "</article>";
  }
  function tabWords(d, body) {
    var ws = dayWords(d), notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length;
    var html = '<div class="actions"><a class="btn primary" href="#/cards/' + d.day + '">🃏 Flashcards (' + ws.length + ")</a>" +
      '<a class="btn" href="#/game/write/' + d.day + '">✍️ Write</a>' +
      (notIn ? '<button class="btn" id="add-all">＋ Add ' + notIn + " to review</button>" : '<span class="ok-text">✓ All in review</span>') + "</div>";
    if (d.type === "review") {
      html += '<p class="sub">Words from days ' + esc((d.reviewOf || []).join(", ")) + ".</p>" +
        '<a class="cta card g-boss" href="#/game/boss/' + d.day + '"><span class="cta-l"><small>Review boss</small><b>🐉 Boss Battle</b><em>Beat the boss with these words</em></span><span class="cta-go">⚔️</span></a>' +
        '<div class="wlist card">' + ws.map(function (w) {
          return '<div class="wl-row"><div><span class="zh">' + esc(w.hanzi) + "</span> " + PY(w.pinyin) + '<div class="dim">' + M(w) + "</div></div>" + SAY(w.hanzi) + "</div>";
        }).join("") + "</div>";
    } else html += ws.map(wordCard).join("");
    body.innerHTML = html;
    var add = document.getElementById("add-all");
    if (add) add.onclick = function () { SRS.addMany(ws.map(function (w) { return w.id; })); UI.toast("Added to review — due today", "✅"); route(); };
  }

  function tabReading(d, body) {
    var r = d.reading;
    var first = r.lines[0] && r.lines[0].speaker;
    var html = '<div class="card reading-head"><h2 class="zh">' + esc(r.title.zh) + '</h2><p class="sub">' + M(r.title) + "</p>" +
      (r.scene ? '<p class="scene">' + M(r.scene) + "</p>" : "") +
      '<div class="actions"><button class="btn primary" id="play-all">▶ Play all</button><button class="btn" id="tog-tr" aria-pressed="false">Show translation</button></div></div>' +
      '<div class="chat" id="lines">' + r.lines.map(function (l) {
        var voice = l.speaker ? Audio2.voiceFor(l.speaker) : "F";
        if (!l.speaker) return '<div class="para card"><div class="zh">' + linkWords(l.zh) + SAY(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + "</div></div>";
        var side = l.speaker === first ? "left" : "right";
        return '<div class="msg ' + side + '"><div class="ava ' + (voice === "M" ? "m" : "f") + '">' + esc(l.speaker.charAt(0)) + '</div><div class="bubble"><div class="spk">' + esc(l.speaker) + "</div>" +
          '<div class="zh">' + linkWords(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + '</div><div class="b-say">' + SAY(l.zh, voice) + "</div></div></div>";
      }).join("") + "</div>";
    if (r.notes && r.notes.length) html += '<div class="card"><h3>Notes</h3>' + r.notes.map(function (n) {
      return '<div class="coll"><div><span class="zh">' + esc(n.zh) + "</span> " + PY(n.py) + '<div class="dim">' + M(n) + "</div></div>" + SAY(n.zh) + "</div>";
    }).join("") + "</div>";
    body.innerHTML = html;
    var lines = document.getElementById("lines");
    document.getElementById("tog-tr").onclick = function () {
      var on = lines.classList.toggle("show-tr");
      this.textContent = on ? "Hide translation" : "Show translation";
      this.setAttribute("aria-pressed", on);
    };
    document.getElementById("play-all").onclick = function () {
      Audio2.playAll(r.lines.map(function (l) { return { text: l.zh, voice: l.speaker ? Audio2.voiceFor(l.speaker) : "F" }; }));
    };
  }

  function tabGrammar(d, body) {
    var g = d.grammar;
    body.innerHTML = '<div class="card grammar"><div class="g-point"><span class="zh">' + esc(g.point) + "</span>" + PY(g.py) + "</div>" +
      '<p class="g-mean">' + M(g.meaning) + "</p>" +
      '<pre class="structure zh">' + esc(g.structure) + "</pre>" +
      '<p class="g-exp">' + M(g.explain) + "</p></div>" +
      '<h3 class="sec">Examples</h3>' + g.examples.map(function (e, i) {
        return '<div class="card ex"><span class="ex-n">' + (i + 1) + '</span><div class="ex-zh"><span class="zh">' + esc(e.zh) + "</span>" + SAY(e.zh) + "</div>" + PY(e.py) + '<div class="tr">' + M(e) + "</div></div>";
      }).join("");
  }

  /* ---------- practice ---------- */
  function tabPractice(d, body) {
    var ex = d.exercises || {};
    body.innerHTML =
      '<section class="card pr"><h2>🧩 Matching</h2><p class="sub">Tap a word, then its meaning.</p><div id="match"></div></section>' +
      (ex.fill && ex.fill.length ? '<section class="card pr"><h2>✍️ Fill in the blank</h2><p class="sub">Tap a blank, then a word from the bank.</p><div id="fill"></div></section>' : "") +
      (ex.translate && ex.translate.length ? '<section class="card pr"><h2>🌏 Translate</h2><p class="sub">Write it in Chinese, then compare.</p><div id="trans"></div></section>' : "");
    setupMatching(document.getElementById("match"), dayWords(d), d);
    if (ex.fill && ex.fill.length) setupFill(document.getElementById("fill"), ex.fill, d);
    if (ex.translate && ex.translate.length) setupTranslate(document.getElementById("trans"), ex.translate);
  }
  function setupMatching(el, words, d) {
    var pick, sel = null, matched = 0, awarded = false;
    function draw() {
      pick = shuffle(words).slice(0, Math.min(6, words.length)); matched = 0; sel = null;
      el.innerHTML = '<div class="match"><div class="mcol" data-side="L">' +
        shuffle(pick).map(function (w) { return '<button class="mbtn zh" data-id="' + esc(w.id) + '">' + esc(w.hanzi) + "</button>"; }).join("") +
        '</div><div class="mcol" data-side="R">' +
        shuffle(pick).map(function (w) { return '<button class="mbtn" data-id="' + esc(w.id) + '">' + M(w) + "</button>"; }).join("") +
        '</div></div><div class="mfoot"><span id="mstat">0/' + pick.length + '</span><button class="btn small" id="mreset">↻ New set</button></div>';
      el.querySelector("#mreset").onclick = draw;
    }
    el.onclick = function (e) {
      var b = e.target.closest(".mbtn");
      if (!b || b.disabled) return;
      var side = b.parentNode.getAttribute("data-side");
      if (!sel || sel.side === side) {
        if (sel) sel.el.classList.remove("sel");
        sel = { el: b, side: side }; b.classList.add("sel"); Audio2.sfx.tap(); return;
      }
      if (sel.el.getAttribute("data-id") === b.getAttribute("data-id")) {
        [sel.el, b].forEach(function (x) { x.classList.remove("sel"); x.classList.add("done"); x.disabled = true; });
        matched++; Audio2.sfx.good();
        el.querySelector("#mstat").textContent = matched + "/" + pick.length;
        if (matched === pick.length) {
          Store.day(d.day).practice.match = true;
          if (!awarded) { awarded = true; Game.award(5, rect(el)); } else Store.save();
          UI.confetti(50);
        }
      } else {
        var a = sel.el; a.classList.add("bad"); b.classList.add("bad"); Audio2.sfx.bad();
        setTimeout(function () { a.classList.remove("bad", "sel"); b.classList.remove("bad"); }, 450);
      }
      sel = null;
    };
    draw();
  }
  function setupFill(el, items, d) {
    var answers = items.map(function (it) { return it.answer; });
    var pool = dayWords(d).map(function (w) { return w.hanzi; }).filter(function (h) { return answers.indexOf(h) < 0; });
    var bank = shuffle(answers.concat(shuffle(pool).slice(0, Math.max(0, 10 - answers.length))));
    var active = 0, checked = false;
    el.innerHTML = '<ol class="fill">' + items.map(function (it, i) {
      var parts = it.zh.split("___");
      return '<li><div class="zh fill-s">' + esc(parts[0]) + '<button class="blank zh" data-i="' + i + '" aria-label="Blank ' + (i + 1) + '">　</button>' + esc(parts.slice(1).join("___")) + "</div>" +
        '<div class="tr">' + M(it) + '</div><div class="fb" id="fb' + i + '"></div></li>';
    }).join("") + '</ol><div class="bank sticky-bank">' + bank.map(function (b) { return '<button class="chip zh" type="button">' + esc(b) + "</button>"; }).join("") + "</div>" +
      '<div class="actions"><button class="btn primary" id="fcheck">Check</button><button class="btn" id="freset">Clear</button><span id="fscore" class="score"></span></div>';
    var blanks = el.querySelectorAll(".blank");
    function focus(i) { active = i; blanks.forEach(function (b, k) { b.classList.toggle("focus", k === i); }); }
    focus(0);
    blanks.forEach(function (b, i) { b.onclick = function () { if (b.dataset.v) { b.dataset.v = ""; b.textContent = "　"; b.classList.remove("ok", "no"); } focus(i); }; });
    el.querySelector(".bank").onclick = function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      var b = blanks[active]; b.dataset.v = c.textContent; b.textContent = c.textContent; b.classList.remove("ok", "no"); Audio2.sfx.tap();
      for (var k = 1; k <= blanks.length; k++) { var j = (active + k) % blanks.length; if (!blanks[j].dataset.v) { focus(j); return; } }
    };
    el.querySelector("#fcheck").onclick = function (ev) {
      var score = 0;
      blanks.forEach(function (b) {
        var i = +b.getAttribute("data-i"), ok = (b.dataset.v || "") === items[i].answer;
        b.classList.toggle("ok", ok); b.classList.toggle("no", !ok);
        document.getElementById("fb" + i).innerHTML = ok ? '<span class="good">✓ Correct</span>' : '<span class="bad-t">✗ Answer: <span class="zh">' + esc(items[i].answer) + "</span></span>";
        if (ok) score++;
      });
      el.querySelector("#fscore").textContent = score + "/" + items.length;
      if (score === items.length) Audio2.sfx.good({ quiet: true }); else Audio2.sfx.bad();
      var rec = Store.day(d.day).practice; rec.fill = Math.max(rec.fill || 0, score);
      if (!checked) { checked = true; Game.award(score, rect(ev.target)); } else Store.save();
    };
    el.querySelector("#freset").onclick = function () {
      blanks.forEach(function (b) { b.dataset.v = ""; b.textContent = "　"; b.classList.remove("ok", "no"); });
      el.querySelectorAll(".fb").forEach(function (f) { f.innerHTML = ""; });
      el.querySelector("#fscore").textContent = ""; focus(0);
    };
  }
  function setupTranslate(el, items) {
    var seen = {};
    el.innerHTML = '<ol class="trans">' + items.map(function (it, i) {
      return '<li><div class="prompt">' + M(it) + "</div>" +
        '<textarea class="zh" rows="2" placeholder="用中文写…" aria-label="Your translation ' + (i + 1) + '"></textarea>' +
        '<button class="btn small" data-show="' + i + '">Show answer</button>' +
        '<div class="model" id="model' + i + '" hidden><div class="ex-zh"><span class="zh">' + esc(it.zh) + "</span>" + SAY(it.zh) + "</div>" + PY(it.py) + "</div></li>";
    }).join("") + "</ol>";
    el.onclick = function (e) {
      var b = e.target.closest("[data-show]"); if (!b) return;
      var i = b.getAttribute("data-show"), m = document.getElementById("model" + i);
      m.hidden = !m.hidden; b.textContent = m.hidden ? "Show answer" : "Hide answer";
      if (!m.hidden && !seen[i]) { seen[i] = 1; Game.award(1, rect(b)); }
    };
  }

  /* ---------- day quiz: one question at a time ---------- */
  function optHTML(o) { return typeof o === "string" ? '<span class="zh">' + esc(o) + "</span>" : M(o); }
  function tabQuiz(d, body) {
    var qs = (d.quiz || []).map(function (q) { return { q: q, order: shuffle(q.options.map(function (_, k) { return k; })), chosen: null }; });
    var i = 0, score = 0, rec = Store.day(d.day);
    function draw() {
      if (i >= qs.length) return finish();
      var x = qs[i];
      body.innerHTML = '<div class="quizbox"><div class="qtop"><span>Question ' + (i + 1) + "/" + qs.length + '</span><span>⭐ ' + score + '</span></div><div class="bar"><span style="width:' + (i / qs.length * 100) + '%"></span></div>' +
        '<div class="card qcard" id="qcard"><p class="q zh">' + esc(x.q.q) + '</p><div class="opts">' +
        x.order.map(function (k, n) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[n] + "</span>" + optHTML(x.q.options[k]) + "</button>"; }).join("") +
        '</div><div id="qfb"></div></div></div>';
      body.querySelector(".opts").onclick = function (e) {
        var b = e.target.closest(".opt"); if (!b || x.chosen != null) return;
        x.chosen = +b.getAttribute("data-k");
        var ok = x.chosen === x.q.answer;
        Learn.record("q:" + d.day + ":" + (d.quiz || []).indexOf(x.q), { kind: "quiz", skill: "quiz", day: d.day, idx: (d.quiz || []).indexOf(x.q) }, ok);
        if (ok) { score++; Audio2.sfx.good(); } else { Audio2.sfx.bad(); UI.shake(document.getElementById("qcard")); }
        body.querySelectorAll(".opt").forEach(function (o) {
          var k = +o.getAttribute("data-k"); o.disabled = true;
          if (k === x.q.answer) o.classList.add("right"); else if (o === b) o.classList.add("wrong");
        });
        document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct! " : "✗ Answer: " + optHTML(x.q.options[x.q.answer]) + ". ") + (x.q.explain ? M(x.q.explain) : "") + "</div>" +
          '<button class="btn primary wide" id="qnext">' + (i + 1 < qs.length ? "Next ›" : "See results") + "</button>";
        document.getElementById("qnext").onclick = function () { i++; draw(); };
      };
    }
    function finish() {
      var first = rec.quizBest == null;
      rec.quizBest = Math.max(rec.quizBest || 0, score);
      if (score >= 7) { if (!rec.completed) rec.completedOn = Store.today(); rec.completed = true; }
      if (score === qs.length) Store.state.stats.perfectQuizzes++;
      var xp = score * 2 + (score === qs.length ? 10 : 0);
      var mood = score === qs.length ? "cheer" : score >= 7 ? "happy" : "sad";
      body.innerHTML = '<div class="card result">' + UI.mascot(mood, 96) + '<h2>' + score + " / " + qs.length + "</h2><p>" +
        (score >= 7 ? "Day " + d.day + " completed ✓" : "Get 7 or more to complete the day") + "</p>" +
        '<div class="actions center"><button class="btn primary" id="qretry">↻ Try again</button><a class="btn" href="#/learn">Back to plan</a></div></div>' +
        '<h3 class="sec">Answer key</h3><div class="card akey">' + qs.map(function (x, n) {
          var ok = x.chosen === x.q.answer;
          return '<div class="ak-row ' + (ok ? "ok" : "no") + '"><span class="ak-n">' + (n + 1) + '</span><div><div class="zh">' + esc(x.q.q) + '</div><div>' + (ok ? "✓ " : "✗ ") + optHTML(x.q.options[x.q.answer]) + "</div></div></div>";
        }).join("") + "</div>";
      if (score >= 7) UI.confetti(score === qs.length ? 150 : 80);
      window.scrollTo(0, 0);
      Game.award(xp);
      document.getElementById("qretry").onclick = function () { tabQuiz(d, body); window.scrollTo(0, 0); };
      void first;
    }
    setKeys(function (e) {
      if (typing(e)) return;
      if (/^[1-4]$/.test(e.key)) { var b = body.querySelectorAll(".opt")[+e.key - 1]; if (b && !b.disabled) b.click(); }
      else if (e.key === "Enter") { var n = document.getElementById("qnext"); if (n) n.click(); }
    });
    draw();
  }

  /* ---------- flashcards (3D flip + swipe) ---------- */
  function viewCards(arg) {
    var words, title, back;
    if (arg === "all") { words = WORDS; title = "All words"; back = "#/learn"; }
    else if (/^k\d+$/.test(arg || "")) {
      var cs = COREMAP[parseInt(arg.slice(1), 10)];
      if (!cs) { render('<p class="empty">Set not found.</p>'); return; }
      words = cs.words; title = "HSK 4 Core · Set " + cs.set; back = "#/core/" + cs.set;
    }
    else {
      var d = DAYMAP[parseInt(arg, 10)];
      if (!d) { render('<p class="empty">Day not found.</p>'); return; }
      words = dayWords(d); title = "Day " + d.day + " · " + d.title.zh; back = "#/day/" + d.day + "/words";
    }
    runDeck({ title: title, words: words, mode: "learn", back: back });
  }
  function runDeck(opts) {
    var queue = shuffle(opts.words), pos = 0, flipped = false, right = 0, wrong = 0, missed = [], requeued = {}, busy = false, deckHash = location.hash;
    function draw() {
      if (pos >= queue.length) return finish();
      var w = queue[pos]; flipped = false; busy = false;
      render('<div class="deck"><div class="deck-top"><a class="pill" href="' + opts.back + '">✕</a><span class="zh">' + esc(opts.title) + "</span><span>" + (pos + 1) + "/" + queue.length + "</span></div>" +
        '<div class="bar"><span style="width:' + Math.round(pos / queue.length * 100) + '%"></span></div>' +
        '<div class="stage"><div class="fcard" id="card"><div class="face front"><div class="hz big">' + esc(w.hanzi) + "</div>" + SAY(w.hanzi, null, true) +
        (requeued[w.id] ? '<p class="dim">practice again</p>' : '<p class="hint">Tap to flip</p>') + "</div>" +
        '<div class="face back"><div class="hz mid">' + esc(w.hanzi) + '</div><div class="big-py">' + esc(w.pinyin) + '</div><div class="w-mean">' + M(w) + "</div>" +
        '<div class="tags center"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + "</div>" +
        exHTML(w) +
        '</div></div><div class="swipe-l">Again</div><div class="swipe-r">Got it</div></div>' +
        '<div class="deck-btns" id="dbtns"><button class="btn primary wide" id="flip">Show answer</button></div>' +
        '<p class="hint center">After flipping: swipe → got it · ← again</p></div>', "deckview");
      var card = document.getElementById("card");
      card.addEventListener("click", function (e) { if (!e.target.closest(".say") && !card.dataset.dragged) flip(); card.dataset.dragged = ""; });
      document.getElementById("flip").onclick = flip;
      attachSwipe(card);
    }
    function flip() {
      if (flipped) return;
      flipped = true; Audio2.sfx.tap();
      document.getElementById("card").classList.add("flipped");
      document.getElementById("dbtns").innerHTML =
        '<button class="btn bad wide" id="again">✗ Again</button><button class="btn good wide" id="gotit">✓ Got it</button>';
      document.getElementById("again").onclick = function () { grade(false); };
      document.getElementById("gotit").onclick = function () { grade(true); };
    }
    function attachSwipe(card) {
      var sx = 0, dx = 0, dragging = false, stage = card.parentNode;
      card.addEventListener("pointerdown", function (e) { if (!flipped || busy) return; dragging = true; sx = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
      card.addEventListener("pointermove", function (e) {
        if (!dragging) return; dx = e.clientX - sx;
        if (Math.abs(dx) > 6) card.dataset.dragged = "1";
        card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 18 + "deg) rotateY(180deg)";
        stage.classList.toggle("go-r", dx > 60); stage.classList.toggle("go-l", dx < -60);
      });
      function end() {
        if (!dragging) return; dragging = false; card.style.transition = "";
        stage.classList.remove("go-r", "go-l");
        if (dx > 90) grade(true); else if (dx < -90) grade(false); else card.style.transform = "";
      }
      card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
    }
    function grade(ok) {
      if (busy) return; busy = true;
      var w = queue[pos], card = document.getElementById("card");
      var s = Store.state;
      if (ok) { var cr = card && card.getBoundingClientRect(); if (cr) UI.hearts(cr.left + cr.width / 2, cr.top + cr.height / 2, 6); }
      if (!requeued[w.id]) {
        SRS.grade(w.id, ok);
        s.stats.cards++; if (ok) { s.stats.correct++; right++; } else { wrong++; missed.push(w); }
        Game.award(ok ? 2 : 1, { silent: true });
      }
      if (!ok && opts.mode === "review" && !requeued[w.id]) { requeued[w.id] = true; queue.push(w); }
      if (ok) Audio2.sfx.good({ quiet: true }); else Audio2.sfx.bad(); // hearts already launched from the card above
      if (card) { card.style.transition = "transform .3s ease, opacity .3s"; card.style.transform = "translateX(" + (ok ? 120 : -120) + "vw) rotate(" + (ok ? 20 : -20) + "deg) rotateY(180deg)"; card.style.opacity = "0"; }
      UI.pop(ok ? "+2 XP" : "+1 XP", null, innerHeight * 0.3, ok ? "good" : "");
      setTimeout(function () { if (location.hash !== deckHash) return; pos++; draw(); }, UI.reduced ? 0 : 260); // don't redraw over a page the learner moved to
    }
    function finish() {
      setKeys(null);
      var mood = wrong === 0 ? "cheer" : right >= wrong ? "happy" : "wow";
      render('<div class="card result">' + UI.mascot(mood, 96) + "<h2>Session complete</h2>" +
        '<p class="big-score"><span class="good">' + right + ' ✓</span> · <span class="bad-t">' + wrong + " ✗</span></p>" +
        (opts.mode === "review" ? '<p class="sub">Missed cards went back to box 1. Correct cards moved up a box.</p>' : '<p class="sub">These words are now in your review deck.</p>') +
        '<div class="actions center">' + (missed.length ? '<button class="btn primary" id="again-missed">Study ' + missed.length + " missed</button>" : "") +
        '<a class="btn" href="' + opts.back + '">Done</a></div></div>');
      if (wrong === 0 && right > 0) UI.confetti(100);
      var am = document.getElementById("again-missed");
      if (am) am.onclick = function () { runDeck({ title: opts.title + " · missed", words: missed, mode: "learn", back: opts.back }); };
    }
    setKeys(function (e) {
      if (typing(e)) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!flipped) flip(); }
      else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) grade(false);
      else if (flipped && (e.key === "2" || e.key === "ArrowRight")) grade(true);
    });
    draw();
  }

  /* ---------- review ---------- */
  function mistakesCard() {
    var n = Learn.count();
    return n ? '<a class="cta card g-coral" href="#/mistakes"><span class="cta-l"><small>Mistake notebook</small><b>📒 ' + n + ' to fix</b><em>Weak areas &amp; targeted drills</em></span><span class="cta-go">▶</span></a>' :
      '<a class="cta card" href="#/mistakes"><span class="cta-l"><small>Mistake notebook</small><b>📒 No open mistakes</b><em>See your weak-area report</em></span><span class="cta-go">▶</span></a>';
  }
  function viewReview() {
    var ids = SRS.dueIds(WORDMAP), bc = SRS.boxCounts(), total = 0;
    Object.keys(bc).forEach(function (k) { total += bc[k]; });
    var max = Math.max(1, bc[1], bc[2], bc[3], bc[4], bc[5]);
    var boxes = '<div class="card boxes">' + [1, 2, 3, 4, 5].map(function (b) {
      return '<div class="box"><div class="bcol"><i class="b' + b + '" style="height:' + Math.max(6, bc[b] / max * 100) + '%"></i></div><b>' + bc[b] + '</b><span>Box ' + b + "</span><small>" + SRS.INTERVALS[b] + "d</small></div>";
    }).join("") + "</div>";
    if (!ids.length) {
      var nd = SRS.nextDue();
      render('<div class="card result">' + UI.mascot(total ? "cheer" : "wow", 88) + "<h2>" + (total ? "All caught up!" : "Nothing to review yet") + "</h2>" +
        '<p class="sub">' + (total ? (nd ? "Next review: " + esc(nd) : "") : "Study a day's flashcards to fill your deck.") + "</p></div>" + boxes + mistakesCard() +
        '<div class="actions center"><a class="btn primary" href="#/games">🎮 Play a game</a><a class="btn" href="#/learn">📚 Learn</a></div>', "review");
      return;
    }
    render('<div class="card result">' + UI.mascot("happy", 88) + "<h2>" + ids.length + " word" + (ids.length > 1 ? "s" : "") + " due</h2>" +
      '<p class="sub">✓ moves a card up a box · ✗ brings it back today · hard words return sooner</p><button class="btn primary wide" id="start">Start review</button></div>' + boxes + mistakesCard(), "review");
    document.getElementById("start").onclick = function () {
      runDeck({ title: "Review", words: ids.map(function (id) { return WORDMAP[id]; }), mode: "review", back: "#/review" });
    };
  }

  /* ---------- search ---------- */
  function viewSearch() {
    render('<input id="q" class="search" type="search" inputmode="search" placeholder="gongzi · lương · salary · 工资" value="' + esc(searchQuery) + '" autocomplete="off" autocapitalize="off" spellcheck="false"><div id="results"></div>', "search");
    var q = document.getElementById("q");
    q.oninput = function () { searchQuery = q.value; results(); };
    document.getElementById("results").onclick = function (e) { var a = e.target.closest("[data-jump]"); if (a) pendingJump = a.getAttribute("data-jump"); };
    if (!("ontouchstart" in window)) q.focus();
    results();
    function results() {
      var raw = searchQuery.trim(), out = document.getElementById("results");
      if (!raw) { out.innerHTML = '<p class="sub center">' + WORDS.length + " words · pinyin works with or without tones</p>"; return; }
      var nq = norm(raw);
      var hits = WORDS.filter(function (w) {
        if (w.hanzi.indexOf(raw) >= 0) return true;
        if ((w.collocations || []).some(function (c) { return c.zh.indexOf(raw) >= 0; })) return true;
        return [w.pinyin, w.vi, w.en].some(function (f) { return norm(f).indexOf(nq) >= 0; });
      });
      out.innerHTML = hits.length ? '<div class="card wlist">' + hits.slice(0, 100).map(function (w) {
        return '<div class="wl-row"><a href="' + wordHome(w) + '" data-jump="' + esc(w.id) + '"><span class="zh">' + esc(w.hanzi) + "</span> " + PY(w.pinyin) +
          '<div class="dim">' + M(w) + " · " + wordPlace(w) + "</div></a>" + SAY(w.hanzi) + "</div>";
      }).join("") + "</div>" : '<p class="empty">No results.</p>';
    }
  }

  /* ---------- me: profile, badges, settings ---------- */
  function viewMe() {
    var s = Store.state, set = s.settings, lv = Game.level(s.xp), bc = SRS.boxCounts();
    var inSrs = Object.keys(s.srs).length, done = Object.keys(s.days).filter(function (k) { return s.days[k].completed; }).length;
    var nAudio = Audio2.allFiles().length;
    var html = '<section class="card profile g-violet">' + UI.mascot("happy", 64) + '<div><p class="lv"><span class="zh">' + lv.zh + "</span> · " + lv.en + '</p><p class="lv-n">Level ' + lv.n + " · " + s.xp + " XP</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(lv.pct * 100) + '%"></span></div></div></section>' +
      '<section class="stats4">' +
      '<div class="card stat"><b>' + inSrs + '</b><span>words learned</span></div>' +
      '<div class="card stat"><b>' + bc[5] + '</b><span>mastered (box 5)</span></div>' +
      '<div class="card stat"><b>' + done + '/30</b><span>days done</span></div>' +
      '<div class="card stat"><b>' + (s.streak.best || 0) + '</b><span>best streak</span></div></section>' +
      '<a class="cta card g-teal" href="#/progress"><span class="cta-l"><b>📈 Progress charts</b><em>Mock scores, words learned, daily XP</em></span><span class="cta-go">▶</span></a>' +
      '<a class="cta card g-sun" href="#/plan"><span class="cta-l"><b>🗓️ Study plan</b><em>Your path to the exam date</em></span><span class="cta-go">▶</span></a>' +
      '<a class="cta card g-boss" href="#/mock"><span class="cta-l"><b>📝 Mock HSK 4 exams</b><em>' + (Object.keys(s.mocks).length ? "Best: " + Math.max.apply(null, Object.keys(s.mocks).map(function (k) { return num(s.mocks[k].best); })) + "/300" : "Not attempted yet") + '</em></span><span class="cta-go">▶</span></a>' +
      '<section class="card"><div class="sec-h"><h2>Badges</h2><span class="muted">' + Object.keys(s.badges).length + "/" + Game.BADGES.length + '</span></div><div class="badge-grid">' +
      Game.BADGES.map(function (b) {
        var got = s.badges[b.id];
        return '<div class="bg-item' + (got ? "" : " locked") + '"><span class="bdg">' + b.icon + '</span><b>' + M({ vi: b.vi, en: b.en }) + "</b><small>" + M({ vi: b.dvi, en: b.den }) + "</small></div>";
      }).join("") + "</div></section>" +
      '<section class="card settings"><h2>Settings</h2>' +
      row("Show pinyin", '<label class="switch"><input type="checkbox" id="s-py"' + (set.showPinyin ? " checked" : "") + "><i></i></label>") +
      row("Meanings", sel("s-lang", [["both", "Việt + English"], ["vi", "Tiếng Việt"], ["en", "English"]], set.lang)) +
      row("Theme", sel("s-theme", [["auto", "System"], ["light", "Light"], ["dark", "Dark"]], set.theme)) +
      row("Sound effects", '<label class="switch"><input type="checkbox" id="s-sfx"' + (set.sfx !== false ? " checked" : "") + "><i></i></label>") +
      row("Voice speed", sel("s-rate", [["0.75", "0.75×"], ["0.9", "0.9×"], ["1", "1×"], ["1.15", "1.15×"]], String(set.audioRate || 1))) +
      row("Daily goal", sel("s-goal", [["20", "20 XP · chill"], ["30", "30 XP · steady"], ["50", "50 XP · serious"], ["80", "80 XP · intense"]], String(set.dailyGoal || 30))) +
      row("Exam date", '<input type="date" id="s-exam" value="' + esc(set.examDate || "2026-11-14") + '">') +
      row("Test voice", '<button class="btn small" id="s-test">🔊 Play</button>') + "</section>" +
      '<section class="card settings"><h2>Offline & data</h2>' +
      row("Audio recordings", '<span class="muted">' + (nAudio ? nAudio + " files" : "not generated yet") + "</span>") +
      ("caches" in window && location.protocol.indexOf("http") === 0 ? row((nAudio ? "Download audio + stroke data" : "Download stroke data") + " for offline", '<button class="btn small" id="s-dl">⬇ Download</button>') : "") +
      row("Export progress", '<button class="btn small" id="s-exp">Export</button>') +
      row("Import progress", '<label class="btn small">Import<input type="file" id="s-imp" accept=".json,application/json" hidden></label>') +
      row("Reset progress", '<button class="btn small bad" id="s-reset">Reset</button>') + "</section>" +
      (isIOS && !standalone ? '<section class="card"><h2>Install on iPhone</h2><p class="sub">In Chrome, tap <b>Share ⬆︎</b> (address bar) → <b>Add to Home Screen</b>. The home-screen app opens full-screen, works offline, and iOS won\'t clear its progress. Export a backup now and then anyway.</p></section>' : "") +
      '<p class="sub center">' + DAYS.length + " days · " + WORDS.length + ' words · <a href="#/search">Search</a></p>' +
      '<p class="sub center">Version 1.1 · build ' + BUILD + "</p>";
    render(html, "me");
    function sv(k, v) { set[k] = v; Store.save(); applySettings(); }
    document.getElementById("s-py").onchange = function () { sv("showPinyin", this.checked); };
    document.getElementById("s-lang").onchange = function () { sv("lang", this.value); };
    document.getElementById("s-theme").onchange = function () { sv("theme", this.value); };
    document.getElementById("s-sfx").onchange = function () { sv("sfx", this.checked); if (this.checked) Audio2.sfx.good({ quiet: true }); };
    document.getElementById("s-rate").onchange = function () { sv("audioRate", parseFloat(this.value)); };
    document.getElementById("s-goal").onchange = function () { sv("dailyGoal", parseInt(this.value, 10)); };
    document.getElementById("s-exam").onchange = function () { if (this.value) sv("examDate", this.value); };
    document.getElementById("s-test").onclick = function () { Audio2.play("你好，这是薪酬福利中文。", "F"); };
    var dl = document.getElementById("s-dl");
    if (dl) dl.onclick = function () { downloadAudio(dl); };
    document.getElementById("s-exp").onclick = function () { Store.exportJSON(); };
    document.getElementById("s-imp").onchange = function () {
      var f = this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { Store.importJSON(r.result); applySettings(); UI.toast("Progress imported", "✅"); route(); } catch (e) { UI.toast("Import failed: " + e.message, "⚠️"); } };
      r.readAsText(f);
    };
    document.getElementById("s-reset").onclick = function () {
      if (confirm("Delete all progress, XP, badges and streak? Export first if you want a backup.")) { Store.reset(); applySettings(); UI.toast("Progress reset"); route(); }
    };
    function row(label, ctl) { return '<div class="row"><span>' + label + "</span>" + ctl + "</div>"; }
    function sel(id, opts, cur) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>"; }
  }
  function strokeFiles() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) { Array.from(w.hanzi).forEach(function (c) { if (/[\u3400-\u9fff]/.test(c) && !seen[c]) { seen[c] = 1; out.push("vendor/hanzi/" + encodeURIComponent(c) + ".json"); } }); });
    return out;
  }
  /* Save audio + handwriting stroke data for offline use. */
  function downloadAudio(btn) {
    var jobs = Audio2.allFiles().map(function (f) { return ["cb-audio", f]; })
      .concat(strokeFiles().map(function (f) { return ["cb-strokes", f]; }))
      .concat([["cb-strokes", "vendor/hanzi-writer.min.js"]]);
    var i = 0, done = 0, fail = 0, active = 0, total = jobs.length;
    btn.disabled = true;
    function next() {
      if (i >= total) {
        if (active === 0) { btn.textContent = "✓ " + done + " saved"; UI.toast("Saved for offline" + (fail ? " (" + fail + " failed)" : ""), "⬇"); }
        return;
      }
      var job = jobs[i++]; active++;
      caches.open(job[0]).then(function (cache) {
        return cache.match(job[1]).then(function (hit) { return hit || fetch(job[1]).then(function (r) { if (!r.ok) throw 0; return cache.put(job[1], r); }); });
      }).then(function () { done++; }, function () { fail++; }).then(function () {
        active--; btn.textContent = Math.round((done + fail) / total * 100) + "%"; next();
      });
    }
    for (var k = 0; k < 4; k++) next();
  }

  /* ---------- mock exam ---------- */
  var MOCK = [], MOCKMAP = {}, EXAM = null;
  var RESOURCES = [
    { name: "Study4 HSK 4 practice tests", url: "https://study4.com/tests/hsk-4/" },
    { name: "Official HSK sample papers (Hanban/CTI)", url: "http://www.chinesetest.cn/gosign.do?id=1&lid=0#" }
  ];
  function buildMockIndex() {
    MOCK = (window.CB_MOCK || []).slice().sort(function (a, b) { return a.id - b.id; });
    MOCKMAP = {}; MOCK.forEach(function (m) { MOCKMAP[m.id] = m; });
  }
  function clearExamTimer() { if (EXAM && EXAM.timer) { clearInterval(EXAM.timer); EXAM.timer = null; } }
  var SEC_ORDER = ["listening", "reading", "writing"];
  var SEC_LABEL = { listening: "Listening · 听力", reading: "Reading · 阅读", writing: "Writing · 书写" };
  var LETTERS = ["A", "B", "C", "D"];

  function num(x) { x = +x; return isFinite(x) ? Math.round(x) : 0; }
  function viewMockList() {
    var s = Store.state;
    var html = '<section class="card"><h2>Mock HSK 4 Exams</h2><p class="sub">Original questions in the real exam format &amp; proportions, shortened to about 40% length so you can finish one in ~30 minutes. Score is out of 300, same as the real test — 180+ is a pass.</p></section>';
    if (!MOCK.length) html += '<p class="warn">No mock exams loaded.</p>';
    MOCK.forEach(function (m) {
      var rec = s.mocks[m.id];
      html += '<a class="cta card' + (rec && rec.best >= 180 ? " g-teal" : " g-blue") + '" href="#/mock/' + m.id + '">' +
        '<span class="cta-l"><b>' + esc(m.title) + '</b><em>' + (rec ? "Best " + num(rec.best) + "/300 (" + num(rec.plays) + " attempt" + (rec.plays > 1 ? "s" : "") + ")" + (rec.best >= 180 ? " · Pass ✓" : "") : "Not attempted yet") + "</em></span><span class=\"cta-go\">▶</span></a>";
    });
    html += '<section class="card"><h2>More practice</h2><p class="sub">Want the real official questions too? These are legitimate free resources:</p>' +
      RESOURCES.map(function (r) { return '<a class="cta card" href="' + esc(r.url) + '" target="_blank" rel="noopener"><span class="cta-l"><b>' + esc(r.name) + "</b></span><span class=\"cta-go\">↗</span></a>"; }).join("") + "</section>";
    render(html, "mock");
  }

  function viewMockIntro(idStr) {
    var id = parseInt(idStr, 10), m = MOCKMAP[id];
    if (!m) { render('<p class="warn">Mock test not found.</p>'); return; }
    clearExamTimer(); EXAM = null;
    var lc = m.listening.p1.length + m.listening.p2.length + m.listening.p3.length;
    var rc = m.reading.p1.length + m.reading.p2.length + m.reading.p3.reduce(function (s, p) { return s + p.questions.length; }, 0);
    var wc = m.writing.p1.length + m.writing.p2.length;
    var html = '<section class="card g-blue"><h2>' + esc(m.title) + '</h2>' +
      '<div class="exam-secs">' +
      '<div class="exam-sec"><b>🎧 Listening</b><span>' + lc + ' questions · ~' + Math.round(m.listening.time / 60) + ' min</span></div>' +
      '<div class="exam-sec"><b>📖 Reading</b><span>' + rc + ' questions · ~' + Math.round(m.reading.time / 60) + ' min</span></div>' +
      '<div class="exam-sec"><b>✍️ Writing</b><span>' + wc + ' questions · ~' + Math.round(m.writing.time / 60) + ' min</span></div></div>' +
      '<p class="sub">Real HSK 4 has 100 questions over ~105 minutes, scored /300 (pass 180). This shortened mock keeps the same format, item types and proportions.</p></section>' +
      '<button class="btn primary big" id="m-practice">📝 Practice mode</button><p class="sub center">Instant feedback after each answer, no timer.</p>' +
      '<button class="btn big" id="m-exam" style="margin-top:10px">⏱ Exam mode</button><p class="sub center">Timed per section, no feedback until the end — like the real test.</p>';
    render(html, "mock");
    document.getElementById("m-practice").onclick = function () { startExam(id, "practice"); };
    document.getElementById("m-exam").onclick = function () { startExam(id, "exam"); };
  }

  function startExam(id, mode) {
    EXAM = { id: id, test: MOCKMAP[id], mode: mode, section: "listening", answers: {}, timer: null, finished: false, result: null };
    location.hash = "#/mock/" + id + "/listening";
  }

  function timerHTML(sec) { return '<div class="exam-timer"><span id="exam-timer">⏱ ' + fmtTime(sec) + '</span> · <span id="exam-count"></span></div>'; }
  function practiceBar() { return '<div class="exam-timer practice"><span>📝 Practice</span> · <span id="exam-count"></span></div>'; }
  function sectionIds(m, sec) {
    return mockItems(m).filter(function (x) { return x.it.id.charAt(0) === sec.charAt(0).toUpperCase(); }).map(function (x) { return x.it.id; });
  }
  function updateCount() {
    var el = document.getElementById("exam-count"); if (!el || !EXAM) return;
    var ids = sectionIds(EXAM.test, EXAM.section), n = ids.filter(function (id) { return EXAM.answers[id] !== undefined; }).length;
    el.textContent = n + "/" + ids.length + " answered";
  }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }

  /* Time left is kept per section, so leaving and coming back resumes the clock instead of resetting it. */
  function startTimer(seconds) {
    clearExamTimer();
    var ex = EXAM, sec = ex.section;
    if (!ex.left) ex.left = {};
    if (ex.left[sec] == null) ex.left[sec] = seconds;
    var end = Date.now() + ex.left[sec] * 1000;
    var me = setInterval(function () {
      if (EXAM !== ex || ex.timer !== me || ex.section !== sec || ex.finished) { clearInterval(me); return; }
      var left = (end - Date.now()) / 1000;
      ex.left[sec] = Math.max(0, left);
      var t = document.getElementById("exam-timer");
      if (t) t.textContent = "⏱ " + fmtTime(left);
      if (left <= 0) { clearExamTimer(); UI.toast("Time's up for this section", "⏱"); advanceSection(); }
    }, 500);
    ex.timer = me;
  }

  function mockOpt(itemId, idx, text, pos) {
    return '<button type="button" class="opt mc" data-item="' + esc(itemId) + '" data-idx="' + idx + '">' +
      '<b>' + LETTERS[pos == null ? idx : pos] + "</b> " + esc(text) + "</button>";
  }
  /* Options are shown in a random order (fixed for the attempt) so the key isn't guessable by position. */
  function mockOpts(it) {
    if (EXAM && !EXAM.order) EXAM.order = {};
    var ord = EXAM && EXAM.order[it.id];
    if (!ord) { ord = shuffle(it.options.map(function (_, k) { return k; })); if (EXAM) EXAM.order[it.id] = ord; }
    return ord.map(function (k, pos) { return mockOpt(it.id, k, it.options[k], pos); }).join("");
  }
  function orderOk(it, a) { return a === it.answer || (it.alt || []).indexOf(a) >= 0; }
  function markMC(itemId, chosen, correct, mode) {
    var group = document.querySelectorAll('[data-item="' + CSS.escape(itemId) + '"].mc, [data-item="' + CSS.escape(itemId) + '"].tf');
    group.forEach(function (b) {
      var v = b.dataset.idx !== undefined ? +b.dataset.idx : (b.dataset.val === "true");
      b.classList.toggle("picked", v === chosen);
      if (mode === "practice") { b.classList.toggle("good", v === correct); b.classList.toggle("bad", v === chosen && chosen !== correct); b.disabled = true; }
    });
    if (mode === "practice" && chosen === correct && !markMC.restoring) UI.hearts();
    updateCount();
  }

  function renderListeningHTML(m, mode) {
    var L = m.listening, i = 0, html = (mode === "exam" ? timerHTML(L.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Listen, then say whether the statement is True or False</h3>';
    L.p1.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + "</div>" + SAY(it.audio.text, it.audio.voice, true) +
        '<p class="statement">' + esc(it.statement) + '</p><div class="tf-btns">' +
        '<button type="button" class="opt tf" data-item="' + esc(it.id) + '" data-val="true">✔ True</button>' +
        '<button type="button" class="opt tf" data-item="' + esc(it.id) + '" data-val="false">✘ False</button></div></div>';
    });
    html += '<h3 class="exam-part">Part 2 · Listen to the dialogue, then answer</h3>';
    L.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><button type="button" class="btn small dlg-play" data-dlg="' + esc(it.id) + '">▶ Play dialogue</button>' +
        '<p class="statement">' + esc(it.question) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 3 · Listen to the longer passage, then answer</h3>';
    L.p3.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + "</div>" + SAY(it.audio.text, it.audio.voice, true) +
        '<p class="statement">' + esc(it.question) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    return html;
  }
  function wireListening(m, mode) {
    m.listening.p1.forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].tf').forEach(function (b) {
        b.onclick = function () { var v = b.dataset.val === "true"; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
    m.listening.p2.concat(m.listening.p3).forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].mc').forEach(function (b) {
        b.onclick = function () { var v = +b.dataset.idx; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
    m.listening.p2.forEach(function (it) {
      var btn = document.querySelector('[data-dlg="' + CSS.escape(it.id) + '"]');
      if (btn) btn.onclick = function () { Audio2.playAll(it.dialogue); };
    });
  }

  function renderReadingHTML(m, mode) {
    var R = m.reading, i = 0, html = (mode === "exam" ? timerHTML(R.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Choose the best word for the blank</h3>';
    R.p1.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><p class="statement">' + esc(it.sentence) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 2 · Choose the best word for the blank</h3>';
    R.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><p class="statement">' + esc(it.sentence) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 3 · Read the passage, then answer</h3>';
    R.p3.forEach(function (pg) {
      html += '<div class="card passage"><p>' + linkWords(pg.passage) + "</p></div>";
      pg.questions.forEach(function (q) {
        i++;
        html += '<div class="card q"><div class="qn">' + i + '</div><p class="statement">' + esc(q.q) + '</p><div class="opts">' + mockOpts(q) + "</div></div>";
      });
    });
    return html;
  }
  function wireReading(m, mode) {
    var all = m.reading.p1.concat(m.reading.p2).concat(m.reading.p3.reduce(function (s, p) { return s.concat(p.questions); }, []));
    all.forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].mc').forEach(function (b) {
        b.onclick = function () { var v = +b.dataset.idx; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
  }

  function renderWritingHTML(m, mode) {
    var W = m.writing, i = 0, html = (mode === "exam" ? timerHTML(W.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Tap the words in the right order</h3>';
    W.p1.forEach(function (it) {
      i++;
      html += '<div class="card q" data-w1="' + esc(it.id) + '"><div class="qn">' + i + '</div>' +
        '<div class="wans" id="wans-' + esc(it.id) + '"></div>' +
        '<div class="wpool" id="wpool-' + esc(it.id) + '"></div>' +
        '<button type="button" class="btn small" id="wreset-' + esc(it.id) + '">↺ Reset</button>' +
        (mode === "practice" ? '<span class="w1-check" id="wcheck-' + esc(it.id) + '"></span>' : "") + "</div>";
    });
    html += '<h3 class="exam-part">Part 2 · Write a sentence using the word and scene</h3>';
    W.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><p class="w2-scene">' + it.emoji + ' <b class="zh">' + esc(it.word) + '</b></p>' +
        '<textarea class="w2-input" id="w2-' + esc(it.id) + '" rows="2" placeholder="写一个句子…"></textarea>' +
        '<button type="button" class="btn small" id="w2show-' + esc(it.id) + '">Show a model answer</button>' +
        '<div class="w2-model" id="w2model-' + esc(it.id) + '" hidden></div></div>';
    });
    return html;
  }
  function wireWriting(m, mode) {
    if (!EXAM.w1) EXAM.w1 = {};
    m.writing.p1.forEach(function (it) {
      var st = EXAM.w1[it.id] || (EXAM.w1[it.id] = { pool: shuffle(it.tokens), used: [] }), pool = st.pool, used = st.used;
      function refresh() {
        document.getElementById("wans-" + it.id).innerHTML = used.map(function (t) { return '<span class="wtoken used">' + esc(t) + "</span>"; }).join("") || '<span class="wans-ph">Tap words below…</span>';
        document.getElementById("wpool-" + it.id).innerHTML = pool.map(function (t, idx) { return '<button type="button" class="wtoken" data-w="' + idx + '">' + esc(t) + "</button>"; }).join("");
        document.querySelectorAll('#wpool-' + CSS.escape(it.id) + ' .wtoken').forEach(function (b) {
          b.onclick = function () { var idx = +b.dataset.w; used.push(pool[idx]); pool.splice(idx, 1); EXAM.answers[it.id] = used.join(""); refresh(); check(); updateCount(); };
        });
      }
      function check() {
        var el = document.getElementById("wcheck-" + it.id);
        if (!el) return;
        if (!pool.length) el.innerHTML = orderOk(it, used.join("")) ? '<span class="good-t">✔ ' + esc(it.answer) + "</span>" : '<span class="bad-t">✘ Correct: ' + esc(it.answer) + "</span>";
        else el.innerHTML = "";
      }
      document.getElementById("wreset-" + it.id).onclick = function () { st.pool = pool = shuffle(it.tokens); st.used = used = []; delete EXAM.answers[it.id]; refresh(); check(); updateCount(); };
      check();
      refresh();
    });
    m.writing.p2.forEach(function (it) {
      document.getElementById("w2show-" + it.id).onclick = function () {
        var box = document.getElementById("w2model-" + it.id);
        box.hidden = false;
        box.innerHTML = '<p class="model-t">Model: <span class="zh">' + esc(it.sample) + '</span></p><div class="tf-btns">' +
          '<button type="button" class="btn small good-btn" data-w2ok="' + esc(it.id) + '">I got it ✔</button>' +
          '<button type="button" class="btn small bad-btn" data-w2no="' + esc(it.id) + '">Not quite ✘</button></div>';
        document.querySelector('[data-w2ok="' + CSS.escape(it.id) + '"]').onclick = function () { EXAM.answers[it.id] = 1; box.querySelector(".tf-btns").innerHTML = "<b>Marked ✔</b>"; updateCount(); };
        document.querySelector('[data-w2no="' + CSS.escape(it.id) + '"]').onclick = function () { EXAM.answers[it.id] = 0; box.querySelector(".tf-btns").innerHTML = "<b>Marked ✘</b>"; updateCount(); };
      };
    });
  }

  function viewMockSection(idStr, section) {
    var id = parseInt(idStr, 10);
    if (!EXAM || EXAM.id !== id || EXAM.finished || SEC_ORDER.indexOf(section) < 0) { location.replace("#/mock/" + idStr); return; }
    if (SEC_ORDER.indexOf(section) < SEC_ORDER.indexOf(EXAM.section)) { location.replace("#/mock/" + id + "/" + EXAM.section); return; } // finished sections stay closed
    if (EXAM.mode === "exam" && EXAM.left && EXAM.left[section] === 0) { advanceSection(); return; }
    EXAM.section = section;
    var m = EXAM.test, mode = EXAM.mode;
    var body = section === "listening" ? renderListeningHTML(m, mode) : section === "reading" ? renderReadingHTML(m, mode) : renderWritingHTML(m, mode);
    var isLast = section === SEC_ORDER[SEC_ORDER.length - 1];
    var html = '<section class="card exam-head"><b>' + esc(m.title) + "</b><span>" + SEC_LABEL[section] + "</span></section>" + body +
      '<button class="btn primary big" id="m-next">' + (isLast ? "✅ Finish exam" : "Next section ▶") + "</button>";
    render(html, "mock");
    if (section === "listening") wireListening(m, mode); else if (section === "reading") wireReading(m, mode); else wireWriting(m, mode);
    markMC.restoring = true;
    mockItems(m).forEach(function (x) { // restore earlier picks after a re-render
      var a = EXAM.answers[x.it.id];
      if (a !== undefined && (x.kind === "tf" || x.kind === "dlg" || x.kind === "aud" || x.kind === "sent" || x.kind === "pass")) markMC(x.it.id, a, x.it.answer, mode);
    });
    markMC.restoring = false;
    document.getElementById("m-next").onclick = function () {
      var ids = sectionIds(m, section), left = ids.filter(function (id) { return EXAM.answers[id] === undefined; }).length;
      if (left && !window.confirm(left + " question" + (left > 1 ? "s are" : " is") + " unanswered. " + (isLast ? "Finish the exam anyway?" : "Go to the next section anyway?"))) return;
      clearExamTimer(); advanceSection();
    };
    updateCount();
    if (mode === "exam") startTimer(m[section].time);
  }

  function advanceSection() {
    if (!EXAM || EXAM.finished) return;
    var idx = SEC_ORDER.indexOf(EXAM.section);
    if (idx < SEC_ORDER.length - 1) location.hash = "#/mock/" + EXAM.id + "/" + SEC_ORDER[idx + 1];
    else finishExam();
  }

  function scoreExam() {
    var t = EXAM.test, ans = EXAM.answers;
    function tally(items, get) { var c = 0; items.forEach(function (it) { if (get(it)) c++; }); return c; }
    var lt = t.listening.p1.length + t.listening.p2.length + t.listening.p3.length;
    var lc = tally(t.listening.p1, function (it) { return ans[it.id] === it.answer; }) +
      tally(t.listening.p2, function (it) { return ans[it.id] === it.answer; }) +
      tally(t.listening.p3, function (it) { return ans[it.id] === it.answer; });
    var rItems = t.reading.p1.concat(t.reading.p2).concat(t.reading.p3.reduce(function (s, p) { return s.concat(p.questions); }, []));
    var rt = rItems.length, rc = tally(rItems, function (it) { return ans[it.id] === it.answer; });
    var wt = t.writing.p1.length + t.writing.p2.length;
    var wc = tally(t.writing.p1, function (it) { return orderOk(it, ans[it.id]); }) + tally(t.writing.p2, function (it) { return ans[it.id] === 1; });
    var lS = Math.round(lc / lt * 100), rS = Math.round(rc / rt * 100), wS = Math.round(wc / wt * 100);
    return { listening: { score: lS, correct: lc, total: lt }, reading: { score: rS, correct: rc, total: rt }, writing: { score: wS, correct: wc, total: wt }, total: lS + rS + wS, pass: (lS + rS + wS) >= 180 };
  }

  var MOCK_SKILL = { L1: "listen-tf", L2: "listen-short", L3: "listen-long", R1: "fill-word", R2: "connectors", R3: "passage", W1: "word-order", W2: "writing" };
  function mockItems(m) {
    var out = [];
    m.listening.p1.forEach(function (it) { out.push({ it: it, kind: "tf" }); });
    m.listening.p2.forEach(function (it) { out.push({ it: it, kind: "dlg" }); });
    m.listening.p3.forEach(function (it) { out.push({ it: it, kind: "aud" }); });
    m.reading.p1.concat(m.reading.p2).forEach(function (it) { out.push({ it: it, kind: "sent" }); });
    m.reading.p3.forEach(function (pg) { pg.questions.forEach(function (q) { out.push({ it: q, kind: "pass", passage: pg.passage }); }); });
    m.writing.p1.forEach(function (it) { out.push({ it: it, kind: "order" }); });
    m.writing.p2.forEach(function (it) { out.push({ it: it, kind: "write" }); });
    out.forEach(function (x) { x.skill = MOCK_SKILL[x.it.id.split("-")[0]]; });
    return out;
  }
  function mockCorrect(x, a) { return x.kind === "write" ? a === 1 : x.kind === "order" ? orderOk(x.it, a) : a === x.it.answer; }
  function recordMock() {
    var per = {};
    mockItems(EXAM.test).forEach(function (x) {
      var a = EXAM.answers[x.it.id];
      if (a === undefined) return; // unanswered: not counted as a skill mistake
      var ok = mockCorrect(x, a);
      Learn.record("m:" + EXAM.id + ":" + x.it.id, { kind: "mock", skill: x.skill, mock: EXAM.id, item: x.it.id }, ok);
      var p = per[x.skill] || (per[x.skill] = { r: 0, n: 0 }); p.n++; if (ok) p.r++;
    });
    return per;
  }
  function finishExam() {
    if (!EXAM || EXAM.finished) return;
    clearExamTimer();
    var result = scoreExam();
    result.skills = recordMock();
    EXAM.result = result; EXAM.finished = true;
    Store.state.mockHistory.push({ id: EXAM.id, date: Store.today(), mode: EXAM.mode, total: result.total,
      sections: { listening: result.listening.score, reading: result.reading.score, writing: result.writing.score } });
    var s = Store.state, rec = s.mocks[EXAM.id] || { best: 0, plays: 0 };
    rec.plays = (rec.plays || 0) + 1; rec.lastScore = result.total;
    rec.lastSections = { listening: result.listening.score, reading: result.reading.score, writing: result.writing.score };
    if (result.total > (rec.best || 0)) rec.best = result.total;
    s.mocks[EXAM.id] = rec; Store.save();
    location.hash = "#/mock/" + EXAM.id + "/result";
  }

  function secBar(label, sc) {
    sc = Math.max(0, Math.min(100, num(sc)));
    return '<div class="score-row"><span>' + label + "</span><div class=\"score-bar\"><span style=\"width:" + sc + "%\"></span></div><b>" + sc + "/100</b></div>";
  }
  function viewMockResult(idStr) {
    var id = parseInt(idStr, 10);
    if (!EXAM || EXAM.id !== id || !EXAM.finished) {
      var rec = Store.state.mocks[id];
      if (!rec) { location.replace("#/mock/" + idStr); return; }
      render('<section class="card ' + (rec.best >= 180 ? "g-teal" : "g-coral") + '"><h2>' + esc((MOCKMAP[id] || {}).title || "Mock test") + '</h2><p class="score-big">' + num(rec.lastScore) + "/300</p>" +
        '<p>' + (rec.lastSections ? secBar("Listening", rec.lastSections.listening) + secBar("Reading", rec.lastSections.reading) + secBar("Writing", rec.lastSections.writing) : "") +
        '</p><p class="sub">Best so far: ' + num(rec.best) + "/300 over " + num(rec.plays) + " attempt" + (rec.plays > 1 ? "s" : "") + '.</p></section>' +
        '<a class="btn primary big" href="#/mock/' + id + '">Try again</a><a class="btn big" href="#/mock" style="margin-top:10px">All mock exams</a>', "mock");
      return;
    }
    var r = EXAM.result, pass = r.pass;
    var xp = Math.round(r.total / 300 * 40);
    if (!EXAM.awarded) { EXAM.awarded = true; Game.award(xp, { silent: true }); if (pass) UI.confetti(150); }
    var html = '<section class="card ' + (pass ? "g-teal" : "g-coral") + '">' + UI.mascot(pass ? "cheer" : "wow", 64) +
      '<h2>' + (pass ? "Pass! 🎉" : "Keep practicing") + '</h2><p class="score-big">' + r.total + "/300</p>" +
      "<p>" + secBar("Listening", r.listening.score) + secBar("Reading", r.reading.score) + secBar("Writing", r.writing.score) + "</p>" +
      '<p class="sub">Real HSK 4 passing score is 180/300. +' + xp + " XP earned.</p></section>" + weakHTML(r.skills) +
      '<a class="btn primary big" href="#/mock/' + id + '">Try again</a><a class="btn big" href="#/mock" style="margin-top:10px">All mock exams</a>';
    render(html, "mock");
  }

  /* ---------- mistake notebook, weak areas & targeted drills ---------- */
  var SKILL_LINK = { typing: "#/game/type", handwriting: "#/game/write", vocab: "#/review", pinyin: "#/game/race", "listen-word": "#/game/listen", "word-order": "#/game/builder", "listen-sentence": "#/game/drill" };
  function skillName(k) { var i = Learn.SKILLS[k]; return i ? i.icon + " " + esc(Store.state.settings.lang === "vi" ? i.vi : i.en) : esc(k); }
  function accBar(acc) {
    var pct = Math.round(acc * 100), cls = pct >= 80 ? "hi" : pct >= 60 ? "mid" : "lo";
    return '<div class="acc"><div class="acc-bar ' + cls + '"><span style="width:' + pct + '%"></span></div><b>' + pct + "%</b></div>";
  }
  function practiceLink(k) {
    return Learn.count(k) ? '<a class="btn small primary" href="#/mistakes/' + k + '">Practice ' + Learn.count(k) + "</a>" :
      SKILL_LINK[k] ? '<a class="btn small" href="' + SKILL_LINK[k] + '">Practice</a>' : '<a class="btn small" href="#/mock">Mock exam</a>';
  }
  /* weak areas for one mock attempt: skills → {r, n} */
  function weakHTML(per) {
    if (!per) return "";
    var rows = Object.keys(per).map(function (k) { return { k: k, acc: per[k].r / per[k].n, n: per[k].n }; })
      .sort(function (a, b) { return a.acc - b.acc; });
    if (!rows.length) return "";
    var weak = rows.filter(function (x) { return x.acc < 0.8; }).slice(0, 2);
    return '<section class="card"><h2>Skills in this test</h2>' + rows.map(function (x) {
      return '<div class="sk-row"><span class="sk-n">' + skillName(x.k) + "</span>" + accBar(x.acc) + "</div>";
    }).join("") +
      (weak.length ? '<h3 class="sec">Focus next</h3>' + weak.map(function (x) {
        return '<div class="focus"><b>' + skillName(x.k) + '</b><p class="sub">' + esc(Learn.SKILLS[x.k].tip) + "</p>" + practiceLink(x.k) + "</div>";
      }).join("") : '<p class="sub">No weak areas in this test — great work.</p>') + "</section>";
  }

  function viewMistakes(skill) {
    if (skill) {
      if (skill !== "all" && !Learn.SKILLS[skill]) { location.replace("#/mistakes"); return; }
      return runMistakeDrill(skill);
    }
    var rep = Learn.report(3), all = Learn.list();
    var bySkill = {};
    all.forEach(function (x) { if (Learn.SKILLS[x.skill]) bySkill[x.skill] = (bySkill[x.skill] || 0) + 1; });
    var html = '<section class="card g-coral"><h2>📒 Mistake notebook</h2><p class="sub">Every wrong answer from quizzes, games and mock exams lands here. Get it right ' + Learn.CLEAR_AFTER + " times in a row to clear it.</p>" +
      '<p class="score-big">' + all.length + "</p>" + (all.length ? '<a class="btn big" id="mis-all" href="#/mistakes/all">▶ Drill all mistakes</a>' : "") + "</section>";
    if (all.length) {
      html += '<section class="card"><h2>Open mistakes by skill</h2>' + Object.keys(bySkill).sort(function (a, b) { return bySkill[b] - bySkill[a]; }).map(function (k) {
        return '<div class="sk-row"><span class="sk-n">' + skillName(k) + '</span><a class="btn small primary" href="#/mistakes/' + k + '">' + bySkill[k] + " ▶</a></div>";
      }).join("") + "</section>";
    }
    html += '<section class="card"><h2>Weak-area report</h2>' + (rep.length ? '<p class="sub">Accuracy across all your answers, weakest first.</p>' + rep.map(function (x) {
      return '<div class="sk-block"><div class="sk-row"><span class="sk-n">' + skillName(x.skill) + "</span>" + accBar(x.acc) + "</div>" +
        (x.acc < 0.8 ? '<p class="sub">' + esc(x.info.tip) + "</p>" + practiceLink(x.skill) : "") + "</div>";
    }).join("") : '<p class="sub">Answer a few quizzes, games or a mock exam to see your report.</p>') + "</section>";
    render(html, "review");
  }

  function findMockItem(mockId, itemId) {
    var m = MOCKMAP[mockId]; if (!m) return null;
    var x = mockItems(m).filter(function (y) { return y.it.id === itemId; })[0];
    return x || null;
  }

  /* Render one notebook item as a question. Returns { html, wire(done) } or null if its source is gone. */
  function mistakeQ(e) {
    if (e.kind === "word") {
      var w = WORDMAP[e.id]; if (!w) return null;
      var types = e.skill === "pinyin" ? ["h2p"] : e.skill === "listen-word" ? ["aud"] : ["h2m", "m2h"];
      var q = Games._q.makeQ(w, types);
      return { html: Games._q.qHTML(q), wire: function (done) { Games._q.wireQ(q, done); } };
    }
    if (e.kind === "quiz") {
      var d = DAYMAP[e.day], qq = d && d.quiz && d.quiz[e.idx]; if (!qq) return null;
      var order = shuffle(qq.options.map(function (_, k) { return k; }));
      return { html: '<div class="card qcard" id="qcard"><p class="sub">Day ' + e.day + ' quiz</p><p class="q zh">' + esc(qq.q) + '</p><div class="opts">' +
          order.map(function (k, n) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[n] + "</span>" + optHTML(qq.options[k]) + "</button>"; }).join("") + '</div><div id="qfb"></div></div>',
        wire: function (done) { wireMC(qq.answer, function (ok) { Learn.record(e.key, e, ok); return (qq.explain ? M(qq.explain) : ""); }, done); } };
    }
    if (e.kind === "mock") {
      var x = findMockItem(e.mock, e.item); if (!x) return null;
      return mockDrillQ(x, e);
    }
    if (e.kind === "order") {
      var parts = shuffle(e.parts.map(function (_, k) { return k; }));
      return orderQ(e.parts, parts, e.core, e.end || "", e, (e.py ? PY(e.py) : "") + '<div class="tr">' + M(e) + "</div>");
    }
    if (e.kind === "type") {
      var tcb = null, tc = Games._typeCard(e, function (ok) { tcb(ok); });
      return { html: tc.html, wire: function (done) { tcb = done; tc.wire(); } };
    }
    if (e.kind === "ls") {
      var cb = null, c = Games._drillCard(e, function (ok) { cb(ok); });
      return { html: c.html, wire: function (done) { cb = done; c.wire(); } };
    }
    return null;
  }
  /* generic multiple choice wiring on the rendered .opts (data-k = option index) */
  function wireMC(answer, onGrade, done) {
    var answered = false;
    document.querySelector(".opts").onclick = function (ev) {
      var b = ev.target.closest(".opt"); if (!b || answered) return;
      answered = true;
      var k = b.getAttribute("data-k"), ok = String(k) === String(answer);
      document.querySelectorAll(".opts .opt").forEach(function (o) {
        o.disabled = true;
        if (String(o.getAttribute("data-k")) === String(answer)) o.classList.add("right"); else if (o === b) o.classList.add("wrong");
      });
      (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
      if (!ok) UI.shake(document.getElementById("qcard"));
      var extra = onGrade(ok) || "";
      document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct!" : "✗ Not quite.") + " " + extra + "</div>" +
        '<button class="btn primary wide" id="qnext">Next ›</button>';
      document.getElementById("qnext").onclick = function () { done(ok); };
    };
  }
  function orderQ(parts, order, core, end, e, reveal, alts) {
    return { html: '<div class="card bcard" id="qcard"><p class="sub">Tap the pieces in the right order</p><div class="answer" id="ans"><span class="ph">Your sentence…</span></div>' +
        '<div class="pool" id="pool">' + order.map(function (k) { return '<button class="piece zh" data-k="' + k + '">' + esc(parts[k]) + "</button>"; }).join("") + "</div>" +
        '<div id="qfb"></div><button class="btn primary wide" id="chk" disabled>Check</button></div>',
      wire: function (done) {
        var placed = [], ans = document.getElementById("ans"), poolEl = document.getElementById("pool"), chk = document.getElementById("chk");
        function sync() {
          ans.innerHTML = placed.length ? placed.map(function (k) { return '<button class="piece zh in" data-k="' + k + '">' + esc(parts[k]) + "</button>"; }).join("") + (end ? '<span class="end zh">' + esc(end) + "</span>" : "") : '<span class="ph">Your sentence…</span>';
          poolEl.querySelectorAll(".piece").forEach(function (p) { p.classList.toggle("used", placed.indexOf(+p.dataset.k) >= 0); });
          chk.disabled = placed.length !== parts.length;
        }
        poolEl.onclick = function (ev) { var p = ev.target.closest(".piece"); if (!p || p.classList.contains("used") || chk.dataset.done) return; placed.push(+p.dataset.k); Audio2.sfx.tap(); sync(); };
        ans.onclick = function (ev) { var p = ev.target.closest(".piece"); if (!p || chk.dataset.done) return; placed.splice(placed.indexOf(+p.dataset.k), 1); sync(); };
        chk.onclick = function () {
          if (chk.dataset.done) { done(chk.dataset.ok === "1"); return; }
          var got = placed.map(function (k) { return parts[k]; }).join(""), ok = got === core || (alts || []).indexOf(got) >= 0;
          chk.dataset.done = 1; chk.dataset.ok = ok ? "1" : "0"; chk.textContent = "Next ›";
          Learn.record(e.key, e, ok);
          (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
          ans.classList.add(ok ? "ok" : "no");
          document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct!" : "✗ Correct order:") + '<div class="ex-zh"><span class="zh">' + esc(core + end) + "</span></div>" + (reveal || "") + "</div>";
        };
      } };
  }
  function mockDrillQ(x, e) {
    var it = x.it, head = '<p class="sub">Mock test ' + e.mock + " · " + skillName(x.skill) + "</p>";
    if (x.kind === "order") {
      return orderQ(it.tokens, shuffle(it.tokens.map(function (_, k) { return k; })), it.answer, "", e, "", it.alt);
    }
    if (x.kind === "write") {
      return { html: '<div class="card qcard" id="qcard">' + head + '<p class="w2-scene">' + it.emoji + ' <b class="zh">' + esc(it.word) + '</b></p><textarea class="w2-input" id="dw" rows="2" placeholder="写一个句子…"></textarea>' +
          '<button class="btn wide" id="dw-show">Show a model answer</button><div id="qfb"></div></div>',
        wire: function (done) {
          document.getElementById("dw-show").onclick = function () {
            this.hidden = true;
            document.getElementById("qfb").innerHTML = '<p class="model-t">Model: <span class="zh">' + esc(it.sample) + '</span></p><div class="tf-btns"><button class="btn good-btn" id="dw-ok">I got it ✔</button><button class="btn bad-btn" id="dw-no">Not quite ✘</button></div>';
            document.getElementById("dw-ok").onclick = function () { Learn.record(e.key, e, true); done(true); };
            document.getElementById("dw-no").onclick = function () { Learn.record(e.key, e, false); done(false); };
          };
        } };
    }
    var prompt = head;
    if (x.kind === "tf") prompt += SAY(it.audio.text, it.audio.voice, true) + '<p class="statement">' + esc(it.statement) + "</p>";
    else if (x.kind === "dlg") prompt += '<button type="button" class="btn small" id="dlg-play">▶ Play dialogue</button><p class="statement">' + esc(it.question) + "</p>";
    else if (x.kind === "aud") prompt += SAY(it.audio.text, it.audio.voice, true) + '<p class="statement">' + esc(it.question) + "</p>";
    else if (x.kind === "pass") prompt += '<div class="passage-in">' + linkWords(x.passage) + '</div><p class="statement">' + esc(it.q) + "</p>";
    else prompt += '<p class="statement">' + esc(it.sentence) + "</p>";
    var opts = x.kind === "tf" ? [["true", "✔ True"], ["false", "✘ False"]] : shuffle(it.options.map(function (o, k) { return k; })).map(function (k, pos) { return [String(k), "ABCD"[pos] + " · " + it.options[k]]; });
    var answer = x.kind === "tf" ? String(it.answer) : String(it.answer);
    var script = x.kind === "tf" ? it.audio.text : x.kind === "aud" ? it.audio.text : x.kind === "dlg" ? it.dialogue.map(function (l) { return l.text; }).join(" / ") : "";
    return { html: '<div class="card qcard" id="qcard">' + prompt + '<div class="opts' + (x.kind === "tf" ? " tf-btns" : "") + '">' +
        opts.map(function (o) { return '<button class="opt" data-k="' + o[0] + '"><span class="zh">' + esc(o[1]) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>',
      wire: function (done) {
        var dp = document.getElementById("dlg-play"); if (dp) dp.onclick = function () { Audio2.playAll(it.dialogue); };
        wireMC(answer, function (ok) { Learn.record(e.key, e, ok); return script ? '<div class="script zh">🎧 ' + esc(script) + "</div>" : ""; }, done);
      } };
  }

  function runMistakeDrill(skill) {
    var items = shuffle(Learn.list(skill === "all" ? null : skill)).slice(0, 10), i = 0, right = 0, skipped = 0;
    var title = skill === "all" ? "All mistakes" : Learn.SKILLS[skill].en;
    if (!items.length) { location.replace("#/mistakes"); return; }
    (function draw() {
      if (i >= items.length) {
        var left = Learn.count(skill === "all" ? null : skill);
        Game.award(right * 2);
        render('<div class="card result">' + UI.mascot(right === items.length - skipped ? "cheer" : "happy", 88) + "<h2>" + right + " / " + (items.length - skipped) + " right</h2>" +
          '<p class="sub">' + (left ? left + " still in the notebook — they clear after " + Learn.CLEAR_AFTER + " right answers in a row." : "Notebook clear for this skill! 🎉") + "</p>" +
          '<div class="actions center">' + (left ? '<a class="btn primary" href="#/mistakes/' + skill + '" id="again">↻ Drill again</a>' : "") + '<a class="btn" href="#/mistakes">Notebook</a></div></div>', "review");
        var ag = document.getElementById("again"); if (ag) ag.onclick = function (ev) { ev.preventDefault(); runMistakeDrill(skill); };
        if (!left) UI.confetti(100);
        return;
      }
      var e = items[i], q = mistakeQ(e);
      if (!q) { delete Store.state.mistakes[e.key]; Store.save(); skipped++; i++; return draw(); }
      render('<div class="ghead"><a class="pill" href="#/mistakes">✕</a><b>📒 ' + esc(title) + '</b><span class="ghr">' + (i + 1) + "/" + items.length + "</span></div>" +
        '<div class="bar"><span style="width:' + (i / items.length * 100) + '%"></span></div>' + q.html, "review");
      q.wire(function (ok) { if (ok) right++; i++; draw(); });
    })();
  }

  /* ---------- tappable words & word sheet ---------- */
  var WORD_RE = null;
  function linkWords(text) {
    if (!WORD_RE) {
      var hz = WORDS.map(function (w) { return w.hanzi; }).filter(function (h) { return h.length >= 2; })
        .sort(function (a, b) { return b.length - a.length; }).map(function (h) { return h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
      WORD_RE = hz.length ? new RegExp("(" + hz.join("|") + ")", "g") : /$^/;
    }
    var byHz = {}; WORDS.forEach(function (w) { if (!byHz[w.hanzi]) byHz[w.hanzi] = w; });
    return String(text).split(WORD_RE).map(function (part, i) {
      return i % 2 && byHz[part] ? '<span class="wlink" data-w="' + esc(byHz[part].id) + '">' + esc(part) + "</span>" : esc(part);
    }).join("");
  }
  function openWordSheet(id) {
    var w = WORDMAP[id]; if (!w) return;
    var c = SRS.get(id);
    UI.modal('<div class="wsheet"><div class="ws-top"><span class="hz big zh">' + esc(w.hanzi) + "</span>" + SAY(w.hanzi, null, true) + "</div>" +
      '<p class="ws-py">' + esc(w.pinyin) + '</p><div class="ws-mean">' + M(w) + "</div>" + levelBadge(w.level) +
      (w.example ? '<div class="ws-ex"><span class="zh">' + esc(w.example.zh) + "</span>" + SAY(w.example.zh) + '<div class="dim">' + M(w.example) + "</div></div>" : "") +
      '<div class="actions center">' + (c ? '<span class="tag t-box">In review · Box ' + c.box + (SRS.hard(id) ? " · hard" : "") + "</span>" : '<button class="btn primary" id="ws-add">➕ Add to review</button>') +
      '<a class="btn" href="' + wordHome(w) + '" id="ws-day">📖 ' + wordPlace(w) + "</a></div></div>");
    var add = document.getElementById("ws-add");
    if (add) add.onclick = function () { SRS.addMany([id]); add.outerHTML = '<span class="tag t-box">In review · Box 1</span>'; UI.toast("Added to review", "➕"); refreshChrome(); };
    var day = document.getElementById("ws-day");
    if (day) day.onclick = function () { var wrap = document.querySelector(".modal-wrap"); if (wrap) wrap.remove(); pendingJump = id; };
  }

  /* ---------- study plan ---------- */
  var BUFFER_DAYS = 14; // last two weeks before the exam: mocks + review
  function planInfo() {
    var s = Store.state, t = Store.today(), exam = s.settings.examDate || "2026-11-14";
    var daysLeft = Store.daysBetween(t, exam);
    var done = DAYS.filter(function (d) { return (s.days[d.day] || {}).completed; }).length, total = DAYS.length, remaining = total - done;
    var dates = Object.keys(s.log).filter(function (k) { return s.log[k] > 0; }).sort();
    var start = dates[0] || t;
    var finishBy = Store.addDays(exam, -BUFFER_DAYS);
    var studyLeft = Math.max(1, Store.daysBetween(t, finishBy) + 1);
    var span = Math.max(1, Store.daysBetween(start, finishBy) + 1), elapsed = Store.daysBetween(start, t) + 1;
    var expected = Math.min(total, Math.round(total * elapsed / span));
    var status = !dates.length ? "new" : done >= total ? "done" : done - expected >= 2 ? "ahead" : expected - done >= 2 ? "behind" : "on";
    return { exam: exam, daysLeft: daysLeft, done: done, total: total, remaining: remaining, finishBy: finishBy, studyLeft: studyLeft, perDay: remaining / studyLeft, expected: expected, status: status, inBuffer: Store.daysBetween(t, finishBy) < 0 };
  }
  var STATUS = { new: ["🌱", "Let's start", "t-box"], ahead: ["🚀", "Ahead of plan", "t-hsk"], on: ["✅", "On track", "t-hsk"], behind: ["⏳", "Behind plan", "t-warn"], done: ["🎓", "All lessons done", "t-hsk"] };
  function todayTasks() {
    var s = Store.state, t = Store.today(), p = planInfo(), nd = nextDay(), due = SRS.dueIds(WORDMAP).length;
    var tasks = [];
    tasks.push({ ico: "🔁", txt: due ? "Review " + due + " due word" + (due > 1 ? "s" : "") : "Review · all caught up", href: "#/review", done: !due });
    if (p.remaining) {
      var studiedToday = Object.keys(s.days).some(function (k) { return s.days[k].completedOn === t; });
      tasks.push({ ico: "📖", txt: "Finish Day " + nd.day + (p.perDay > 1.05 ? " (+" + (Math.ceil(p.perDay) - 1) + " more to keep pace)" : ""), href: "#/day/" + nd.day, done: studiedToday });
    }
    var nMis = Learn.count();
    if (nMis) tasks.push({ ico: "📒", txt: "Fix mistakes (" + nMis + " open)", href: "#/mistakes/all", done: false });
    var lastMock = s.mockHistory.length ? s.mockHistory[s.mockHistory.length - 1].date : null;
    var cs = nextCoreSet();
    if (cs && !p.inBuffer) {
      var addedToday = Object.keys(s.srs).some(function (id) { return /^k/.test(id) && s.srs[id].added === t; });
      tasks.splice(2, 0, { ico: "📘", txt: "HSK 4 Core · Set " + cs.set + " (" + cs.words.filter(function (w) { return !SRS.has(w.id); }).length + " new words)", href: "#/core/" + cs.set, done: addedToday });
    }
    var mockDue = p.inBuffer || p.done >= 10 && (!lastMock || Store.daysBetween(lastMock, t) >= 7);
    if (mockDue) tasks.push({ ico: "📝", txt: "Take a mock exam", href: "#/mock", done: lastMock === t });
    var goal = s.settings.dailyGoal || 30, xp = s.log[t] || 0;
    tasks.push({ ico: "🎯", txt: "Daily goal · " + xp + "/" + goal + " XP", href: "#/games", done: xp >= goal });
    return tasks;
  }
  function taskList(tasks) {
    return '<div class="tasks">' + tasks.map(function (k) {
      return '<a class="task' + (k.done ? " done" : "") + '" href="' + k.href + '"><span class="tk-box">' + (k.done ? "✓" : "") + '</span><span class="tk-ico">' + k.ico + "</span><span>" + esc(k.txt) + "</span></a>";
    }).join("") + "</div>";
  }
  function todayCard() {
    var p = planInfo(), st = STATUS[p.status], tasks = todayTasks(), n = tasks.filter(function (k) { return k.done; }).length;
    return '<section class="card today"><div class="sec-h"><h2>Today\'s plan</h2><span class="tag ' + st[2] + '">' + st[0] + " " + st[1] + "</span></div>" +
      taskList(tasks) + '<div class="sec-h"><span class="muted">' + n + "/" + tasks.length + ' done</span><a href="#/plan">Full plan ›</a></div></section>';
  }
  function corePaceHTML(p) {
    if (!CORE.length) return "";
    var done = CORE.filter(function (set) { return set.words.every(function (w) { return SRS.has(w.id); }); }).length, left = CORE.length - done;
    var perWeek = left ? Math.max(1, Math.ceil(left / p.studyLeft * 7)) : 0;
    return '<p class="sub">HSK 4 Core: <b>' + done + "/" + CORE.length + " sets</b> in review" + (left ? " · pace needed about <b>" + perWeek + " set" + (perWeek > 1 ? "s" : "") + " a week</b>." : " — all done! 🎉") + "</p>";
  }
  function viewPlan() {
    var p = planInfo(), st = STATUS[p.status], s = Store.state;
    var pace = p.remaining ? (p.perDay >= 1 ? p.perDay.toFixed(1) + " lessons a day" : "about " + Math.max(1, Math.ceil(p.perDay * 7)) + " lessons a week") : "All lessons done";
    var html = '<section class="card g-sun"><h2>🗓️ Road to HSK 4</h2><p class="score-big">' + (p.daysLeft >= 0 ? p.daysLeft : 0) + ' <small>days left</small></p>' +
      '<p><b>' + st[0] + " " + st[1] + "</b> · " + p.done + "/" + p.total + " days done" + (p.status !== "new" && p.status !== "done" ? " (plan: " + p.expected + ")" : "") + "</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(p.done / p.total * 100) + '%"></span></div>' +
      '<p class="sub">Pace needed: <b>' + pace + "</b> to finish by " + esc(p.finishBy) + ", leaving the last " + BUFFER_DAYS + " days for mock exams and review.</p>" + corePaceHTML(p) + "</section>";
    html += '<section class="card"><h2>Today</h2>' + taskList(todayTasks()) + "</section>";
    // week-by-week timeline
    var t = Store.today(), weeks = [], cursor = t, lesson = DAYS.filter(function (d) { return !(s.days[d.day] || {}).completed; }).map(function (d) { return d.day; });
    var perWeek = Math.max(1, Math.ceil(p.perDay * 7)), w = 0;
    while (Store.daysBetween(cursor, p.exam) >= 0 && w < 12) {
      var end = Store.addDays(cursor, 6), inBuf = Store.daysBetween(cursor, p.finishBy) < 0;
      var take = inBuf ? [] : lesson.splice(0, perWeek);
      weeks.push({ from: cursor, to: Store.daysBetween(end, p.exam) < 0 ? p.exam : end, days: take, buf: inBuf || !take.length });
      cursor = Store.addDays(end, 1); w++;
    }
    html += '<section class="card"><h2>Week by week</h2>' + weeks.map(function (x, i) {
      var lbl = x.days.length ? "Days " + x.days[0] + (x.days.length > 1 ? "–" + x.days[x.days.length - 1] : "") : "Mock exams + review";
      return '<div class="pw' + (i === 0 ? " now" : "") + '"><span class="pw-d">' + esc(x.from.slice(5)) + " → " + esc(x.to.slice(5)) + "</span><b>" + lbl + "</b>" +
        (x.buf ? '<span class="tag t-hsk">📝 Mocks</span>' : x.days.length ? '<span class="muted">' + x.days.length + " lessons</span>" : "") + "</div>";
    }).join("") + '<div class="pw exam"><span class="pw-d">' + esc(p.exam.slice(5)) + "</span><b>🎓 HSK 4 exam</b></div></section>";
    html += '<p class="sub center">Change the exam date in <a href="#/me">Me → Settings</a>.</p>';
    render(html, "home");
  }

  /* ---------- progress charts (inline SVG) ---------- */
  function lineChart(points, opts) {
    // points: [{x: label, y: number}], opts: {max, min, ref, refLabel, h}
    var W = 320, H = opts.h || 150, P = { l: 30, r: 10, t: 12, b: 22 }, n = points.length;
    if (!n) return '<p class="sub">' + (opts.empty || "No data yet.") + "</p>";
    points = points.map(function (p) { return { x: p.x, y: num(p.y) }; });
    var max = opts.max != null ? opts.max : Math.max.apply(null, points.map(function (p) { return p.y; }).concat([1]));
    var min = opts.min || 0;
    var X = function (i) { return P.l + (n === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1)); };
    var Y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min || 1)); };
    var path = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    var area = path + " L" + X(n - 1).toFixed(1) + " " + Y(min) + " L" + X(0).toFixed(1) + " " + Y(min) + " Z";
    var g = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [0, 0.5, 1].forEach(function (f) { var v = min + (max - min) * f; g += '<line class="grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (P.l - 4) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + Math.round(v) + "</text>"; });
    if (opts.ref != null) g += '<line class="ref" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(opts.ref) + '" y2="' + Y(opts.ref) + '"/><text class="ref-t" x="' + (P.l + 4) + '" y="' + (Y(opts.ref) - 4) + '" text-anchor="start">' + esc(opts.refLabel || "") + "</text>";
    g += '<path class="area" d="' + area + '"/><path class="line" d="' + path + '"/>';
    if (n <= 14) points.forEach(function (p, i) { g += '<circle class="dot" cx="' + X(i) + '" cy="' + Y(p.y) + '" r="3.5"><title>' + esc(p.x) + ": " + p.y + "</title></circle>"; });
    var step = Math.max(1, Math.ceil(n / 6));
    points.forEach(function (p, i) { if (i % step === 0 || i === n - 1) g += '<text class="ax" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.x) + "</text>"; });
    return g + "</svg>";
  }
  function barChart(points, opts) {
    var W = 320, H = opts.h || 130, P = { l: 26, r: 6, t: 10, b: 22 }, n = points.length;
    var max = Math.max.apply(null, points.map(function (p) { return p.y; }).concat([opts.ref || 0, 1]));
    var bw = (W - P.l - P.r) / n, Y = function (v) { return P.t + (H - P.t - P.b) * (1 - v / max); };
    var g = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [0, max].forEach(function (v) { g += '<text class="ax" x="' + (P.l - 4) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + Math.round(v) + "</text>"; });
    if (opts.ref) g += '<line class="ref" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(opts.ref) + '" y2="' + Y(opts.ref) + '"/>';
    points.forEach(function (p, i) {
      var x = P.l + i * bw + 2, h = Math.max(p.y ? 2 : 0, H - P.b - Y(p.y));
      g += '<rect class="bar-r' + (opts.ref && p.y >= opts.ref ? " hit" : "") + '" x="' + x.toFixed(1) + '" y="' + (H - P.b - h).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"><title>' + esc(p.x) + ": " + p.y + "</title></rect>";
      if (i % 2 === 0 || i === n - 1) g += '<text class="ax" x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.x) + "</text>";
    });
    return g + "</svg>";
  }
  function viewProgress() {
    var s = Store.state, t = Store.today();
    var mh = s.mockHistory.slice(-12).map(function (h, i) { return { x: "#" + (s.mockHistory.length - Math.min(12, s.mockHistory.length) + i + 1), y: num(h.total) }; });
    var best = s.mockHistory.reduce(function (m, h) { return Math.max(m, num(h.total)); }, 0);
    // words in review over the last 30 days (by date added)
    var added = {}; Object.keys(s.srs).forEach(function (id) { var a = s.srs[id].added || t; added[a] = (added[a] || 0) + 1; });
    var before = 0, from = Store.addDays(t, -29);
    Object.keys(added).forEach(function (d) { if (d < from) before += added[d]; });
    var words = [], cum = before;
    for (var i = 0; i < 30; i++) { var d = Store.addDays(from, i); cum += added[d] || 0; words.push({ x: d.slice(5), y: cum }); }
    var xp = []; for (var j = 13; j >= 0; j--) { var dd = Store.addDays(t, -j); xp.push({ x: dd.slice(8), y: s.log[dd] || 0 }); }
    var sec = function (k) { return s.mockHistory.slice(-12).map(function (h, i) { return { x: String(i + 1), y: num((h.sections || {})[k]) }; }); };
    var html = '<section class="card"><div class="sec-h"><h2>📝 Mock exam scores</h2><span class="muted">' + (best ? "best " + best + "/300" : "") + "</span></div>" +
      lineChart(mh, { max: 300, ref: 180, refLabel: "pass 180", empty: "Take a mock exam to start your score chart." }) + "</section>";
    if (s.mockHistory.length) {
      html += '<section class="card"><h2>By section</h2><div class="spark3">' + ["listening", "reading", "writing"].map(function (k) {
        var pts = sec(k), last = pts[pts.length - 1].y;
        return '<div><b>' + { listening: "🎧 Listening", reading: "📖 Reading", writing: "✍️ Writing" }[k] + "</b><span class=\"big-n\">" + last + "</span>" + lineChart(pts, { max: 100, h: 70 }) + "</div>";
      }).join("") + "</div></section>";
    }
    html += '<section class="card"><div class="sec-h"><h2>📘 Words in review</h2><span class="muted">' + Object.keys(s.srs).length + " / " + WORDS.length + "</span></div>" + lineChart(words, { max: Math.max(10, cum), empty: "" }) + "</section>";
    html += '<section class="card"><div class="sec-h"><h2>⭐ XP · last 14 days</h2><span class="muted">goal ' + (s.settings.dailyGoal || 30) + "</span></div>" + barChart(xp, { ref: s.settings.dailyGoal || 30 }) + "</section>";
    var rep = Learn.report(3);
    if (rep.length) html += '<section class="card"><div class="sec-h"><h2>🎯 Skills</h2><a href="#/mistakes">Details ›</a></div>' + rep.map(function (x) {
      return '<div class="sk-row"><span class="sk-n">' + skillName(x.skill) + "</span>" + accBar(x.acc) + "</div>"; }).join("") + "</section>";
    render(html, "me");
  }

  /* ---------- global events & boot ---------- */
  document.addEventListener("click", function (e) {
    var wl = e.target.closest(".wlink");
    if (wl) { e.preventDefault(); e.stopPropagation(); openWordSheet(wl.getAttribute("data-w")); return; }
    var b = e.target.closest("[data-say]");
    if (b) {
      e.preventDefault(); e.stopPropagation();
      b.classList.add("playing"); setTimeout(function () { b.classList.remove("playing"); }, 900);
      Audio2.play(b.getAttribute("data-say"), b.getAttribute("data-voice") || "F");
    }
  }, true);

  function boot() {
    applySettings();
    document.getElementById("btn-py").onclick = function () {
      Store.state.settings.showPinyin = !Store.state.settings.showPinyin; Store.save(); applySettings();
      UI.toast(Store.state.settings.showPinyin ? "Pinyin on" : "Pinyin off", "拼");
    };
    if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addListener(applySettings);
    if (!BUNDLED && !window.CB_MANIFEST) { render('<p class="warn">data/manifest.js is missing.</p>'); return; }
    (BUNDLED ? Promise.resolve() : loadAll(window.CB_MANIFEST.concat(window.CB_CORE_FILES || []))).then(function () {
      buildIndex();
      window.addEventListener("hashchange", route);
      route();
      // warm up the rest in the background so it's ready (and cached for offline) before it's needed
      setTimeout(function () { ensureFull(); ensureMocks(); }, 1500);
    });
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        // iOS resumes home-screen apps without reloading, so check for a new version on every resume.
        document.addEventListener("visibilitychange", function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function (e) { console.warn("SW registration failed", e); });
      autoUpdate();
    }
    try { if (sessionStorage.getItem("cbUpdated")) { sessionStorage.removeItem("cbUpdated"); setTimeout(function () { UI.toast("App updated", "✨"); }, 600); } } catch (e) {}
  }

  /* When a new version takes over, reload once — but only on a "safe" screen, never mid-lesson or mid-game. */
  function autoUpdate() {
    if (!navigator.serviceWorker.controller) return;        // first install: nothing old to replace
    var pending = false, done = false;
    function safe() { var h = location.hash.replace(/^#\/?/, ""); return h === "" || h === "learn" || h === "games" || h === "review" || h === "me"; }
    function go() {
      if (done || !pending || !safe()) return;
      done = true;
      try { sessionStorage.setItem("cbUpdated", "1"); } catch (e) {}
      location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", function () { pending = true; go(); });
    window.addEventListener("hashchange", go);
  }

  window.App = {
    esc: esc, M: M, PY: PY, SAY: SAY, shuffle: shuffle, render: render, setKeys: setKeys, typing: typing, rect: rect, norm: norm,
    dayWords: dayWords, studiedWords: studiedWords, levelBadge: levelBadge, refreshChrome: refreshChrome,
    get CORE() { return CORE; }, get COREMAP() { return COREMAP; }, get DAYS() { return DAYS; }, get DAYMAP() { return DAYMAP; }, get WORDS() { return WORDS; }, get WORDMAP() { return WORDMAP; }
  };
  boot();
})();
