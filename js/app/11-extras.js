  /* ---------- loading placeholders ---------- */
  function skeleton() {
    return '<div class="skel" aria-label="Loading" role="status"><i class="sk-h"></i><i class="sk-card"></i><i class="sk-line"></i><i class="sk-line short"></i><i class="sk-card"></i></div>';
  }

  /* ---------- "leave this quiz?" ----------
     While a quiz, game, mock exam, flashcard deck, drill or session is in progress (at least one answer
     given and no result screen yet), tapping the tab bar or logo asks before leaving. */
  var workDone = false;
  function markWork() { workDone = true; }
  function inActivity() {
    var p = location.hash.replace(/^#\/?/, "").split("/"), v = p[0];
    var active = v === "game" || v === "cards" || v === "session" || (v === "day" && p[2] === "quiz") ||
      (v === "mock" && p[2] && !/^(result|review|sim)$/.test(p[2])) || (v === "mistakes" && p[1]) || (v === "parts" && p[1]) || (v === "grammar" && p[2] === "practice") || v === "check";
    return active && (workDone || simRunning()) && !app.querySelector(".result, .score-big");
  }
  function simRunning() { return !!(EXAM && EXAM.strict && !EXAM.finished && /^#\/mock\/\d+\/(listening|reading|writing)/.test(location.hash)); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".tabbar a, .appbar .brand");
    if (!a || !inActivity()) return;
    var msg = simRunning() ? "Leave the exam simulator? The attempt will end and your answers will be lost." : "Leave now? Your progress in this activity won't be saved.";
    if (!window.confirm(msg)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* A link to the page you're already on fires no hashchange (e.g. ✕/Done in a Review deck, or the current tab):
     re-render so it still does what it says. Runs after the leave prompt and element handlers. */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    var a = e.target.closest("a[href^='#']"); if (!a) return;
    var h = a.getAttribute("href"), cur = location.hash || "#/";
    if (h === cur || (h === "#/" && cur === "#")) { e.preventDefault(); route(); }
  });

  /* ---------- first-run guide ---------- */
  var GUIDE = [
    { icon: "📚", t: "Learn", d: "30 days of C&B lessons, plus <b>HSK 4 Core</b>: 505 general exam words in 25 sets. Tap any word in a dialogue for its meaning." },
    { icon: "🔁", t: "Review & mistakes", d: "Add words to review, then do your due flashcards every day. Wrong answers collect in the <b>mistake notebook</b> until you get them right twice." },
    { icon: "▶️", t: "Today's session", d: "One tap on Home runs a 15-minute mix: reviews, new words, mistakes, typing and listening. Mock exams and your study plan are on Home too." }
  ];
  function showGuide() {
    if (document.querySelector(".modal-wrap.guide")) return;
    var i = 0, wrap = document.createElement("div");
    wrap.className = "modal-wrap guide";
    document.body.appendChild(wrap);
    function done() { Store.state.settings.onboarded = true; Store.save(); wrap.classList.remove("show"); setTimeout(function () { wrap.remove(); }, 250); }
    /* First run: one short step with the defaults already chosen, so Continue can be tapped straight away.
       Daily goal and the rest keep their defaults and can be changed under Me; the guide pages are under Me → App guide. */
    function setup() {
      var st = Store.state.settings, ex = st.examDate || "2026-11-14";
      function opts(list, cur) { return list.map(function (g) { return '<button type="button" class="su-o' + (cur === g[0] ? " on" : "") + '" aria-pressed="' + (cur === g[0]) + '" data-v="' + g[0] + '"><b>' + g[1] + "</b><small>" + g[2] + "</small></button>"; }).join(""); }
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-t"><div class="g-mas">' + UI.mascot("wave", 52) + '</div><h2 id="guide-t">Welcome! Two quick choices</h2>' +
        '<label class="su-l" for="su-exam">When is your HSK 4 exam?</label><input type="date" id="su-exam" value="' + esc(ex) + '">' +
        '<p class="su-l">When will you study?</p><div class="su-opts su-4" id="su-time">' +
        opts([["07:00", "Morning", "7:00"], ["12:30", "Lunch", "12:30"], ["20:00", "Evening", "20:00"], ["21:30", "Late", "21:30"]], st.remindTime || "20:00") + "</div>" +
        '<p class="su-l">Days a week</p><div class="su-opts" id="su-days">' +
        opts([["3", "3 days", "light"], ["5", "5 days", "steady"], ["7", "Daily", "fastest"]], String(st.weeklyDays || 5)) + "</div>" +
        '<p class="sub su-note">You can change these, and your daily goal, under Me.</p>' +
        '<div class="actions center"><button class="btn primary" id="su-go">Continue ›</button></div></div>';
      ["su-time", "su-days"].forEach(function (id) {
        wrap.querySelector("#" + id).onclick = function (e) {
          var b = e.target.closest(".su-o"); if (!b) return;
          Array.prototype.forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
        };
      });
      wrap.querySelector("#su-go").onclick = function () {
        var d = wrap.querySelector("#su-exam").value, tm = wrap.querySelector("#su-time .on"), wd = wrap.querySelector("#su-days .on");
        if (d) st.examDate = d; if (tm) st.remindTime = tm.dataset.v; if (wd) st.weeklyDays = parseInt(wd.dataset.v, 10);
        st.setupDone = true; applySettings(); done();
        if (/^#?\/?$/.test(location.hash)) route(); // Home shows the new exam date and weekly goal
      };
    }
    function draw() {
      if (!Store.state.settings.setupDone && !(Store.state.settings.onboarded)) { setup(); return; }
      var g = GUIDE[i];
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-t"><div class="g-ico">' + g.icon + '</div><h2 id="guide-t">' + g.t + "</h2><p>" + g.d + "</p>" +
        '<div class="g-dots">' + GUIDE.map(function (_, k) { return '<i class="' + (k === i ? "on" : "") + '"></i>'; }).join("") + "</div>" +
        '<div class="actions center"><button class="btn" id="g-skip">' + (i < GUIDE.length - 1 ? "Skip" : "Close") + '</button><button class="btn primary" id="g-next">' + (i < GUIDE.length - 1 ? "Next ›" : "Let's go!") + "</button></div></div>";
      wrap.querySelector("#g-skip").onclick = done;
      wrap.querySelector("#g-next").onclick = function () { if (i < GUIDE.length - 1) { i++; draw(); } else done(); };
    }
    draw();
    requestAnimationFrame(function () { wrap.classList.add("show"); });
  }


  /* ---------- role-play chat (AI plays the other person; you are HR) ----------
     Scenes, goals and the company rules card live in js/talk.js (window.CB_TALK); the server has the same rules plus a
     hidden twist per scene. Each session picks a random twist and mood, so the same scene plays out differently. */
  var TALK_KEY = "cbChinese.talk";
  function talkPrefs() {
    var o = {}; try { o = JSON.parse(localStorage.getItem(TALK_KEY)) || {}; } catch (e) { o = {}; }
    if (o.level !== "hsk4" && o.level !== "hsk5") o.level = +Store.state.settings.level === 5 ? "hsk5" : "hsk4";
    o.read = o.read !== false; o.best = o.best && typeof o.best === "object" ? o.best : {};
    return o;
  }
  function saveTalkPrefs(o) { try { localStorage.setItem(TALK_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function talkScene(id) { return (window.CB_TALK || []).filter(function (x) { return x.id === id; })[0] || null; }
  function L(o) { return o ? M({ en: o.en, vi: o.vi }) : ""; }
  /* o (Today's session): { mini: replies before the score, onDone(score|null), exit } — a short talk that hands back to the session */
  function viewTalk(id, o) {
    o = o || {};
    var sc = talkScene(id), pr = talkPrefs();
    if (!sc) {
      var grp = function (g, title) {
        return '<h3 class="talk-grp">' + title + '</h3><div class="glist">' + (window.CB_TALK || []).filter(function (x) { return x.group === g; }).map(function (t) {
          var best = pr.best[t.id];
          return '<a class="grow" href="#/talk/' + t.id + '"><span class="g-ico">' + t.icon + '</span><span class="g-txt"><b>' + L(t.t) + "</b><small>" + L(t.d) + (best != null ? " · best " + best + "/10" : "") + '</small></span><span class="g-go">▶</span></a>';
        }).join("") + "</div>";
      };
      render('<section class="card"><h2>🗣️ Role-play</h2><p class="sub">You are the HR person. The AI plays an employee, candidate or manager with a real problem, a mood and a detail you don\'t know yet. Use the company rules to solve the case; after that the talk moves on to related topics, so you can keep practising as long as you like. Tap Finish for your score. Each reply shows corrections, a level-up version of your sentence and new words.</p>' +
        '<div class="seg talk-lvl" role="group" aria-label="Language level"><button type="button" class="chip' + (pr.level === "hsk4" ? " on" : "") + '" data-lvl="hsk4" aria-pressed="' + (pr.level === "hsk4") + '">HSK 4</button><button type="button" class="chip' + (pr.level === "hsk5" ? " on" : "") + '" data-lvl="hsk5" aria-pressed="' + (pr.level === "hsk5") + '">HSK 5</button></div></section>' +
        grp("chat", "Just chat") + grp("daily", "Everyday HR") + grp("law", "Law & policy") +
        (window.AI && AI.configured() ? "" : '<p class="warn">Set up AI first: Me → AI assistant.</p>'), "games");
      [].forEach.call(document.querySelectorAll("[data-lvl]"), function (bt) { bt.onclick = function () { pr.level = bt.getAttribute("data-lvl"); saveTalkPrefs(pr); viewTalk(); }; });
      return;
    }
    var hist = [], turns = 0, busy = false, finished = false, dead = false, lastHint = "", MAX = o.mini || 20;
    var variant = Math.floor(Math.random() * 1000), mood = Math.floor(Math.random() * 1000);
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    function bubbleAI(r, words) {
      return '<div class="tb tb-ai"><div class="tb-who">' + sc.icon + ' ' + L(sc.t) + '</div><div class="zh">' + esc(r.zh) + SAY(r.zh) + "</div>" + PY(r.py || r.pinyin || "") + '<div class="dim">' + (r.meaning ? esc(r.meaning) : M(r)) + "</div>" +
        ((words || []).length ? '<div class="tb-words">' + words.map(function (w) { return '<span class="tw"><b class="zh">' + esc(w.zh) + "</b> " + esc(w.pinyin) + " · " + esc(w.meaning) + "</span>"; }).join("") + "</div>" : "") + "</div>";
    }
    function nearBottom() { var d = document.documentElement; return d.scrollHeight - (window.scrollY + window.innerHeight) < 160; }
    var lastTouch = 0; document.addEventListener("touchmove", function () { lastTouch = Date.now(); }, { passive: true });
    function paint(force) { var el = document.getElementById("talk-log"); if (!el) return; if (!force && !nearBottom()) return; el.scrollTop = el.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }
    function readAloud(zh) { if (pr.read && zh) Audio2.play(zh); }
    render('<div class="ghead"><a class="pill" href="' + (o.exit || "#/talk") + '">✕</a><b>' + sc.icon + " " + L(sc.t) + '</b><span class="ghr" id="t-n">0/' + MAX + '</span></div>' +
      '<section class="card talk-brief"><p><b>Your goal:</b> ' + L(sc.goal) + ' <span class="tag">' + (pr.level === "hsk5" ? "HSK 5" : "HSK 4") + "</span></p>" +
      (o.mini ? '<p class="sub" id="t-mini">Mini talk: ' + o.mini + " replies, then your score. Then the session goes on.</p>" : "") +
      '<details class="talk-rules"' + (pr.best[sc.id] == null ? " open" : "") + '><summary>📋 Company rules for this case</summary><ul>' + sc.rules.map(function (r) { return "<li>" + L(r) + "</li>"; }).join("") + "</ul></details>" +
      '<label class="talk-read"><input type="checkbox" id="t-read"' + (pr.read ? " checked" : "") + "> 🔊 Read replies aloud</label></section>" +
      '<div id="talk-log" class="talk-log" aria-live="polite"></div>' +
      '<div class="talk-in"><div class="talk-hint"><button type="button" class="chip" id="t-hint">💡 Hint</button><span id="t-hint-t" class="dim"></span></div>' +
      '<div class="talk-row"><input id="t-text" class="zh" lang="zh-CN" maxlength="120" autocomplete="off" aria-label="Your reply in Chinese" placeholder="用中文回答…">' +
      (SR ? '<button type="button" class="btn small" id="t-mic" aria-label="Speak in Chinese">🎤</button>' : "") +
      '<button type="button" class="btn primary small" id="t-send">Send</button></div>' +
      (SR ? "" : '<p class="sub">Voice input is not available in this browser. Use your pinyin keyboard.</p>') +
      '<div class="actions center"><button type="button" class="btn small" id="t-fin" hidden>🏁 Finish and get my score</button>' + (o.onDone ? '<button type="button" class="btn small" id="t-skip">Skip this step ›</button>' : "") + "</div></div>", "games");
    var log = document.getElementById("talk-log"), inp = document.getElementById("t-text"), fin = document.getElementById("t-fin");
    document.getElementById("t-read").onchange = function () { pr.read = this.checked; saveTalkPrefs(pr); if (!pr.read) Audio2.stop(); };
    document.getElementById("t-hint").onclick = function () { document.getElementById("t-hint-t").textContent = lastHint || "试试问：具体是哪一项？"; };
    function opening(r, words) {
      hist.push({ role: "ai", zh: r.zh }); log.insertAdjacentHTML("beforeend", bubbleAI(r, words)); paint(true);
    }
    // The AI writes its own opening (different every time); offline or on error, the scene's fixed opening is used.
    if (window.AI && AI.available()) {
      var w0 = document.createElement("div"); w0.className = "tb tb-ai"; w0.textContent = "…"; log.appendChild(w0); busy = true;
      AI.call("roleplay", { scene: sc.id, start: true, history: [], variant: variant, mood: mood, level: pr.level }).then(function (res) { if (dead || !log.isConnected) return;
        busy = false; w0.remove();
        if (res.ok && res.result.reply) { opening(res.result.reply, res.result.words); lastHint = res.result.hint ? res.result.hint + (res.result.hint_pinyin ? " · " + res.result.hint_pinyin : "") : ""; }
        else opening(sc.open);
      });
    } else opening(sc.open);
    function finish(sm) {
      finished = true; var met = sm && sm.goal_met; Game.award(met ? 20 : 15); markWork();
      try { var tl = Store.state.talkLog || (Store.state.talkLog = []); tl.push({ d: Store.today(), id: sc.id, s: sm && sm.score != null ? Math.max(0, Math.min(10, Math.round(sm.score))) : null, g: !!met, l: pr.level === "hsk5" ? 5 : 4 }); if (tl.length > 60) tl.splice(0, tl.length - 60); Store.save(); syncSoon(); } catch (e) { /* the log is only for the teacher's view */ }
      if (sm && sm.score != null && (pr.best[sc.id] == null || sm.score > pr.best[sc.id])) { pr.best[sc.id] = sm.score; saveTalkPrefs(pr); }
      log.insertAdjacentHTML("beforeend", '<div class="ai-card talk-end"><b>' + (sm ? (met ? "✅ Case solved" : "🟡 Case not fully solved") + " · " + sm.score + "/10" : "✅ Conversation done") + " · +" + (met ? 20 : 15) + " XP</b>" +
        (sm && sm.comment ? '<p class="ai-exp">' + esc(sm.comment) + "</p>" : "") +
        (sm && sm.phrase ? '<p class="sub">Phrase to remember: <span class="zh">' + esc(sm.phrase.zh) + "</span>" + SAY(sm.phrase.zh) + " " + esc(sm.phrase.pinyin) + " · " + esc(sm.phrase.meaning) + "</p>" : "") +
        (o.onDone ? '<p class="sub">' + turns + ' replies.</p><div class="actions center"><button type="button" class="btn primary" id="t-cont">Continue ▶</button></div></div>'
          : '<p class="sub">' + turns + ' replies. Play it again: the details and the mood change every time.</p><div class="actions center"><a class="btn" href="#/talk">More scenes</a><button type="button" class="btn primary" id="t-again">Again</button></div></div>'));
      document.querySelector(".talk-in").hidden = true;
      if (o.onDone) document.getElementById("t-cont").onclick = function () { this.disabled = true; o.onDone(sm && sm.score != null ? sm.score : 0); };
      else document.getElementById("t-again").onclick = function () { viewTalk(sc.id); };
      paint(true);
    }
    function send() {
      var text = inp.value.trim(); if (!text || busy || finished) return;
      if (!/[㐀-鿿]/.test(text)) { UI.toast("Write your reply in Chinese", "✍️"); return; }
      if (!window.AI || !AI.configured()) { UI.toast("Set up AI first: Me → AI assistant.", "🤖"); return; }
      if (pr.read) Audio2.unlock(); // inside the tap, so iPhone allows the reply to be read when it arrives
      busy = true; inp.value = ""; turns++; document.getElementById("t-n").textContent = turns + "/" + MAX;
      var my = document.createElement("div"); my.className = "tb tb-me"; my.innerHTML = '<div class="zh">' + esc(text) + "</div>"; log.appendChild(my);
      var wait = document.createElement("div"); wait.className = "tb tb-ai"; wait.textContent = "…"; log.appendChild(wait); paint(true);
      AI.call("roleplay", { scene: sc.id, text: text, history: hist.slice(-10), turns: turns, variant: variant, mood: mood, level: pr.level }).then(function (res) { if (dead || !log.isConnected) return;
        busy = false; wait.remove();
        if (!res.ok) { turns--; document.getElementById("t-n").textContent = turns + "/" + MAX; my.remove(); inp.value = text; UI.toast(AI.errMsg(res.error), "⚠️"); return; }
        var r = res.result, fb = r.feedback || {};
        hist.push({ role: "me", zh: text }); hist.push({ role: "ai", zh: r.reply.zh });
        my.insertAdjacentHTML("beforeend", (fb.changed ? '<div class="tb-fix"><b>✎ ' + esc(fb.corrected) + "</b>" + (fb.note ? "<br>" + esc(fb.note) : "") + "</div>" : '<div class="tb-ok">✓ Good</div>') +
          (fb.upgrade ? '<div class="tb-up"><span class="tb-up-l">⬆ Level up' + (fb.upgrade_point ? " · " + esc(fb.upgrade_point) : "") + '</span><span class="zh">' + esc(fb.upgrade) + "</span>" + SAY(fb.upgrade) + "</div>" : ""));
        log.insertAdjacentHTML("beforeend", bubbleAI(r.reply, r.words));
        readAloud(r.reply.zh);
        lastHint = r.hint ? r.hint + (r.hint_pinyin ? " · " + r.hint_pinyin : "") : lastHint; document.getElementById("t-hint-t").textContent = "";
        if (turns >= 3) fin.hidden = false;
        if (r.done) finish(r.summary || null);
        else if (turns >= MAX && o.mini) fin.onclick(); // mini talk: the character wraps up and the AI scores it, as with Finish
        else if (turns >= MAX) finish(r.summary || null); else { paint(); if (nearBottom()) inp.focus({ preventScroll: true }); }
      });
    }
    // Finish at any point: the character says goodbye and the AI gives the score and feedback for the whole conversation.
    fin.onclick = function () {
      if (busy || finished || !turns) return;
      if (pr.read) Audio2.unlock();
      busy = true; fin.disabled = true;
      var wait = document.createElement("div"); wait.className = "tb tb-ai"; wait.textContent = "…"; log.appendChild(wait); paint(true);
      AI.call("roleplay", { scene: sc.id, wrap: true, history: hist.slice(-10), turns: turns, variant: variant, mood: mood, level: pr.level }).then(function (res) { if (dead || !log.isConnected) return;
        busy = false; fin.disabled = false; wait.remove();
        if (!res.ok) { UI.toast(AI.errMsg(res.error), "⚠️"); return; }
        log.insertAdjacentHTML("beforeend", bubbleAI(res.result.reply, res.result.words)); readAloud(res.result.reply.zh);
        finish(res.result.summary || null);
      });
    };
    inp.addEventListener("focus", function () { setTimeout(function () { inp.scrollIntoView({ block: "center", behavior: "smooth" }); }, 300); });
    if (window.visualViewport) { var vh = window.visualViewport.height; window.visualViewport.addEventListener("resize", function () { var h = window.visualViewport.height, kb = Math.abs(h - vh) > 120; vh = h; if (kb && document.activeElement === inp && Date.now() - lastTouch > 1200) setTimeout(function () { inp.scrollIntoView({ block: "center" }); }, 50); }); }
    document.getElementById("t-send").onclick = send;
    var skip = document.getElementById("t-skip"); if (skip) skip.onclick = function () { if (!finished) { finished = true; dead = true; o.onDone(null); } };
    inp.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } };
    var mic = document.getElementById("t-mic");
    if (mic) mic.onclick = function () {
      var rec = new SR(); rec.lang = "zh-CN"; rec.interimResults = false; rec.maxAlternatives = 1;
      mic.disabled = true; mic.textContent = "● …";
      rec.onresult = function (e) { inp.value = e.results[0][0].transcript; };
      rec.onerror = function () { UI.toast("Could not hear you. Check microphone permission.", "🎤"); };
      rec.onend = function () { mic.disabled = false; mic.textContent = "🎤"; if (inp.value) inp.focus(); };
      try { rec.start(); } catch (e) { mic.disabled = false; mic.textContent = "🎤"; }
    };
  }

  /* ---------- my own words ---------- */
  function viewMine() {
    var mine = Store.state.custom || [];
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search ' + WORDS.length + ' words — hanzi, pinyin, Việt, English</span></a>' + learnSeg("mine") +
      '<section class="card"><h2>Add a word from work</h2><p class="sub">Words you meet at work join flashcards, review, games and search. (There\'s no recording for your own words.)</p>' +
      '<form id="mw-form" class="mw-form" autocomplete="off">' +
      '<label for="mw-hz">Chinese</label><input id="mw-hz" class="zh" lang="zh-CN" maxlength="12" required placeholder="例如：年终奖">' +
      '<label for="mw-py">Pinyin <small>(optional)</small></label><input id="mw-py" maxlength="60" placeholder="niánzhōngjiǎng">' +
      '<label for="mw-vi">Tiếng Việt</label><input id="mw-vi" maxlength="120" placeholder="thưởng cuối năm">' +
      '<label for="mw-en">English</label><input id="mw-en" maxlength="120" placeholder="year-end bonus">' +
      '<label for="mw-ex">Example sentence <small>(optional)</small></label><input id="mw-ex" class="zh" lang="zh-CN" maxlength="60" placeholder="今年的年终奖什么时候发？">' +
      '<p class="mw-err" id="mw-err" hidden></p><button class="btn primary wide" type="submit">＋ Add word</button></form></section>';
    if (mine.length) {
      var notIn = mine.filter(function (w) { return !SRS.has(w.id); }).length;
      html += '<div class="actions"><a class="btn primary" href="#/cards/mine">🃏 Flashcards (' + mine.length + ")</a>" +
        (notIn ? '<button class="btn" id="mw-add-all">＋ Add ' + notIn + " to review</button>" : '<span class="ok-text">✓ All in review</span>') + "</div>";
      html += mine.slice().reverse().map(function (w) {
        return '<article class="word card" id="w-' + esc(w.id) + '"><div class="w-top"><div><div class="hz">' + esc(w.hanzi) + "</div>" + (w.pinyin ? PY(w.pinyin) : "") + "</div>" +
          '<button class="btn small bad-btn" data-del="' + esc(w.id) + '" aria-label="Delete ' + esc(w.hanzi) + '">Delete</button></div>' +
          '<div class="w-mean">' + M(w) + '</div><div class="tags">' + levelBadge("Mine") + boxBadge(w.id) + "</div>" +
          (w.example ? '<div class="w-ex"><div class="ex-zh"><span class="zh">' + esc(w.example.zh) + "</span></div></div>" : "") + "</article>";
      }).join("");
    } else html += '<p class="empty">No words yet — add your first one above.</p>';
    render(html, "learn");
    document.getElementById("mw-form").onsubmit = function (e) {
      e.preventDefault();
      var v = function (id) { return document.getElementById(id).value.trim(); };
      var hz = v("mw-hz"), err = document.getElementById("mw-err");
      function fail(m) { err.textContent = m; err.hidden = false; }
      if (!/[㐀-鿿]/.test(hz)) return fail("Enter the word in Chinese characters.");
      if (!v("mw-vi") && !v("mw-en")) return fail("Add a meaning in Vietnamese or English.");
      if (WORDS.some(function (w) { return w.hanzi === hz; })) return fail(hz + " is already in the app — search for it instead.");
      var w = { id: "u" + Date.now().toString(36), hanzi: hz, pinyin: v("mw-py"), vi: v("mw-vi"), en: v("mw-en"), pos: "", level: "Mine", added: Store.today() };
      if (/[㐀-鿿]/.test(v("mw-ex"))) w.example = { zh: v("mw-ex"), py: "", vi: "", en: "" };
      Store.state.custom.push(w); SRS.add(w.id); Store.save(); buildIndex();
      UI.toast(hz + " added and in review", "➕"); viewMine();
    };
    app.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-del"), w = WORDMAP[id];
        if (!window.confirm("Delete " + (w ? w.hanzi : "this word") + " from your words?")) return;
        Store.state.custom = Store.state.custom.filter(function (x) { return x.id !== id; });
        delete Store.state.srs[id]; Object.keys(Store.state.mistakes || {}).forEach(function (k) { if (k === "w:" + id) delete Store.state.mistakes[k]; });
        Store.save(); buildIndex(); refreshChrome(); viewMine();
      };
    });
    var aa = document.getElementById("mw-add-all");
    if (aa) aa.onclick = function () { SRS.addMany(mine.map(function (w) { return w.id; })); viewMine(); };
  }

  /* ---------- study reminders (calendar) ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function reminderICS(time, until) {
    var t = Store.today().replace(/-/g, ""), hm = time.split(":"), u = (until || "2026-11-14").replace(/-/g, "");
    var start = t + "T" + pad2(+hm[0]) + pad2(+hm[1]) + "00", endH = (+hm[0] + (+hm[1] + 30 >= 60 ? 1 : 0)) % 24, endM = (+hm[1] + 30) % 60;
    var url = location.href.split("#")[0];
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//cb-chinese//study reminder//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:cb-chinese-" + t + "-" + hm.join("") + "@study", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART:" + start, "DURATION:PT30M", "RRULE:FREQ=DAILY;UNTIL=" + u + "T235959",
      "SUMMARY:中文 study · C&B Chinese", "DESCRIPTION:Today's session: " + url, "URL:" + url,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Time to study Chinese 📚", "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }
  function googleCalURL(time, until) {
    var t = Store.today().replace(/-/g, ""), hm = time.split(":"), start = t + "T" + pad2(+hm[0]) + pad2(+hm[1]) + "00";
    var d = new Date(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +hm[0], +hm[1] + 30);
    var end = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00";
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("中文 study · C&B Chinese") +
      "&dates=" + start + "/" + end + "&recur=" + encodeURIComponent("RRULE:FREQ=DAILY;UNTIL=" + (until || "2026-11-14").replace(/-/g, "")) +
      "&details=" + encodeURIComponent("Today's session: " + location.href.split("#")[0]);
  }

