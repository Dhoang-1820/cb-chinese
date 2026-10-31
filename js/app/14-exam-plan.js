  /* ---------- exam countdown plan: the last EXAM_PLAN_DAYS days, one focus per day ----------
     Mock exam every third day (counted back from two days before the exam), the other days rotate through the
     exam sections weakest first (weakest twice as often), the day before is light, then exam day.
     Each date keeps the same focus as the days pass (it depends on the days left, not on today). */
  var EXAM_PLAN_DAYS = 21;
  function secOrder() {
    var r = null; try { r = readiness(); } catch (e) { r = null; }
    if (r && r.secs) return r.secs.slice().sort(function (a, b) { return a.score - b.score; }).map(function (x) { return x.k; });
    return ["L", "R", "W"];
  }
  function secFocus(k) {
    var lang = Store.state.settings.lang === "vi" ? "vi" : "en", w = Learn.report(5).filter(function (x) { return SEC_OF[x.info.sec] === k && x.acc < 0.9; })[0];
    var part = w && PARTS.filter(function (p) { return p.skill === w.skill; })[0]; // a skill that is an exam part: practise that part at the real pace
    return w ? { txt: SEC_NAME[k] + " · " + w.info[lang] + " (" + Math.round(w.acc * 100) + "%)", href: part ? "#/parts/" + part.k : w.open ? "#/mistakes/" + w.skill : SKILL_LINK[w.skill] || SEC_GO[k] }
      : { txt: SEC_NAME[k] + " practice", href: SEC_GO[k] };
  }
  /* Which set to take next: a never-taken set first (fresh questions give a true score), otherwise the one
     taken longest ago. plan: ids already planned for earlier days; they count as taken "later than anything",
     so the exam plan rotates through the sets instead of showing the same one every third day. */
  function nextMock(full, plan) {
    var s = Store.state, last = {};
    if (!MOCK.length) return null;
    (s.mockHistory || []).forEach(function (h) { if (!last[h.id] || h.date > last[h.id]) last[h.id] = h.date; });
    (plan || []).forEach(function (id, i) { last[id] = "9" + (1000 + i); }); // sorts after every real date, in plan order
    var taken = function (m) { return last[m.id] != null || ((s.mocks[m.id] || {}).plays || 0) > 0; };
    var m = MOCK.slice().sort(function (a, b) {
      var la = last[a.id] || "", lb = last[b.id] || "";
      /* final-week days need a full-length set (a repeat if all are taken); earlier mock days use the short sets, keeping the full ones fresh */
      return (full ? (b.full ? 1 : 0) - (a.full ? 1 : 0) : (a.full ? 1 : 0) - (b.full ? 1 : 0)) || (taken(a) ? 1 : 0) - (taken(b) ? 1 : 0) || (la < lb ? -1 : la > lb ? 1 : 0) || a.id - b.id;
    })[0];
    return { m: m, rep: taken(m) };
  }
  function nextMockHref(full) { var n = nextMock(full); return n ? "#/mock/" + n.m.id : "#/mock"; }
  function examSchedule() {
    var s = Store.state, t = Store.today(), exam = s.settings.examDate || "2026-11-14", left0 = Store.daysBetween(t, exam), out = [], order = secOrder(), pat = [order[0], order[1], order[0], order[2] || order[1]], planned = [];
    if (left0 < 0 || left0 > EXAM_PLAN_DAYS) return [];
    for (var i = 0; i <= left0; i++) {
      var d = Store.addDays(t, i), left = left0 - i, e;
      if (left === 0) e = { ico: "🎓", txt: "Exam day · morning warm-up, then 加油!", href: "#/warmup", kind: "exam" };
      else if (left === 1) e = { ico: "🎒", txt: "Checklist for tomorrow and light review, then sleep early", href: "#/eve", kind: "light" };
      else if ((left - 2) % 3 === 0) {
        var nm = nextMock(left <= 8, planned);
        if (nm) planned.push(nm.m.id);
        var sim = left <= 8 && nm && nm.m.full; // final week: the full set in the strict simulator, like the real day
        var at = sim && s.settings.examTime ? " · start at " + s.settings.examTime : ""; // same hour as the real exam
        e = { ico: sim ? "🎯" : "📝", txt: (left <= 8 ? (sim ? "Full mock in the exam simulator" : "Mock exam, timed") : "Mock exam") + (nm ? " · Test " + nm.m.id + (nm.rep ? " (repeat)" : "") : "") + at, href: nm ? "#/mock/" + nm.m.id + (sim ? "/sim" : "") : "#/mock", kind: "mock" };
      }
      else { var f = secFocus(pat[left % 4]); e = { ico: "🎯", txt: f.txt, href: f.href, kind: "focus" }; }
      e.d = d; e.left = left;
      e.done = d === t && (e.kind === "mock" ? s.mockHistory.some(function (h) { return h.date === t; }) : e.kind === "exam" ? false : (s.log[t] || 0) > 0);
      out.push(e);
    }
    return out;
  }
  function examPlanCard() {
    var sc = examSchedule(); if (!sc.length) return "";
    var td = sc[0], n = sc.length - 1;
    return '<section class="card exam-plan"><div class="sec-h"><h2>🎓 Exam plan</h2><span class="tag t-sun">' + (n === 0 ? "Today" : n + " day" + (n === 1 ? "" : "s") + " left") + "</span></div>" +
      '<a class="task' + (td.done ? " done" : "") + '" href="' + td.href + '"><span class="tk-box">' + (td.done ? "✓" : "") + '</span><span class="tk-ico">' + td.ico + "</span><span><small class=\"sub\">Today</small><br>" + esc(td.txt) + "</span></a>" +
      (sc[1] ? '<p class="sub ep-next">Tomorrow: ' + sc[1].ico + " " + esc(sc[1].txt) + "</p>" : "") + '<div class="sec-h"><span class="muted">Plus your due reviews each day</span><a href="#/exam">All ' + (n + 1) + " days ›</a></div></section>";
  }
  function viewExamPlan() {
    var sc = examSchedule(), s = Store.state, from = Store.addDays(Store.today(), -EXAM_PLAN_DAYS), mocks = s.mockHistory.filter(function (h) { return h.date >= from; }).length;
    if (!sc.length) { render('<section class="card"><h2>🎓 Exam plan</h2><p class="sub">The day-by-day plan starts ' + EXAM_PLAN_DAYS + " days before your exam (" + esc(s.settings.examDate || "") + '). Until then, follow Today\'s plan on Home.</p><a class="btn" href="#/plan">Study plan</a></section>', "home"); return; }
    var html = '<section class="card g-sun"><h2>🎓 Exam plan</h2><p class="score-big">' + sc[0].left + ' <small>day' + (sc[0].left === 1 ? "" : "s") + ' left</small></p><p class="sub">One focus a day, plus your due reviews. Mock exams every third day; your weakest section comes up most. ' + mocks + " mock" + (mocks === 1 ? "" : "s") + " taken in the last " + EXAM_PLAN_DAYS + " days.</p></section>" +
      '<section class="card"><ol class="ep-list">' + sc.map(function (e, i) {
        var dt = new Date(e.d + "T00:00:00"), lab = WD[(dt.getDay() + 6) % 7] + " " + e.d.slice(8) + "/" + e.d.slice(5, 7);
        return '<li class="ep-' + e.kind + (i === 0 ? " ep-today" : "") + (e.done ? " done" : "") + '"><span class="ep-d">' + (i === 0 ? "Today" : lab) + '</span><a href="' + e.href + '"><span class="tk-ico" aria-hidden="true">' + e.ico + "</span>" + (e.done ? '<span class="sr">Done: </span>' : "") + esc(e.txt) + "</a></li>";
      }).join("") + "</ol></section>";
    render(html, "home");
  }
  function sessionBar(st) {
    var el = document.getElementById("session-bar");
    if (!st) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "session-bar"; el.className = "session-bar"; document.body.appendChild(el); }
    el.innerHTML = '<span>' + st.icon + " Step " + st.n + "/" + st.of + " · " + esc(st.name) + '</span><i style="width:' + Math.round((st.n - 1) / st.of * 100) + '%"></i>';
  }
  /* one tap after a session: how it felt. Kept with the progress, so the C&B team sees it in Learner tracking. */
  var FB = { 1: ["😓", "Too hard"], 2: ["🙂", "Just right"], 3: ["😴", "Too easy"] };
  function fbAsk() {
    var t = Store.today(), had = (Store.state.fb || []).filter(function (e) { return e.d === t; })[0];
    return '<div class="sfb" id="sfb"><p class="sub">' + (had ? "Thanks! Today felt: " + FB[had.r][0] + " " + FB[had.r][1] : "How did today feel?") + "</p>" + (had ? "" :
      '<div class="sfb-b" role="group" aria-label="How did today feel?">' + [1, 2, 3].map(function (r) { return '<button type="button" class="btn small" data-fb="' + r + '"><span aria-hidden="true">' + FB[r][0] + "</span> " + FB[r][1] + "</button>"; }).join("") + "</div>") + "</div>";
  }
  function wireFb() {
    var box = document.getElementById("sfb"); if (!box) return;
    box.onclick = function (ev) {
      var b = ev.target.closest("[data-fb]"); if (!b) return;
      var s = Store.state, t = Store.today(); s.fb = (s.fb || []).filter(function (e) { return e.d !== t; }); s.fb.push({ d: t, r: +b.getAttribute("data-fb") });
      if (s.fb.length > 60) s.fb.splice(0, s.fb.length - 60);
      Store.save(); box.outerHTML = fbAsk(); syncSoon();
    };
  }
  function viewSession(arg) {
    var rescue = arg === "rescue", back = arg === "comeback", light = rescue || back, myHash = light ? "#/session/" + arg : "#/session";
    var steps = sessionPlan(light ? arg : null), k = 0, s = Store.state, start = { xp: s.xp, hearts: s.stats.hearts || 0, srs: Object.keys(s.srs).length, mis: Learn.count() };
    var log = [];
    function next(result) {
      Audio2.noise(0); // the listening step switches it on again; nothing else should play over noise
      if (k > 0) log.push({ step: steps[k - 1], result: result });
      if (location.hash !== myHash) return; // learner left the session
      if (k >= steps.length) return summary();
      var st = steps[k++]; sessionBar({ n: k, of: steps.length, icon: st.icon, name: st.name });
      if (st.id === "review") runDeck({ title: "Review", words: st.ids.map(function (id) { return WORDMAP[id]; }).filter(Boolean), mode: "review", back: "#/", onDone: next });
      else if (st.id === "new") { SRS.addMany(st.words.map(function (w) { return w.id; })); runDeck({ title: "New words", words: st.words, mode: "learn", back: "#/", onDone: next }); }
      else if (st.id === "mistakes") runMistakeDrill("all", { limit: st.n || 5, onDone: next, exit: "#/" });
      else if (st.id === "type" || st.id === "weak-type") Games.run("type", "", { count: st.n || 3, onDone: next, exit: "#/" });
      else if (st.id === "weak-order") Games.run("wordorder", "", { count: st.n || 3, onDone: next, exit: "#/" });
      else if (st.id === "reading") Games.run("reading", "", { count: st.n || 3, onDone: next, exit: "#/" });
      else if (st.id === "talk") viewTalk(st.scene, { mini: 3, onDone: next, exit: "#/" });
      else if (st.id === "write") Games.run("picture", "", { count: st.n || 2, onDone: next, exit: "#/" });
      else if (st.id === "pace") { if (!runPart(st.part, { onDone: next, exit: "#/" })) next(0); }
      else if (st.id === "listen") Games.run("drill", "", { count: st.n || 3, onDone: next, exit: "#/" });
    }
    function summary() {
      sessionBar(null);
      s.sessions = s.sessions || {}; var first = !light && !s.sessions[Store.today()];
      if (!light) s.sessions[Store.today()] = true; // a rescue or a restart keeps the streak but does not count as Today's session
      Store.save();
      if (first) Game.award(10, { silent: true });
      var xp = s.xp - start.xp, hearts = (s.stats.hearts || 0) - start.hearts, added = Object.keys(s.srs).length - start.srs, cleared = Math.max(0, start.mis - Learn.count());
      render('<div class="card result">' + UI.anim("cat-love", 150, UI.mascot("cheer", 96)) + "<h2>" + (rescue ? "Streak saved! 🔥" : back ? "Welcome back! 🎉" : "Session complete! 🎉") + "</h2>" +
        '<div class="sum-grid"><div><b>+' + xp + '</b><span>XP' + (first ? " (incl. +10 bonus)" : "") + '</span></div><div><b>' + hearts + '</b><span>❤️ hearts</span></div><div><b>' + added + '</b><span>new words</span></div><div><b>' + cleared + '</b><span>mistakes cleared</span></div></div>' +
        '<p class="sub">🔥 Streak: ' + Store.streak() + " day" + (Store.streak() === 1 ? "" : "s") + '</p><div class="actions center"><a class="btn primary" href="#/">Home</a>' + (light ? '<a class="btn" href="#/session">▶ Full session</a>' : '<a class="btn" href="#/listen-mode">🎧 Keep listening</a>') + "</div>" + fbAsk() + "</div>", "home");
      wireFb();
      UI.confetti(140);
    }
    if (!steps.length) { render('<div class="card result"><h2>Nothing to do right now</h2><a class="btn primary" href="#/learn">Learn</a></div>', "home"); return; }
    render('<div class="card result"><h2>' + (rescue ? "2-minute rescue" : back ? "5-minute restart" : "Today\'s session") + '</h2>' + (back ? '<p class="sub">Overdue words first. Five minutes today is enough to get going again.</p>' : "") + '<div class="tasks">' + steps.map(function (x) { return '<div class="task" data-step="' + esc(x.id) + '"><span class="tk-ico">' + x.icon + "</span><span>" + esc(x.name) + "</span></div>"; }).join("") +
      '</div><button class="btn primary big" id="ss-go">▶ Start</button></div>', "home");
    document.getElementById("ss-go").onclick = function () { next(); };
  }

  /* ---------- grammar checklists: HSK 4 (g01..) and HSK 5 (h5g01.., loaded with the HSK 5 pack) ---------- */
  var _gm = null, gFilter = { q: "", st: "all", lvl: 4 };
  function GLIST(lvl) { return (lvl === 5 ? window.CB_HSK5_GRAMMAR : window.CB_GRAMMAR) || []; }
  function gLvl(id) { return /^h5g/.test(id) ? 5 : 4; }
  function gHome(lvl) { return lvl === 5 ? "#/grammar/h5" : "#/grammar"; }
  function GRAMMAP() { var n = GLIST(4).length + GLIST(5).length; if (!_gm || _gm.n !== n) { _gm = { n: n }; GLIST(4).concat(GLIST(5)).forEach(function (g) { _gm[g.id] = g; }); } return _gm; }
  function gState(id) { var g = Store.state.grammar; return g[id] || (g[id] = { best: 0, passes: 0, mastered: false }); }
  /* three states: mastered (also when marked by hand), practised at least one round, or never practised */
  function gStatus(id) {
    var st = Store.state.grammar[id];
    if (st && st.mastered) return ["done", "✓ Mastered"];
    if (!st || !(st.n > 0)) return ["new", "Never practised"];
    return ["prog", "Best " + (st.best || 0) + "/5"];
  }
  function viewGrammarList(lvl) {
    lvl = lvl === 5 ? 5 : 4;
    if (gFilter.lvl !== lvl) gFilter = { q: "", st: "all", lvl: lvl }; // each level starts with its own, empty filter
    var G = GLIST(lvl), mastered = G.filter(function (g) { return (Store.state.grammar[g.id] || {}).mastered; }).length;
    var never = G.filter(function (g) { return gStatus(g.id)[0] === "new"; }).length;
    var html = (lvl === 5 ? h5Seg("grammar") : learnSeg("grammar")) + '<section class="card g-teal"><h2>📐 HSK ' + lvl + ' grammar checklist</h2><p class="sub">The grammar points tested at HSK ' + lvl + ". Read the pattern, do 5 questions; get 5/5 (or 4/5 twice) to master it.</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(mastered / Math.max(1, G.length) * 100) + '%"></span></div><p class="xp-t">' + mastered + " / " + G.length + " mastered</p>" +
      '<p class="sub g-cov" id="g-cov"><b>' + never + "</b> never practised · <b>" + (G.length - never - mastered) + "</b> practised, not mastered · <b>" + mastered + "</b> mastered</p></section>";
    /* a long list needs a way in: filter by text (Chinese, pinyin-free Vietnamese or English) and by status */
    html += '<div class="g-filter"><input id="g-q" class="search" type="search" inputmode="search" placeholder="Filter: 把 · compare · so sánh" aria-label="Filter grammar points" value="' + esc(gFilter.q) + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<div class="vtoggle" role="group" aria-label="Show">' + [["all", "All"], ["never", "Never practised"], ["todo", "To do"], ["done", "Mastered"]].map(function (x) { return '<button type="button" data-gf="' + x[0] + '" class="' + (gFilter.st === x[0] ? "on" : "") + '" aria-pressed="' + (gFilter.st === x[0]) + '">' + x[1] + "</button>"; }).join("") + '</div></div><p class="sub" id="g-count" role="status"></p>';
    html += '<div class="glist">' + G.map(function (g, i) {
      var s = gStatus(g.id);
      return '<a class="gitem card ' + s[0] + '" data-st="' + s[0] + '" href="#/grammar/' + g.id + '" data-t="' + esc(norm(g.title.zh + " " + g.title.vi + " " + g.title.en + " " + g.pattern)) + '" data-z="' + esc(g.title.zh + " " + g.pattern) + '"><span class="gnum">' + (i + 1) + '</span><span class="gtxt"><b class="zh">' + esc(g.title.zh) + "</b><small>" + M(g.title) + '</small></span><span class="gst">' + s[1] + "</span></a>";
    }).join("") + "</div>";
    render(html, "learn");
    var q = document.getElementById("g-q"), cnt = document.getElementById("g-count");
    function apply() {
      var raw = gFilter.q.trim(), nq = norm(raw), n = 0;
      [].forEach.call(document.querySelectorAll(".glist .gitem"), function (el) {
        var st = el.getAttribute("data-st"), f = gFilter.st;
        var ok = (f === "all" || (f === "done" ? st === "done" : f === "never" ? st === "new" : st !== "done")) && (!raw || el.getAttribute("data-z").indexOf(raw) >= 0 || (nq && el.getAttribute("data-t").indexOf(nq) >= 0));
        el.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = raw || gFilter.st !== "all" ? (n ? n + " of " + G.length + " grammar points" : "No grammar point matches.") : "";
      cnt.hidden = !cnt.textContent;
    }
    q.oninput = function () { gFilter.q = q.value; apply(); };
    [].forEach.call(document.querySelectorAll("[data-gf]"), function (bt) {
      bt.onclick = function () {
        gFilter.st = bt.getAttribute("data-gf");
        [].forEach.call(document.querySelectorAll("[data-gf]"), function (x) { x.classList.toggle("on", x === bt); x.setAttribute("aria-pressed", x === bt ? "true" : "false"); });
        apply();
      };
    });
    apply();
  }
  function viewGrammarPoint(id, sub) {
    var g = GRAMMAP()[id];
    if (!g) { render('<p class="empty">Grammar point not found. <a href="#/grammar">Back</a></p>', "learn"); return; }
    if (sub === "practice") return grammarQuiz(g);
    var lvl = gLvl(id), home = gHome(lvl), st = Store.state.grammar[id] || {}, G = GLIST(lvl), i = G.indexOf(g);
    var html = '<header class="dayhead card g-teal"><div class="dh-nav">' + (G[i - 1] ? '<a class="pill" href="#/grammar/' + G[i - 1].id + '">‹</a>' : '<a class="pill" href="' + home + '">‹ All</a>') +
      '<span class="dh-day">' + (lvl === 5 ? "HSK 5 grammar " : "Grammar ") + (i + 1) + "/" + G.length + "</span>" + (G[i + 1] ? '<a class="pill" href="#/grammar/' + G[i + 1].id + '">›</a>' : "<span></span>") + "</div>" +
      '<h1 class="zh">' + esc(g.title.zh) + '</h1><p class="sub">' + M(g.title) + "</p></header>" + (lvl === 5 ? H5_NOTE : "") +
      '<section class="card"><p class="gpat zh">' + esc(g.pattern) + '</p><div class="tr show">' + M(g.explain) + "</div></section>" +
      '<h3 class="sec">Examples</h3>' + g.examples.map(function (e) {
        return '<div class="card w-ex"><div class="ex-zh"><span class="zh">' + linkWords(e.zh) + "</span>" + (lvl === 5 ? SAYX : SAY)(e.zh) + "</div>" + PY(e.py) + '<div class="tr">' + M(e) + "</div></div>";
      }).join("") +
      '<div class="actions center"><a class="btn primary big" href="#/grammar/' + id + '/practice">✍️ Practice 5 questions</a></div>' +
      '<p class="sub center">' + (st.mastered ? "✓ Mastered" : st.best ? "Best so far: " + st.best + "/5" : "Not practised yet") +
      ' · <button class="linklike" id="g-toggle">' + (st.mastered ? "Unmark mastered" : "Mark as mastered") + "</button></p>" +
      (lvl === 5 ? '<p class="sub center"><button type="button" class="linklike w-flag" data-flag="grammar:' + esc(id) + '" data-flag-label="' + esc(g.title.zh) + '">⚑ Report a problem</button></p>' : "");
    render(html, "learn");
    document.getElementById("g-toggle").onclick = function () { var x = gState(id); x.mastered = !x.mastered; if (!x.mastered) x.passes = 0; Store.save(); viewGrammarPoint(id); };
  }
  function grammarQuiz(g) {
    var order = shuffle(g.quiz.map(function (_, k) { return k; })), i = 0, right = 0;
    (function draw() {
      if (i >= order.length) {
        var st = gState(g.id), before = st.mastered;
        st.best = Math.max(st.best || 0, right); if (right >= 4) st.passes = (st.passes || 0) + 1;
        st.n = (st.n || 0) + 1; st.d = Store.today(); // practised: feeds "Never practised" and the weekly review quiz
        if (right === 5 || (right >= 4 && st.passes >= 2)) st.mastered = true;
        Store.save(); Game.award(right * 2);
        render('<div class="card result">' + UI.mascot(right >= 4 ? "cheer" : "happy", 88) + "<h2>" + right + " / 5</h2>" +
          '<p class="sub">' + (st.mastered && !before ? "Mastered: " + esc(g.title.zh) + " ✓" : st.mastered ? "Still mastered ✓" : right >= 4 ? "One more 4/5+ round to master it." : "Re-read the pattern and try again.") + "</p>" +
          '<div class="actions center"><a class="btn primary" href="#/grammar/' + g.id + '/practice" id="g-again">↻ Again</a><a class="btn" href="' + gHome(gLvl(g.id)) + '">Checklist</a></div></div>', "learn");
        document.getElementById("g-again").onclick = function (ev) { ev.preventDefault(); workDone = false; grammarQuiz(g); };
        if (st.mastered && !before) UI.confetti(90);
        return;
      }
      var k = order[i], q = g.quiz[k], ord = shuffle([0, 1, 2, 3]);
      render('<div class="ghead"><a class="pill" href="#/grammar/' + g.id + '">✕</a><b class="zh">📐 ' + esc(g.title.zh) + '</b><span class="ghr">' + (i + 1) + '/5</span></div>' +
        '<div class="bar"><span style="width:' + (i / 5 * 100) + '%"></span></div>' +
        '<div class="card qcard" id="qcard"><p class="q zh">' + esc(q.q) + '</p><div class="opts">' +
        ord.map(function (o, n) { return '<button class="opt" data-k="' + o + '"><span class="opt-n">' + "ABCD"[n] + '</span><span class="zh">' + esc(q.options[o]) + "</span></button>"; }).join("") +
        '</div><div id="qfb"></div></div>', "learn");
      wireMC(q.answer, function (ok) {
        if (ok) right++; markWork();
        Learn.record("gr:" + g.id + ":" + k, { kind: "gram", skill: gLvl(g.id) === 5 ? "h5-grammar" : "grammar", g: g.id, i: k }, ok);
        return M(q.explain);
      }, function () { i++; draw(); });
    })();
  }

  /* ---------- knowledge checks: grammar coverage, the weekly review quiz, lesson catch-up ---------- */
  /* Which HSK 4 grammar points a lesson's grammar box teaches, matched on the pattern's parts (按照 -> g33 根据 / 按照).
     A two-part pattern (只要……就……) only matches a point with the same parts in order, so a lone 就 or 也 never matches. */
  var _dg = {};
  function gClean(t) { return String(t || "").replace(/^关联词/, "").replace(/[（(][^）)]*[）)]/g, "").replace(/\s+/g, ""); }
  function gSegOk(seg, piece) { return seg.split("/").some(function (a) { return a === piece || (piece.length >= 2 && a.indexOf(piece) === 0); }); }
  function gMatch(point, g) {
    var segs = gClean(point).split(/…+/).filter(Boolean);
    return gClean(g.title.zh).split("/").some(function (alt) {
      var pieces = alt.split(/…+/).filter(Boolean), j = 0;
      if (!pieces.length || (pieces.length === 1) !== (segs.length === 1)) return false;
      return pieces.every(function (pc) { while (j < segs.length && !gSegOk(segs[j], pc)) j++; return j++ < segs.length; });
    });
  }
  function dayGrammarIds(d) {
    if (!d || !d.grammar || !d.grammar.point || !GLIST(4).length) return [];
    var key = d.day + ":" + d.grammar.point;
    return _dg[key] || (_dg[key] = GLIST(4).filter(function (g) { return gMatch(d.grammar.point, g); }).map(function (g) { return g.id; }));
  }
  function gTried(id) { var st = Store.state.grammar[id]; return !!st && st.n > 0; }
  /* The grammar point to suggest: first one never practised from a lesson already done (its pattern is fresh), else the first not mastered. */
  function nextGrammar() {
    var s = Store.state, G = GLIST(4), fromDay = {}, open = function (g) { return !(s.grammar[g.id] || {}).mastered; };
    DAYS.forEach(function (d) { if ((s.days[d.day] || {}).completed) dayGrammarIds(d).forEach(function (id) { if (!fromDay[id]) fromDay[id] = d.day; }); });
    var g = G.filter(function (x) { return fromDay[x.id] && open(x) && !gTried(x.id); })[0];
    if (g) return { g: g, day: fromDay[g.id] };
    g = G.filter(open)[0];
    return g ? { g: g } : null;
  }
  function grammarAct() {
    var x = nextGrammar(); if (!x) return null;
    return { txt: "Grammar: " + x.g.title.zh + (x.day ? " · from Day " + x.day + ", never practised" : ""), href: "#/grammar/" + x.g.id };
  }

  /* Weekly review quiz: about 10 questions only on what came in during the last 7 days, the words added to review
     (word meaning, both ways) and the grammar points practised. Offered on Home from Friday (the 5th day of the week),
     or earlier once 10 new words came in that week, until it is done that week (state.wquiz[week start]). */
  var WQ_N = 10;
  function wqWeek() { return weekStart(Store.today()); }
  function wqPool() {
    var s = Store.state, from = Store.addDays(Store.today(), -6);
    var words = Object.keys(s.srs).filter(function (id) { var c = s.srs[id]; return c && c.added && c.added >= from && WORDMAP[id]; }).map(function (id) { return WORDMAP[id]; });
    var gram = GLIST(4).concat(GLIST(5)).filter(function (g) { var st = s.grammar[g.id]; return st && st.d && st.d >= from && g.quiz && g.quiz.length; });
    return { from: from, words: words, gram: gram };
  }
  function wqOffer() {
    var s = Store.state, t = Store.today(), ws = wqWeek();
    if ((s.wquiz || {})[ws]) return null;
    var p = wqPool(), fresh = p.words.filter(function (w) { return s.srs[w.id].added >= ws; }).length;
    if (p.words.length + p.gram.length < 4) return null; // too little for a quiz
    if (Store.daysBetween(ws, t) < 4 && fresh < 10) return null;
    return p;
  }
  function wqCard() {
    var p = wqOffer(); if (!p) return "";
    return '<a class="cta card g-teal wq-cta" href="#/weekly"><span class="cta-l"><small>Weekly review · once a week</small><b>🧠 Quiz on this week\'s words</b><em>' +
      plural(p.words.length, "new word") + (p.gram.length ? " · " + plural(p.gram.length, "grammar point") : "") + " from the last 7 days</em></span><span class=\"cta-go\">▶</span></a>";
  }
  function wqRow() {
    var r = (Store.state.wquiz || {})[wqWeek()], p = wqPool(), n = p.words.length + p.gram.length;
    return '<a class="trackrow toolrow wq-row" href="#/weekly"><span class="t-ico">🧠</span><span class="tr-t"><small>' + (r ? "Weekly review · done this week ✓ " + r.s + "/" + r.n : "Weekly review quiz") + "</small><b>" +
      (n ? plural(p.words.length, "word") + (p.gram.length ? " · " + plural(p.gram.length, "grammar point") : "") + " from the last 7 days" : "Words and grammar from the last 7 days") + '</b></span><span class="tr-go">›</span></a>';
  }
  function wqQuestions(p) {
    var per = shuffle(p.gram).map(function (g) { return shuffle(g.quiz.map(function (q, k) { return { g: g, k: k }; })).slice(0, 2); }), gq = [];
    [0, 1].forEach(function (r) { per.forEach(function (l) { if (l[r]) gq.push(l[r]); }); }); // one question per point first, then a second one
    var words = shuffle(p.words), nG = Math.min(gq.length, Math.max(Math.min(4, gq.length), WQ_N - words.length)), nW = Math.min(words.length, WQ_N - nG);
    return shuffle(gq.slice(0, nG).map(function (x) { return { kind: "g", g: x.g, k: x.k }; }).concat(words.slice(0, nW).map(function (w) { return { kind: "w", w: w }; })));
  }
  function viewWeeklyQuiz() {
    var qs = wqQuestions(wqPool()), i = 0, right = 0, ws = wqWeek();
    workDone = false;
    if (!qs.length) {
      render('<div class="card result">' + UI.mascot("think", 88) + '<h2>Nothing to review yet</h2><p class="sub">The weekly quiz asks about the words you added to review and the grammar you practised in the last 7 days. Add a lesson\'s words or practise a grammar point first.</p><div class="actions center"><a class="btn primary" href="#/learn">Learn</a></div></div>', "learn");
      return;
    }
    function head() {
      return '<div class="ghead"><a class="pill" href="#/learn" aria-label="Close quiz">✕</a><b>🧠 Weekly review</b><span class="ghr">' + (i + 1) + "/" + qs.length + "</span></div>" +
        '<div class="bar"><span style="width:' + (i / qs.length * 100) + '%"></span></div>';
    }
    function finish() {
      var s = Store.state; s.wquiz = s.wquiz || {};
      var prev = s.wquiz[ws];
      s.wquiz[ws] = { s: Math.max(prev ? prev.s : 0, right), n: qs.length };
      Store.save();
      render('<div class="card result wq-result">' + UI.mascot(right >= qs.length * 0.8 ? "cheer" : right >= qs.length / 2 ? "happy" : "sad", 96) + "<h2>" + right + " / " + qs.length + "</h2>" +
        '<p class="sub">' + (prev ? "Practised again · best this week " + s.wquiz[ws].s + "/" + qs.length : "Weekly review done ✓ · the next one comes next week") + "</p>" +
        '<p class="xp-earn">+' + right * 2 + ' XP</p><div class="actions center"><a class="btn primary" href="#/">Home</a><a class="btn" href="#/weekly" id="wq-again">↻ Again</a></div></div>', "learn");
      document.getElementById("wq-again").onclick = function (ev) { ev.preventDefault(); viewWeeklyQuiz(); };
      if (right >= qs.length * 0.8) UI.confetti(90);
      Game.award(right * 2); // like the other quizzes: 2 XP a right answer
    }
    (function draw() {
      if (i >= qs.length) return finish();
      var x = qs[i];
      if (x.kind === "w") { // reuse the Quick Quiz question: a miss brings the word back for review today
        var q = Games._q.makeQ(x.w, ["h2m", "m2h"]);
        render(head() + Games._q.qHTML(q), "learn");
        Games._q.wireQ(q, function (ok) { if (ok) right++; markWork(); i++; draw(); });
        return;
      }
      var gq = x.g.quiz[x.k], ord = shuffle(gq.options.map(function (o, k) { return k; }));
      render(head() + '<div class="card qcard" id="qcard"><p class="sub">📐 <span class="zh">' + esc(x.g.title.zh) + '</span></p><p class="q zh">' + esc(gq.q) + '</p><div class="opts">' +
        ord.map(function (o, n) { return '<button class="opt" data-k="' + o + '"><span class="opt-n">' + "ABCD"[n] + '</span><span class="zh">' + esc(gq.options[o]) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>', "learn");
      wireMC(gq.answer, function (ok) {
        if (ok) right++; markWork();
        Learn.record("gr:" + x.g.id + ":" + x.k, { kind: "gram", skill: gLvl(x.g.id) === 5 ? "h5-grammar" : "grammar", g: x.g.id, i: x.k }, ok);
        return M(gq.explain);
      }, function () { i++; draw(); });
    })();
  }

  /* Lesson catch-up. While the plan says "behind" and new lessons still run (not in the final 14 days, not after the exam),
     Home offers up to CU_PER_DAY short lessons a day: the next open lessons, each cut to its key words (flashcards),
     its grammar box and a 5-question word check, with no dialogue, exercises or full quiz.
     Pace: passing the check (4/5) marks the lesson completed, so it counts toward the plan, and flags it cu = date.
     The Study plan says how many were catch-ups, and the flag goes when the full lesson quiz is passed.
     A failed check counts for nothing (the words still go into review), so pace only moves when the words were known. */
  var CU_PER_DAY = 2, CU_WORDS = 6;
  /* key words: the lesson's HSK words first (what the exam tests), topped up with its C&B words; a review day takes its weakest words */
  function cuWords(d) {
    var ws = dayWords(d).slice();
    if (d.type === "review") ws.sort(function (a, b) { return ((SRS.get(a.id) || {}).box || 0) - ((SRS.get(b.id) || {}).box || 0); });
    var hsk = ws.filter(function (w) { return /^HSK[1-6]$/.test(w.level || ""); });
    return hsk.concat(ws.filter(function (w) { return hsk.indexOf(w) < 0; })).slice(0, CU_WORDS);
  }
  function cuToday() { var s = Store.state, t = Store.today(); return Object.keys(s.days).filter(function (k) { return s.days[k] && s.days[k].cu === t; }).length; }
  function cuLessons() {
    var p = planInfo(), s = Store.state, left = CU_PER_DAY - cuToday();
    if (p.status !== "behind" || p.inBuffer || p.afterExam || left <= 0) return [];
    return DAYS.filter(function (d) { return d.day <= coreCut() && !(s.days[d.day] || {}).completed && dayWords(d).length; }).slice(0, left);
  }
  function cuCard(list) {
    var p = planInfo();
    return '<a class="cta card g-coral cu-cta" href="#/catchup"><span class="cta-l"><small>⏳ Behind plan · ' + plural(p.done, "lesson") + " done, " + p.expected + " planned by now</small><b>Catch up: " + plural(list.length, "short lesson") + " today</b><em>Day " +
      list.map(function (d) { return d.day; }).join(" + Day ") + ': key words and the grammar point, no long dialogue</em></span><span class="cta-go">▶</span></a>';
  }
  function viewCatchup() {
    var list = cuLessons(), k = 0, myHash = "#/catchup", res = [];
    workDone = false;
    if (!list.length) {
      render('<div class="card result">' + UI.mascot("happy", 88) + '<h2>No catch-up needed today</h2><p class="sub">Short catch-up lessons are offered while you are behind the study plan, up to ' + CU_PER_DAY + ' a day, until the last ' + BUFFER_DAYS + ' days before the exam.</p><div class="actions center"><a class="btn primary" href="#/">Home</a><a class="btn" href="#/plan">Study plan</a></div></div>', "home");
      return;
    }
    function head(d, what) { return '<div class="ghead"><a class="pill" href="#/" aria-label="Stop catch-up">✕</a><b>⏳ Day ' + d.day + " · " + what + '</b><span class="ghr">' + (k + 1) + "/" + list.length + "</span></div>"; }
    function lesson() {
      if (location.hash !== myHash) return;
      if (k >= list.length) return summary();
      var d = list[k], ws = cuWords(d);
      SRS.addMany(ws.map(function (w) { return w.id; }));
      runDeck({ title: "Day " + d.day + " · key words", words: ws, mode: "learn", back: "#/", onDone: function () { grammar(d, ws); } });
    }
    function grammar(d, ws) {
      if (location.hash !== myHash) return;
      var g = d.grammar; if (!g) return check(d, ws);
      render(head(d, "grammar") + '<div class="card grammar cu-gram"><div class="g-point"><span class="zh">' + esc(g.point) + "</span>" + PY(g.py) + '</div><p class="g-mean">' + M(g.meaning) + "</p>" +
        '<pre class="structure zh">' + esc(g.structure) + '</pre><p class="g-exp">' + M(g.explain) + "</p></div>" +
        (g.examples || []).slice(0, 2).map(function (e) { return '<div class="card ex"><div class="ex-zh"><span class="zh">' + esc(e.zh) + "</span>" + SAY(e.zh) + "</div>" + PY(e.py) + '<div class="tr">' + M(e) + "</div></div>"; }).join("") +
        '<div class="actions center"><button type="button" class="btn primary big" id="cu-next">Got it · 5-question check ›</button></div>', "learn");
      document.getElementById("cu-next").onclick = function () { check(d, ws); };
    }
    function check(d, ws) {
      var qs = shuffle(ws).slice(0, 5), i = 0, right = 0;
      (function draw() {
        if (location.hash !== myHash) return;
        if (i >= qs.length) return result(d, ws, right, qs.length);
        var q = Games._q.makeQ(qs[i], ["h2m", "m2h"]);
        render(head(d, "check " + (i + 1) + "/" + qs.length) + '<div class="bar"><span style="width:' + (i / qs.length * 100) + '%"></span></div>' + Games._q.qHTML(q), "learn");
        Games._q.wireQ(q, function (ok) { if (ok) right++; markWork(); i++; draw(); });
      })();
    }
    function result(d, ws, right, n) {
      var pass = right >= Math.ceil(n * 0.8), rec = Store.day(d.day), last = k + 1 >= list.length;
      if (pass && !rec.completed) { rec.completed = true; rec.completedOn = Store.today(); rec.cu = Store.today(); }
      Store.save();
      if (pass) res.push(d.day);
      render('<div class="card result cu-result">' + UI.mascot(pass ? "cheer" : "think", 88) + "<h2>Day " + d.day + ": " + right + " / " + n + "</h2>" +
        '<p class="sub">' + (pass ? "Counts as done ✓ (catch-up). The dialogue and the full quiz stay open for later." : "Not counted yet: get " + Math.ceil(n * 0.8) + " of " + n + ". The words are in your review deck.") + "</p>" +
        '<div class="actions center">' + (pass ? "" : '<button type="button" class="btn' + (last ? " primary" : "") + '" id="cu-retry">↻ Check again</button>') +
        '<button type="button" class="btn' + (pass || !last ? " primary" : "") + '" id="cu-on">' + (last ? "Finish" : "Next lesson ›") + "</button></div></div>", "home");
      var rt = document.getElementById("cu-retry"); if (rt) rt.onclick = function () { check(d, ws); };
      document.getElementById("cu-on").onclick = function () { k++; lesson(); };
      if (pass && !rec.cuPaid) { rec.cuPaid = true; Store.save(); Game.award(right * 2, { silent: true }); }
    }
    function summary() {
      var p = planInfo();
      render('<div class="card result">' + UI.mascot(res.length ? "cheer" : "happy", 96) + "<h2>" + (res.length ? "Caught up " + plural(res.length, "lesson") + " 🎉" : "Catch-up finished") + "</h2>" +
        '<p class="sub">' + p.done + " of " + p.total + " lessons done · " + p.expected + " planned by now.</p>" +
        '<div class="actions center"><a class="btn primary" href="#/">Home</a><a class="btn" href="#/plan">Study plan</a></div></div>', "home");
      if (res.length) UI.confetti(100);
    }
    render('<div class="card result"><h2>⏳ Catch-up · ' + plural(list.length, "short lesson") + '</h2><p class="sub">For each lesson: its key words as flashcards, the grammar point, then a 5-question check. Get 4 of 5 and the lesson counts as done; the dialogue and the full quiz stay open for later.</p><div class="tasks">' +
      list.map(function (d) { return '<div class="task"><span class="tk-ico">📖</span><span>Day ' + d.day + ' · <span class="zh">' + esc(d.title.zh) + "</span> · " + plural(cuWords(d).length, "word") + (d.grammar || d._g ? " + grammar" : "") + "</span></div>"; }).join("") +
      '</div><button type="button" class="btn primary big" id="cu-go">▶ Start</button></div>', "home");
    document.getElementById("cu-go").onclick = lesson;
  }

  /* ---------- official practice log + score forecast ---------- */
  var OFFICIAL_LINKS = [
    { name: "Official HSK site (Chinese Testing International)", url: "https://www.chinesetest.cn/" },
    { name: "Study4 · HSK 4 practice tests", url: "https://study4.com/tests/hsk-4/" }
  ];
  function viewOfficial(sub) {
    var list = byDate(Store.state.official || []), real = sub === "real", ex = Store.state.settings.examDate || Store.today();
    freezeForecast();
    var html = '<section class="card g-blue"><h2>📄 Official practice</h2><p class="sub">Practise with official HSK 4 papers — the most accurate preparation — then log your section scores here. They weigh most in your score forecast.</p></section>' +
      realCompareHTML() + forecastCard(false) +
      '<section class="card"><h2>Where to get official papers</h2><p class="sub"><b>Best:</b> the official book <span class="zh">《HSK真题集 四级》</span> (Official Examination Papers of HSK Level 4, Chinese Testing International) with its audio — bookshops such as Fahasa or Tiki, or a Chinese centre. Your 14 Nov exam uses the HSK 2.0 format, so use HSK 2.0 papers (codes like H41xxx), not HSK 3.0 samples.</p>' +
      OFFICIAL_LINKS.map(function (r) { return '<a class="res-link" href="' + esc(r.url) + '" target="_blank" rel="noopener"><span class="cta-l"><b>' + esc(r.name) + '</b></span><span class="cta-go">↗</span></a>'; }).join("") + "</section>" +
      '<section class="card"><h2>Log a paper</h2><form id="of-form" class="mw-form" autocomplete="off">' +
      '<label for="of-name">Paper</label><input id="of-name" maxlength="60" placeholder="e.g. H41003 / 真题集 Test 3"' + (real ? ' value="Real HSK ' + exLv() + ' exam"' : "") + ">" +
      '<label for="of-date">Date</label><input id="of-date" type="date" value="' + esc(real ? ex : Store.today()) + '">' +
      '<label class="of-real"><input type="checkbox" id="of-real"' + (real ? " checked" : "") + "> This is my real HSK " + exLv() + " result</label>" +
      '<div class="of-row"><div><label for="of-l">Listening</label><input id="of-l" type="number" inputmode="numeric" min="0" max="100" placeholder="/100"></div>' +
      '<div><label for="of-r">Reading</label><input id="of-r" type="number" inputmode="numeric" min="0" max="100" placeholder="/100"></div>' +
      '<div><label for="of-w">Writing</label><input id="of-w" type="number" inputmode="numeric" min="0" max="100" placeholder="/100"></div></div>' +
      '<p class="sub">Tip: section score = correct ÷ questions × 100 (e.g. 36 of 45 listening = 80).</p>' +
      '<p class="mw-err" id="of-err" hidden></p><button class="btn primary wide" type="submit">＋ Save result</button></form></section>';
    if (list.length) {
      html += '<section class="card"><h2>Your official results</h2>' + lineChart(list.slice(-12).map(function (o) { return { x: o.date.slice(5), y: o.l + o.r + o.w }; }), { max: 300, ref: 180, refLabel: "pass 180" }) +
        list.slice().reverse().map(function (o) {
          var t = o.l + o.r + o.w;
          return '<div class="of-item"><div><b>' + (o.real ? "🎓 " : "") + esc(o.name) + '</b><small>' + esc(o.date) + " · L " + o.l + " · R " + o.r + " · W " + o.w + '</small></div><span class="tag ' + (t >= 180 ? "t-hsk" : "t-warn") + '">' + t + '/300</span><button class="btn small bad-btn" data-odel="' + esc(o.id) + '" aria-label="Delete">✕</button></div>';
        }).join("") + "</section>";
    }
    render(html, "me");
    document.getElementById("of-form").onsubmit = function (e) {
      e.preventDefault();
      var g = function (id) { return document.getElementById(id).value.trim(); }, err = document.getElementById("of-err");
      var nums = ["of-l", "of-r", "of-w"].map(function (id) { return g(id) === "" ? NaN : +g(id); });
      if (nums.some(function (x) { return !isFinite(x) || x < 0 || x > 100; })) { err.textContent = "Enter each section score from 0 to 100."; err.hidden = false; return; }
      Store.state.official.push({ id: Date.now().toString(36), date: /^\d{4}-\d{2}-\d{2}$/.test(g("of-date")) ? g("of-date") : Store.today(), name: g("of-name") || "Official paper", l: Math.round(nums[0]), r: Math.round(nums[1]), w: Math.round(nums[2]), real: document.getElementById("of-real").checked });
      Store.save(); Game.award(10); UI.toast("Official result saved", "📄");
      if (document.getElementById("of-real").checked && realResult()) { location.hash = "#/exams"; return; } // straight on to "what's next"
      viewOfficial();
    };
    app.querySelectorAll("[data-odel]").forEach(function (b) {
      b.onclick = function () {
        if (!window.confirm("Delete this result?")) return;
        var id = b.getAttribute("data-odel"); Store.state.official = Store.state.official.filter(function (o) { return o.id !== id; }); Store.save(); viewOfficial();
      };
    });
  }
  /* Forecast: recency-weighted average per section. Official papers count 2.5×, app mocks in exam mode 1×,
     practice mode 0.6×. The range widens when there's little data or scores vary a lot. */
  /* Repeats: a retaken mock set measures memory of its answers as much as ability, so the forecast is built
     from first attempts. The last 3 repeats still count at 0.3× (REP_W) so recent progress shows a little,
     but a few retakes can never outweigh one fresh set. Official papers are not affected. */
  var REP_W = 0.3;
  function forecast() {
    var s = Store.state, pts = [], hist = mockHist();
    var firsts = hist.filter(function (x) { return !x.rep; }).slice(-6).reverse(), reps = hist.filter(function (x) { return x.rep; }).slice(-3).reverse();
    /* practice mode (instant feedback) and short 40-question sets say less about the real 100-question exam; writing the
       learner marked against a model (instead of the AI examiner) counts at half weight. Older entries: set size from the test. */
    var nShort = 0, nSelf = 0;
    var appPt = function (w) { return function (x, k) {
      var h = x.h, mm = MOCKMAP[h.id], short = h.full === false || (h.full == null && (mm ? !mm.full : (window.CB_MOCK_FULL || [4, 5, 6]).indexOf(h.id) < 0)), self = h.ws !== false;
      if (short) nShort++; if (self) nSelf++;
      var ww = w * (h.mode === "practice" ? 0.6 : 1) * (short ? 0.7 : 1) * Math.pow(0.8, k);
      pts.push({ w: ww, ww: ww * (self ? 0.5 : 1), l: num(h.sections.listening), r: num(h.sections.reading), wr: num(h.sections.writing), src: "app" });
    }; };
    byDate(s.official || []).slice(-6).reverse().forEach(function (o, k) { var wo = 2.5 * Math.pow(0.8, k); pts.push({ w: wo, ww: wo, l: o.l, r: o.r, wr: o.w, src: "official" }); });
    firsts.forEach(appPt(1));
    if (firsts.length) reps.forEach(appPt(REP_W)); else reps = []; // with no first attempt at all (old odd data) nothing is discounted
    if (!firsts.length) hist.slice(-6).reverse().forEach(appPt(1));
    if (!pts.length) return null;
    var W = pts.reduce(function (a, p) { return a + p.w; }, 0), WW = pts.reduce(function (a, p) { return a + p.ww; }, 0);
    var avg = function (f) { return pts.reduce(function (a, p) { return a + p.w * p[f]; }, 0) / W; };
    var L = avg("l"), R = avg("r"), Wr = pts.reduce(function (a, p) { return a + p.ww * p.wr; }, 0) / WW, T = L + R + Wr;
    var sd = Math.sqrt(pts.reduce(function (a, p) { var t = p.l + p.r + p.wr; return a + p.w * (t - T) * (t - T); }, 0) / W);
    var spread = Math.round(Math.max(pts.length === 1 ? 25 : 12, sd * 1.2));
    var weakest = [["Listening", L], ["Reading", R], ["Writing", Wr]].sort(function (a, b) { return a[1] - b[1]; })[0];
    return { total: Math.round(T), lo: Math.max(0, Math.round(T - spread)), hi: Math.min(300, Math.round(T + spread)), L: Math.round(L), R: Math.round(R), W: Math.round(Wr), weakest: weakest[0],
      nOff: Math.min(6, (s.official || []).length), nApp: firsts.length || Math.min(6, hist.length), nRep: reps.length, nShort: nShort, nSelf: nSelf };
  }
  /* "2 official + 3 first-attempt mocks + 1 repeat (counts less)" */
  function fcBasis(f) {
    return (f.nOff ? f.nOff + " official paper" + (f.nOff > 1 ? "s" : "") : "") + (f.nOff && f.nApp ? " + " : "") +
      (f.nApp ? f.nApp + " first-attempt mock" + (f.nApp > 1 ? "s" : "") : "") + (f.nRep ? " + " + f.nRep + " repeat" + (f.nRep > 1 ? "s" : "") + " (count less)" : "");
  }
  /* Mock history in date order, each marked as a first attempt or a repeat of a set seen before (in any mode).
     New entries store rep; older saved entries get it from the order, so old data needs no migration. */
  function mockHist() {
    var seen = {};
    return byDate(Store.state.mockHistory || []).map(function (h) { var rep = h.rep === true || !!seen[h.id]; seen[h.id] = 1; return { h: h, rep: rep }; });
  }
  function byDate(a) { return a.map(function (x, i) { return [x, i]; }).sort(function (p, q) { return p[0].date < q[0].date ? -1 : p[0].date > q[0].date ? 1 : p[1] - q[1]; }).map(function (p) { return p[0]; }); }
  function forecastCard(compact) {
    var f = forecast();
    if (!f) return compact ? "" : '<section class="card"><h2>🔮 Score forecast</h2><p class="sub">Take a mock exam or log an official paper to see your forecast.</p></section>';
    var verdict = f.lo >= 180 ? ["t-hsk", "Likely pass"] : f.hi < 180 ? ["t-warn", "Needs work"] : ["t-dom", "Borderline"];
    var basis = fcBasis(f);
    if (compact) return '<a class="cta card g-teal fc-mini" href="#/official"><span class="cta-l"><small>Score forecast · ' + esc(basis) + "</small><b>🔮 ~" + f.total + '/300</b><em>' + f.lo + "–" + f.hi + " · focus: " + f.weakest + '</em></span><span class="tag ' + verdict[0] + '">' + verdict[1] + "</span></a>";
    return '<section class="card"><div class="sec-h"><h2>🔮 Score forecast</h2><span class="tag ' + verdict[0] + '">' + verdict[1] + '</span></div>' +
      '<p class="score-big">~' + f.total + ' <small>/300 · likely ' + f.lo + "–" + f.hi + "</small></p>" +
      secBar("Listening", f.L) + secBar("Reading", f.R) + secBar("Writing", f.W) +
      '<p class="sub">Based on ' + esc(basis) + ". Official papers count most. Focus next: <b>" + f.weakest + "</b>." + (f.nOff ? "" : " Log an official paper for a more reliable forecast.") + "</p>" +
      (f.nShort || f.nSelf ? '<p class="sub fc-honest">Counted less: ' + [f.nShort ? plural(f.nShort, "short 40-question set") : "", f.nSelf ? "writing you marked yourself in " + plural(f.nSelf, "mock") : ""].filter(Boolean).join(" · ") + ". A full mock in the exam simulator, with AI-scored writing, gives the truest number.</p>" : "") + "</section>";
  }
