/* C&B 中文 — main app (vanilla JS, hash routing). Mobile-first, tuned for iPhone. */
(function () {
  "use strict";

  var DAYS = [], DAYMAP = {}, WORDS = [], WORDMAP = {}, LOAD_ERRORS = [];
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
  function loadAll(files) {
    return files.reduce(function (p, f) {
      return p.then(function () {
        return new Promise(function (res) {
          var s = document.createElement("script");
          s.src = "data/" + f;
          s.onload = res;
          s.onerror = function () { LOAD_ERRORS.push(f); res(); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve());
  }
  function buildIndex() {
    DAYS = (window.CB_DAYS || []).slice().sort(function (a, b) { return a.day - b.day; });
    DAYMAP = {}; WORDS = []; WORDMAP = {};
    DAYS.forEach(function (d) {
      DAYMAP[d.day] = d;
      (d.words || []).forEach(function (w) { w._day = d.day; WORDS.push(w); WORDMAP[w.id] = w; });
    });
  }

  /* ---------- router ---------- */
  var TITLES = { "": "Home", learn: "Learn", day: "Lesson", cards: "Flashcards", review: "Review", games: "Games", game: "Games", search: "Search", me: "Me" };
  function route() {
    Audio2.stop(); setKeys(null);
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var v = parts[0] || "";
    if (v === "day") viewDay(parseInt(parts[1], 10), parts[2] || "words");
    else if (v === "cards") viewCards(parts[1]);
    else if (v === "review") viewReview();
    else if (v === "games") Games.hub();
    else if (v === "game") Games.run(parts[1], parts[2]);
    else if (v === "quiz") { location.replace("#/game/quick"); return; }
    else if (v === "search") viewSearch();
    else if (v === "learn") viewLearn();
    else if (v === "me" || v === "settings") viewMe();
    else viewHome();
    var tab = { "": "home", day: "learn", cards: "learn", search: "learn", learn: "learn", review: "review", games: "games", game: "games", me: "me", settings: "me" }[v] || "home";
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
    html += '<a class="cta card g-coral" href="#/day/' + nd.day + '"><span class="cta-l"><small>Continue · Day ' + nd.day + '</small><b class="zh">' + esc(nd.title.zh) + "</b><em>" + M(nd.title) + '</em></span><span class="cta-go">▶</span></a>';
    html += '<a class="cta card g-teal" href="#/review"><span class="cta-l"><small>Spaced review</small><b>' + (due ? due + " word" + (due > 1 ? "s" : "") + " due" : "All caught up") + "</b><em>" + (due ? "Keep them fresh" : "Come back tomorrow") + '</em></span><span class="cta-go">🔁</span></a>';
    html += '<a class="cta card g-sun' + (chDone ? " done" : "") + '" href="#/game/' + ch.id + '"><span class="cta-l"><small>Daily challenge' + (chDone ? " · done ✓" : " · +15 XP bonus") + "</small><b>" + ch.icon + " " + ch.name + "</b><em>" + ch.desc + '</em></span><span class="cta-go">🎯</span></a>';
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
  function viewLearn() {
    var st = Store.state, plan = window.CB_PLAN || [];
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search 240 words — hanzi, pinyin, Việt, English</span></a>';
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
    var tabs = [["words", "Words"], ["reading", d.reading && d.reading.kind === "passage" ? "Reading" : "Dialogue"]];
    if (d.grammar) tabs.push(["grammar", "Grammar"]);
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

  function wordCard(w) {
    return '<article class="word card" id="w-' + esc(w.id) + '">' +
      '<div class="w-top"><div><div class="hz">' + esc(w.hanzi) + "</div>" + PY(w.pinyin) + "</div>" + SAY(w.hanzi, null, true) + "</div>" +
      '<div class="w-mean">' + M(w) + "</div>" +
      '<div class="tags"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + boxBadge(w.id) + "</div>" +
      (w.note ? '<div class="w-note">💡 ' + M(w.note) + "</div>" : "") +
      '<div class="colls">' + (w.collocations || []).map(function (c) {
        return '<div class="coll"><div><span class="zh">' + esc(c.zh) + "</span> " + PY(c.py) + '<div class="dim">' + M(c) + "</div></div>" + SAY(c.zh) + "</div>";
      }).join("") + "</div>" +
      '<div class="w-ex"><div class="ex-zh"><span class="zh">' + esc(w.example.zh) + "</span>" + SAY(w.example.zh) + "</div>" + PY(w.example.py) + '<div class="tr">' + M(w.example) + "</div></div>" +
      "</article>";
  }
  function tabWords(d, body) {
    var ws = dayWords(d), notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length;
    var html = '<div class="actions"><a class="btn primary" href="#/cards/' + d.day + '">🃏 Flashcards (' + ws.length + ")</a>" +
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
        if (!l.speaker) return '<div class="para card"><div class="zh">' + esc(l.zh) + SAY(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + "</div></div>";
        var side = l.speaker === first ? "left" : "right";
        return '<div class="msg ' + side + '"><div class="ava ' + (voice === "M" ? "m" : "f") + '">' + esc(l.speaker.charAt(0)) + '</div><div class="bubble"><div class="spk">' + esc(l.speaker) + "</div>" +
          '<div class="zh">' + esc(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + '</div><div class="b-say">' + SAY(l.zh, voice) + "</div></div></div>";
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
      (score === items.length ? Audio2.sfx.good : Audio2.sfx.bad)();
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
      if (score >= 7) rec.completed = true;
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
    else {
      var d = DAYMAP[parseInt(arg, 10)];
      if (!d) { render('<p class="empty">Day not found.</p>'); return; }
      words = dayWords(d); title = "Day " + d.day + " · " + d.title.zh; back = "#/day/" + d.day + "/words";
    }
    runDeck({ title: title, words: words, mode: "learn", back: back });
  }
  function runDeck(opts) {
    var queue = shuffle(opts.words), pos = 0, flipped = false, right = 0, wrong = 0, missed = [], requeued = {}, busy = false;
    function draw() {
      if (pos >= queue.length) return finish();
      var w = queue[pos]; flipped = false; busy = false;
      render('<div class="deck"><div class="deck-top"><a class="pill" href="' + opts.back + '">✕</a><span class="zh">' + esc(opts.title) + "</span><span>" + (pos + 1) + "/" + queue.length + "</span></div>" +
        '<div class="bar"><span style="width:' + Math.round(pos / queue.length * 100) + '%"></span></div>' +
        '<div class="stage"><div class="fcard" id="card"><div class="face front"><div class="hz big">' + esc(w.hanzi) + "</div>" + SAY(w.hanzi, null, true) +
        (requeued[w.id] ? '<p class="dim">practice again</p>' : '<p class="hint">Tap to flip</p>') + "</div>" +
        '<div class="face back"><div class="hz mid">' + esc(w.hanzi) + '</div><div class="big-py">' + esc(w.pinyin) + '</div><div class="w-mean">' + M(w) + "</div>" +
        '<div class="tags center"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + "</div>" +
        '<div class="w-ex"><div class="ex-zh"><span class="zh">' + esc(w.example.zh) + "</span>" + SAY(w.example.zh) + "</div>" + PY(w.example.py) + '<div class="tr">' + M(w.example) + "</div></div>" +
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
      if (!requeued[w.id]) {
        SRS.grade(w.id, ok);
        s.stats.cards++; if (ok) { s.stats.correct++; right++; } else { wrong++; missed.push(w); }
        Game.award(ok ? 2 : 1, { silent: true });
      }
      if (!ok && opts.mode === "review" && !requeued[w.id]) { requeued[w.id] = true; queue.push(w); }
      (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
      if (card) { card.style.transition = "transform .3s ease, opacity .3s"; card.style.transform = "translateX(" + (ok ? 120 : -120) + "vw) rotate(" + (ok ? 20 : -20) + "deg) rotateY(180deg)"; card.style.opacity = "0"; }
      UI.pop(ok ? "+2 XP" : "+1 XP", null, innerHeight * 0.3, ok ? "good" : "");
      setTimeout(function () { pos++; draw(); }, UI.reduced ? 0 : 260);
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
        '<p class="sub">' + (total ? (nd ? "Next review: " + esc(nd) : "") : "Study a day's flashcards to fill your deck.") + "</p></div>" + boxes +
        '<div class="actions center"><a class="btn primary" href="#/games">🎮 Play a game</a><a class="btn" href="#/learn">📚 Learn</a></div>', "review");
      return;
    }
    render('<div class="card result">' + UI.mascot("happy", 88) + "<h2>" + ids.length + " word" + (ids.length > 1 ? "s" : "") + " due</h2>" +
      '<p class="sub">✓ moves a card up a box · ✗ sends it back to box 1</p><button class="btn primary wide" id="start">Start review</button></div>' + boxes, "review");
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
        return '<div class="wl-row"><a href="#/day/' + w._day + '/words" data-jump="' + esc(w.id) + '"><span class="zh">' + esc(w.hanzi) + "</span> " + PY(w.pinyin) +
          '<div class="dim">' + M(w) + " · Day " + w._day + "</div></a>" + SAY(w.hanzi) + "</div>";
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
      (nAudio && "caches" in window && location.protocol.indexOf("http") === 0 ? row("Download all audio for offline", '<button class="btn small" id="s-dl">⬇ Download</button>') : "") +
      row("Export progress", '<button class="btn small" id="s-exp">Export</button>') +
      row("Import progress", '<label class="btn small">Import<input type="file" id="s-imp" accept=".json,application/json" hidden></label>') +
      row("Reset progress", '<button class="btn small bad" id="s-reset">Reset</button>') + "</section>" +
      (isIOS && !standalone ? '<section class="card"><h2>Install on iPhone</h2><p class="sub">In Chrome, tap <b>Share ⬆︎</b> (address bar) → <b>Add to Home Screen</b>. The home-screen app opens full-screen, works offline, and iOS won\'t clear its progress. Export a backup now and then anyway.</p></section>' : "") +
      '<p class="sub center">' + DAYS.length + " days · " + WORDS.length + ' words · <a href="#/search">Search</a></p>';
    render(html, "me");
    function sv(k, v) { set[k] = v; Store.save(); applySettings(); }
    document.getElementById("s-py").onchange = function () { sv("showPinyin", this.checked); };
    document.getElementById("s-lang").onchange = function () { sv("lang", this.value); };
    document.getElementById("s-theme").onchange = function () { sv("theme", this.value); };
    document.getElementById("s-sfx").onchange = function () { sv("sfx", this.checked); if (this.checked) Audio2.sfx.good(); };
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
  function downloadAudio(btn) {
    var files = Audio2.allFiles(), done = 0, fail = 0;
    btn.disabled = true;
    caches.open("cb-audio").then(function (cache) {
      var i = 0;
      function next() {
        if (i >= files.length) { btn.textContent = "✓ " + done + " saved"; UI.toast("Audio saved for offline" + (fail ? " (" + fail + " failed)" : ""), "⬇"); return; }
        var f = files[i++];
        cache.match(f).then(function (hit) {
          return hit || fetch(f).then(function (r) { if (!r.ok) throw 0; return cache.put(f, r); });
        }).then(function () { done++; }, function () { fail++; }).then(function () { btn.textContent = Math.round(i / files.length * 100) + "%"; next(); });
      }
      next(); next(); next(); next();
    });
  }

  /* ---------- global events & boot ---------- */
  document.addEventListener("click", function (e) {
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
    if (!window.CB_MANIFEST) { render('<p class="warn">data/manifest.js is missing.</p>'); return; }
    loadAll(window.CB_MANIFEST).then(function () {
      buildIndex();
      window.addEventListener("hashchange", route);
      route();
    });
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function (e) { console.warn("SW registration failed", e); });
    }
  }

  window.App = {
    esc: esc, M: M, PY: PY, SAY: SAY, shuffle: shuffle, render: render, setKeys: setKeys, typing: typing, rect: rect, norm: norm,
    dayWords: dayWords, studiedWords: studiedWords, levelBadge: levelBadge, refreshChrome: refreshChrome,
    get DAYS() { return DAYS; }, get DAYMAP() { return DAYMAP; }, get WORDS() { return WORDS; }, get WORDMAP() { return WORDMAP; }
  };
  boot();
})();
