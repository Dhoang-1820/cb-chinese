  /* ---------- 6-month "C&B Professional Chinese" track ----------
     24 weeks x 3 short sessions, mixed in with the core course (never locked). Data: data/track_w*.js (window.CB_TRACK). */
  var trackP = null;
  var TK_BLOCKS = { templates: ["✍️", "Writing templates"], roleplay: ["🎭", "Role-plays"], cards: ["🇻🇳🇨🇳", "Vietnam vs China"], reading: ["📚", "Reading · HSK 5 bridge"] };
  var TK_KIND = { model: "Read the model", fill: "Fill the gaps", write: "Write it yourself", prep: "Get ready", script: "Choose your replies", free: "Free reply", cards: "Compare terms", words: "New words", passage: "Read and answer" };
  function trackLoaded() { return (window.CB_TRACK || []).length >= 24; }
  /* Resolve when the browser is idle, at least `ms` after now. Keeps background downloads and parsing away from first paint. */
  function whenIdle(ms) {
    return new Promise(function (res) {
      setTimeout(function () { if (window.requestIdleCallback) requestIdleCallback(function () { res(); }, { timeout: 3000 }); else res(); }, ms || 0);
    });
  }
  function ensureTrack() {
    if ((window.CB_TRACK || []).length >= 24) return Promise.resolve();
    return trackP || (trackP = loadAll(BUNDLED ? ["track.js"] : (window.CB_TRACK_FILES || [])).then(function () {
      if (!(window.CB_TRACK || []).length) trackP = null;
      else window.CB_TRACK.sort(function (a, b) { return a.week - b.week; });
    }));
  }
  function tkDone(w, i) { return !!(Store.state.track || {})["w" + w + "s" + i]; }
  function tkWeekDone(wk) { var n = 0; wk.sessions.forEach(function (s, i) { if (tkDone(wk.week, i + 1)) n++; }); return n; }
  function tkMark(w, i) { var s = Store.state; s.track = s.track || {}; if (!s.track["w" + w + "s" + i]) { s.track["w" + w + "s" + i] = true; Game.award(10); Store.save(); markWork(); } }
  function tline(t) { return '<div class="tline"><div class="zh">' + esc(t.zh) + SAY(t.zh) + "</div>" + (t.py ? PY(t.py) : "") + '<div class="dim">' + M(t) + "</div></div>"; }
  function tkOpt(label, extra) { return '<button type="button" class="opt" ' + (extra || "") + '><span class="zh">' + label + "</span></button>"; }

  function viewTrack(wn, sn) {
    render('<p class="empty">Loading…</p>', "track");
    ensureTrack().then(function () {
      var T = window.CB_TRACK || [];
      if (!T.length) { render('<p class="empty">The track could not load. Check your connection. <a href="#/learn">Back</a></p>', "track"); return; }
      var wk = T.filter(function (x) { return x.week === wn; })[0];
      if (!wn || !wk) return tkList(T);
      var ss = wk.sessions[sn - 1];
      if (!sn || !ss) return tkWeek(wk);
      tkSession(wk, sn, ss);
    });
  }
  function tkList(T) {
    var done = 0, total = T.length * 3; T.forEach(function (w) { done += tkWeekDone(w); });
    var html = '<section class="card"><h2>🎓 C&amp;B Professional Chinese</h2><p class="sub">24 weeks, three short sessions a week (15–20 min). Do them any time next to the core course. Nothing is locked.</p><div class="dbar"><i style="width:' + Math.round(done / total * 100) + '%"></i></div><p class="sub">' + done + "/" + total + " sessions done</p></section>";
    ["templates", "roleplay", "cards", "reading"].forEach(function (b) {
      html += '<h2 class="week-h"><span class="wk g' + Object.keys(TK_BLOCKS).indexOf(b) + '">' + TK_BLOCKS[b][0] + " " + TK_BLOCKS[b][1] + '</span></h2><div class="daygrid">';
      T.filter(function (w) { return w.block === b; }).forEach(function (w) {
        var n = tkWeekDone(w);
        html += '<a class="daycard card' + (n === 3 ? " done" : "") + '" href="#/track/' + w.week + '"><span class="dnum">' + (n === 3 ? "✓ " : "") + "Week " + w.week + '</span><span class="dzh zh">' + esc(w.title.zh) + '</span><span class="dmean">' + M(w.title) + '</span><span class="dbar"><i style="width:' + Math.round(n / 3 * 100) + '%"></i></span><span class="dmeta">' + n + "/3 sessions</span></a>";
      });
      html += "</div>";
    });
    render(html, "track");
  }
  function tkWeek(wk) {
    var html = '<a class="back" href="#/track">‹ All weeks</a><section class="card"><h2>' + TK_BLOCKS[wk.block][0] + " Week " + wk.week + " · " + esc(wk.title.zh) + '</h2><div class="dim">' + M(wk.title) + '</div><p class="sub">' + M(wk.goal) + "</p></section>";
    wk.sessions.forEach(function (s, i) {
      html += '<a class="cta card g-violet" href="#/track/' + wk.week + "/" + (i + 1) + '"><span class="cta-l"><small>Session ' + (i + 1) + '</small><b>' + (tkDone(wk.week, i + 1) ? "✓ " : "") + esc(TK_KIND[s.kind] || s.kind) + '</b><em>' + esc(s.title && s.title.en ? s.title.en : "") + '</em></span><span class="cta-go">▶</span></a>';
    });
    render(html, "track");
  }
  function tkFinish(host, wk, sn, msg) {
    tkMark(wk.week, sn);
    var next = sn < 3 ? '<a class="btn primary" href="#/track/' + wk.week + "/" + (sn + 1) + '">Next session ▶</a>' : '<a class="btn primary" href="#/track">Back to the track</a>';
    host.innerHTML = '<div class="ai-card"><b>✅ Session done</b>' + (msg ? '<p class="sub">' + msg + "</p>" : "") + '<div class="actions center">' + next + '<a class="btn" href="#/track/' + wk.week + '">This week</a></div></div>';
  }
  function tkSession(wk, sn, ss) {
    var head = '<a class="back" href="#/track/' + wk.week + '">‹ Week ' + wk.week + '</a><section class="card"><div class="sec-h"><h2>' + esc(TK_KIND[ss.kind] || ss.kind) + '</h2><span class="muted">Session ' + sn + "/3</span></div>";
    var body = "", end = '<div id="tk-end"></div>', k = ss.kind;
    var doneBtn = '<div class="actions center"><button class="btn primary" id="tk-done">I finished this ✓</button></div>';
    if (k === "model") body = (ss.scenario ? '<p class="sub">' + M(ss.scenario) + "</p>" : "") + (ss.text || []).map(tline).join("") + '<h3>Useful phrases</h3>' + (ss.phrases || []).map(tline).join("") + doneBtn;
    else if (k === "prep") body = '<p class="sub">' + M(ss.scenario) + '</p><p><b>You:</b> ' + M(ss.you) + '</p><p><b>Them:</b> ' + M(ss.other) + '</p><p><b>Goal:</b> ' + M(ss.goal) + '</p><h3>Phrases to know</h3>' + (ss.phrases || []).map(tline).join("") + doneBtn;
    else if (k === "words") body = (ss.words || []).map(function (w) { return '<div class="card tk-word"><div class="zh big">' + esc(w.hanzi) + SAY(w.hanzi) + "</div>" + PY(w.pinyin) + ' <span class="tag t-hsk">' + esc(w.pos || "") + '</span><div>' + M(w) + "</div>" + (w.ex ? tline(w.ex) : "") + "</div>"; }).join("") + doneBtn;
    else if (k === "write" || k === "free") {
      var prompt = k === "write" ? ss.prompt : ss.goal;
      body = (k === "free" ? '<p class="sub">They say:</p>' + tline(ss.opener) : "") + '<p>' + M(prompt) + '</p>' + (ss.mustUse && ss.mustUse.length ? '<p class="sub">Try to use: ' + ss.mustUse.map(function (w) { return '<span class="chip zh">' + esc(w) + "</span>"; }).join(" ") + "</p>" : "") +
        (ss.tips ? '<ul class="sub">' + ss.tips.map(function (t) { return "<li>" + M(t) + "</li>"; }).join("") + "</ul>" : "") + (ss.checklist ? '<ul class="sub">' + ss.checklist.map(function (t) { return "<li>" + M(t) + "</li>"; }).join("") + "</ul>" : "") +
        '<textarea id="tk-text" class="zh" lang="zh-CN" rows="5" maxlength="500" placeholder="用中文写…"></textarea><div id="tk-ai"></div><div class="actions center">' + (window.AI && AI.configured() ? '<button class="btn" id="tk-check">🤖 Check my Chinese</button>' : "") + (ss.sample ? '<button class="btn" id="tk-sample">Show a sample</button>' : "") + '</div><div id="tk-sampleout" hidden>' + (ss.sample || []).map(tline).join("") + "</div>" + doneBtn;
    } else if (k === "fill") body = '<div id="tk-q"></div>';
    else if (k === "script") body = '<div id="tk-q"></div>';
    else if (k === "cards") body = '<p class="sub">' + M(ss.topic) + "</p>" + (ss.cards || []).map(function (c) {
      return '<div class="card tk-card"><div class="tk-vn"><small>🇻🇳</small> <b>' + esc(c.vn.vi) + '</b><div class="dim">' + M(c.vn.gloss) + '</div></div><div class="tk-cn"><small>🇨🇳</small> <span class="zh big">' + esc(c.cn.zh) + SAY(c.cn.zh) + "</span>" + PY(c.cn.py) + '<div class="dim">' + M(c.cn.gloss) + '</div></div><p class="tk-diff">⚖️ ' + M(c.diff) + "</p>" + tline(c.ex) + "</div>";
    }).join("") + '<div class="actions center"><button class="btn primary" id="tk-quiz">Quiz me ▶</button></div><div id="tk-q"></div>';
    else if (k === "passage") body = (ss.title ? '<h3 class="zh">' + esc(ss.title.zh) + '</h3><div class="dim">' + M(ss.title) + "</div>" : "") + (ss.lines || []).map(tline).join("") + '<h3>Questions</h3><div id="tk-q"></div>';
    render(head + body + end + "</section>", "track");
    var endEl = document.getElementById("tk-end"), done = document.getElementById("tk-done");
    if (done) done.onclick = function () { done.disabled = true; tkFinish(endEl, wk, sn, ""); };
    var sample = document.getElementById("tk-sample"); if (sample) sample.onclick = function () { document.getElementById("tk-sampleout").hidden = false; sample.hidden = true; };
    var chk = document.getElementById("tk-check");
    if (chk) chk.onclick = function () {
      var t = document.getElementById("tk-text").value.trim(); if (t.length < 4) { UI.toast("Write a few words first", "✍️"); return; }
      var p = k === "write" ? (ss.prompt.en || "") : "Role-play. They say: " + ss.opener.zh + " (" + ss.opener.en + "). " + (ss.goal.en || "");
      AI.coach(document.getElementById("tk-ai"), p.slice(0, 250), (ss.mustUse || []).slice(0, 6), t.slice(0, 500));
    };
    if (k === "fill") tkFill(wk, sn, ss, endEl);
    if (k === "script") tkScript(wk, sn, ss, endEl);
    if (k === "passage") tkQuestions(wk, sn, ss.questions || [], endEl, document.getElementById("tk-q"));
    var qz = document.getElementById("tk-quiz");
    if (qz) qz.onclick = function () { qz.hidden = true; tkCardQuiz(wk, sn, ss, endEl); };
  }
  /* one question at a time: opts = [{label, good, note}] */
  function tkRun(host, qs, onEnd) {
    var i = 0, right = 0;
    (function draw() {
      if (i >= qs.length) { onEnd(right, qs.length); return; }
      var q = qs[i], opts = shuffle(q.opts);
      host.innerHTML = '<div class="card"><p class="sub">' + (i + 1) + "/" + qs.length + "</p>" + q.head + '<div class="opts">' + opts.map(function (o, j) { return tkOpt(o.label, 'data-j="' + j + '"'); }).join("") + '</div><div id="tk-note"></div></div>';
      var locked = false;
      [].forEach.call(host.querySelectorAll(".opt"), function (b) {
        b.onclick = function () {
          if (locked) return; locked = true; var o = opts[+b.getAttribute("data-j")];
          [].forEach.call(host.querySelectorAll(".opt"), function (x) { if (opts[+x.getAttribute("data-j")].good) x.classList.add("right"); });
          if (o.good) right++; else b.classList.add("wrong");
          document.getElementById("tk-note").innerHTML = (o.note || q.note ? '<p class="sub">' + (o.note || q.note) + "</p>" : "") + '<div class="actions center"><button class="btn primary" id="tk-next">' + (i + 1 < qs.length ? "Next ▶" : "Finish") + "</button></div>";
          document.getElementById("tk-next").onclick = function () { i++; draw(); };
        };
      });
    })();
  }
  function tkFill(wk, sn, ss, endEl) {
    tkRun(document.getElementById("tk-q"), (ss.items || []).map(function (it) {
      return { head: '<p class="zh big">' + esc(it.zh) + "</p>" + '<div class="dim">' + M(it) + "</div>", note: "", opts: it.options.map(function (o) { return { label: esc(o), good: o === it.answer, note: "✔ " + esc(it.zh.replace("___", it.answer)) }; }) };
    }), function (r, n) { document.getElementById("tk-q").innerHTML = ""; tkFinish(endEl, wk, sn, r + "/" + n + " correct"); });
  }
  function tkScript(wk, sn, ss, endEl) {
    tkRun(document.getElementById("tk-q"), (ss.turns || []).map(function (u) {
      return { head: '<p class="sub">They say:</p>' + tline(u.other) + '<p class="sub">Your reply:</p>', note: "", opts: u.choices.map(function (c) { return { label: esc(c.t.zh) + '<small class="dim"> ' + esc(c.t.py) + "</small>", good: !!c.good, note: (c.good ? "✔ " : "✘ ") + M(c.feedback) + "<br>" + M(c.t) }; }) };
    }), function (r, n) { document.getElementById("tk-q").innerHTML = ""; tkFinish(endEl, wk, sn, r + "/" + n + " best replies"); });
  }
  function tkCardQuiz(wk, sn, ss, endEl) {
    var cards = ss.cards || [];
    tkRun(document.getElementById("tk-q"), cards.map(function (c) {
      return { head: '<p class="sub">Which Chinese term matches?</p><p class="big"><b>' + esc(c.vn.vi) + "</b></p><div class=\"dim\">" + M(c.vn.gloss) + "</div>", note: "", opts: cards.map(function (o) { return { label: esc(o.cn.zh), good: o === c, note: o === c ? "✔ " + esc(c.cn.zh) + " " + esc(c.cn.py) : "✘ " + esc(o.cn.zh) + " = " + M(o.vn.gloss) + " (" + esc(o.vn.vi) + ")" }; }) };
    }), function (r, n) { document.getElementById("tk-q").innerHTML = ""; tkFinish(endEl, wk, sn, r + "/" + n + " correct"); });
  }
  function tkQuestions(wk, sn, qsrc, endEl, host) {
    tkRun(host, qsrc.map(function (q) {
      return { head: '<p class="zh big">' + esc(q.q) + "</p>", note: "", opts: q.options.map(function (o, j) { return { label: typeof o === "string" ? esc(o) : M(o), good: j === q.answer, note: q.explain ? M(q.explain) : "" }; }) };
    }), function (r, n) { host.innerHTML = ""; tkFinish(endEl, wk, sn, r + "/" + n + " correct"); });
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
  function openWordSheet(id, context) {
    var w = WORDMAP[id]; if (!w) return;
    var c = SRS.get(id);
    [].forEach.call(document.querySelectorAll(".modal-wrap"), function (m) { if (m.querySelector(".wsheet")) m.remove(); }); // a word opened from another word's sheet replaces it
    UI.modal('<div class="wsheet"><div class="ws-top"><span class="hz big zh">' + esc(w.hanzi) + "</span>" + SAY(w.hanzi, null, true) + "</div>" +
      '<p class="ws-py">' + esc(w.pinyin) + '</p><div class="ws-mean">' + M(w) + "</div>" + levelBadge(w.level) +
      (w.example ? '<div class="ws-ex"><span class="zh">' + esc(w.example.zh) + "</span>" + SAY(w.example.zh) + '<div class="dim">' + M(w.example) + "</div></div>" : "") +
      '<div class="w-x ws-x" data-wx="' + esc(w.id) + '">' + wordExtras(w) + "</div>" +
      '<div class="actions center">' + (c ? '<span class="tag t-box">In review · Box ' + c.box + (SRS.hard(id) ? " · hard" : "") + "</span>" : '<button class="btn primary" id="ws-add">➕ Add to review</button>') +
      '<a class="btn" href="' + wordHome(w) + '" id="ws-day">📖 ' + wordPlace(w) + "</a></div>" +
      (window.AI && AI.configured() ? '<div class="ws-ask" id="ws-ask"><button class="btn small ai-btn" id="ws-askbtn">🤖 Ask AI about this word</button></div>' : "") +
      '<div class="ws-ask"><button class="btn small" id="ws-report">⚑ Report a problem with this word</button></div></div>');
    fillExtras();
    var wrb = document.getElementById("ws-report");
    if (wrb) wrb.onclick = function () { openReport({ ref: "word:" + id, label: w.hanzi + " · " + w.pinyin }); };
    var ab = document.getElementById("ws-askbtn");
    if (ab) ab.onclick = function () { AI.askBox(document.getElementById("ws-ask"), w.hanzi, context || (w.example && w.example.zh) || ""); };
    var add = document.getElementById("ws-add");
    if (add) add.onclick = function () { SRS.addMany([id]); add.outerHTML = '<span class="tag t-box">In review · Box 1</span>'; UI.toast("Added to review", "➕"); refreshChrome(); };
    var day = document.getElementById("ws-day");
    if (day) day.onclick = function () { var wrap = document.querySelector(".modal-wrap"); if (wrap) wrap.remove(); pendingJump = id; };
  }

