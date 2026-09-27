/* Mini-games: Sentence Builder, Listen & Pick, Speed Match, Pinyin Race, Boss Battle, Quick Quiz. */
(function () {
  "use strict";
  var A = function () { return window.App; };

  var LIST = [
    { id: "builder", icon: "🧩", name: "Sentence Builder", desc: "Order the words — HSK 4 Writing part 1", cls: "g-violet" },
    { id: "listen", icon: "🎧", name: "Listen & Pick", desc: "Hear a word, pick the hanzi", cls: "g-teal" },
    { id: "speed", icon: "⚡", name: "Speed Match", desc: "60 seconds · build combos", cls: "g-coral" },
    { id: "race", icon: "⌨️", name: "Pinyin Race", desc: "Type the word, like the computer exam", cls: "g-sun" },
    { id: "boss", icon: "🐉", name: "Boss Battle", desc: "3 lives vs the review boss", cls: "g-boss" },
    { id: "quick", icon: "❓", name: "Quick Quiz", desc: "10 mixed questions", cls: "g-blue" },
    { id: "drill", icon: "🎙️", name: "Listening Drill", desc: "Hear a sentence, then reveal · 0.75× slow mode", cls: "g-teal" },
    { id: "write", icon: "✍️", name: "Stroke Writing", desc: "Watch stroke order, then trace it", cls: "g-violet" },
    { id: "type", icon: "⌨️", name: "Type the Sentence", desc: "Computer-based HSK writing · pinyin keyboard", cls: "g-coral" }
  ];
  var BY = {}; LIST.forEach(function (g) { BY[g.id] = g; });

  function challenge() {
    var ids = ["builder", "listen", "speed", "race", "boss"];
    var n = Math.floor(new Date(Store.today() + "T00:00:00").getTime() / 864e5);
    return BY[ids[n % ids.length]];
  }

  /* ---------- hub ---------- */
  function hub() {
    var App = A(), ch = challenge(), s = Store.state;
    App.render('<p class="sub">Words come from the days you\'ve studied. Every game earns XP.</p><div class="gamegrid">' + LIST.map(function (g) {
      var st = s.games[g.id] || {};
      return '<a class="gcard card ' + g.cls + '" href="#/game/' + g.id + '">' + (g.id === ch.id ? '<span class="ribbon">' + (s.challenges[Store.today()] ? "✓ Done" : "🎯 Today") + "</span>" : "") +
        '<span class="g-ico">' + g.icon + '</span><b>' + g.name + '</b><small>' + g.desc + '</small><span class="g-best">' + (st.plays ? "Best " + st.best + " · " + st.plays + " play" + (st.plays > 1 ? "s" : "") : "New!") + "</span></a>";
    }).join("") + "</div>", "games");
  }

  function run(id, arg, opts) {
    var g = BY[id];
    if (!g) { location.hash = "#/games"; return; }
    RUN = opts || {};
    if (!RUN.onDone && A().resetWork) A().resetWork(); // "Play again" starts a new round
    ({ builder: builder, listen: listen, speed: speed, race: race, boss: boss, quick: quick, drill: drill, write: write, type: typeGame })[id](arg);
  }

  /* ---------- shared ---------- */
  function header(g, right) {
    return '<div class="ghead"><a class="pill" href="' + (RUN.exit || "#/games") + '">✕</a><b>' + g.icon + " " + g.name + '</b><span class="ghr" id="ghr">' + (right || "") + "</span></div>";
  }
  var RUN = {}; // options for the current run: { count, onDone, exit } (used by Today's session)
  function finish(id, score, xp, extra) {
    if (RUN.onDone) { var cb = RUN.onDone; RUN = {}; Store.game(id).plays++; Store.save(); Game.award(xp, { silent: true }); cb(score); return; }
    var App = A(), g = BY[id], st = Store.game(id), s = Store.state, isBest = score > st.best;
    st.plays++; st.best = Math.max(st.best, score);
    var bonus = 0, ch = challenge();
    if (ch.id === id && !s.challenges[Store.today()]) { s.challenges[Store.today()] = true; bonus = 15; }
    Store.save();
    var mood = extra && extra.mood || (isBest ? "cheer" : "happy");
    App.render(header(g) + '<div class="card result">' + UI.mascot(mood, 100) + "<h2>" + (extra && extra.title || "Score: " + score) + "</h2>" +
      '<p class="sub">' + (extra && extra.sub ? extra.sub + " · " : "") + "Best " + st.best + (isBest && st.plays > 1 ? " · New record!" : "") + "</p>" +
      '<p class="xp-earn">+' + (xp + bonus) + " XP" + (bonus ? ' <span class="tag t-sun">🎯 challenge +15</span>' : "") + "</p>" +
      '<div class="actions center"><a class="btn primary" href="#/game/' + id + (extra && extra.arg ? "/" + extra.arg : "") + '" id="again">↻ Play again</a><a class="btn" href="#/games">All games</a></div></div>' +
      (extra && extra.review ? extra.review : ""), "game");
    document.getElementById("again").onclick = function (e) { e.preventDefault(); run(id, extra && extra.arg); };
    if (isBest || bonus) UI.confetti(120);
    if (bonus) UI.toast("Daily challenge complete!", "🎯");
    Game.award(xp + bonus);
  }
  function pickOthers(w, pool, n) {
    var same = A().shuffle(pool.filter(function (o) { return o.id !== w.id && o.hanzi.length === w.hanzi.length; }));
    var rest = A().shuffle(pool.filter(function (o) { return o.id !== w.id && o.hanzi.length !== w.hanzi.length; }));
    return same.concat(rest).slice(0, n);
  }
  var T2SKILL = { h2m: "vocab", m2h: "vocab", h2p: "pinyin", aud: "listen-word" };
  /* A multiple-choice question about a word. type: h2m | m2h | h2p | aud */
  function makeQ(w, types) {
    var t = types[Math.floor(Math.random() * types.length)];
    if (t === "aud" && !Audio2.has(w.hanzi)) t = "m2h";
    if (t === "h2p" && !w.pinyin) t = "h2m"; // own words may have no pinyin
    return { w: w, t: t, opts: A().shuffle([w].concat(pickOthers(w, A().WORDS, 3))) };
  }
  function qHTML(q) {
    var App = A(), w = q.w, prompt, optF;
    if (q.t === "h2m") { prompt = '<div class="hz big">' + App.esc(w.hanzi) + "</div>" + App.SAY(w.hanzi) + '<p class="sub">Pick the meaning</p>'; optF = function (o) { return App.M(o); }; }
    else if (q.t === "m2h") { prompt = '<div class="w-mean big-mean">' + App.M(w) + '</div><p class="sub">Pick the Chinese word</p>'; optF = function (o) { return '<span class="zh">' + App.esc(o.hanzi) + "</span>"; }; }
    else if (q.t === "h2p") { prompt = '<div class="hz big">' + App.esc(w.hanzi) + '</div><p class="sub">Pick the pinyin</p>'; optF = function (o) { return App.esc(o.pinyin); }; }
    else { prompt = '<button class="btn listen-btn" data-say="' + App.esc(w.hanzi) + '">🔊 Play again</button><p class="sub">Listen and pick the word</p>'; optF = function (o) { return '<span class="zh">' + App.esc(o.hanzi) + "</span>"; }; }
    return '<div class="card qcard" id="qcard">' + prompt + '<div class="opts">' + q.opts.map(function (o, k) {
      return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[k] + "</span>" + optF(o) + "</button>";
    }).join("") + '</div><div id="qfb"></div></div>';
  }
  /* Wire a rendered question; calls done(ok) after the learner taps Next (or auto if fast). */
  function wireQ(q, done, opts) {
    opts = opts || {};
    if (q.t === "aud") Audio2.play(q.w.hanzi);
    var answered = false;
    document.querySelector(".opts").onclick = function (e) {
      var b = e.target.closest(".opt"); if (!b || answered) return;
      answered = true;
      var ok = q.opts[+b.getAttribute("data-k")].id === q.w.id;
      document.querySelectorAll(".opt").forEach(function (o) {
        o.disabled = true;
        if (q.opts[+o.getAttribute("data-k")].id === q.w.id) o.classList.add("right"); else if (o === b) o.classList.add("wrong");
      });
      (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
      if (!ok) UI.shake(document.getElementById("qcard"));
      if (window.Learn) Learn.record("w:" + q.w.id, { kind: "word", id: q.w.id, skill: T2SKILL[q.t] || "vocab" }, ok);
      if (!ok && SRS.has(q.w.id)) SRS.lapse(q.w.id);
      if (opts.onAnswer) opts.onAnswer(ok, b);
      var App = A();
      document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '"><span class="zh">' + App.esc(q.w.hanzi) + "</span> " + App.esc(q.w.pinyin) + " — " + App.M(q.w) + "</div>" +
        '<button class="btn primary wide" id="qnext">Next ›</button>';
      document.getElementById("qnext").onclick = function () { done(ok); };
    };
    A().setKeys(function (e) {
      if (A().typing(e)) return;
      if (/^[1-4]$/.test(e.key)) { var b = document.querySelectorAll(".opt")[+e.key - 1]; if (b && !b.disabled) b.click(); }
      else if (e.key === "Enter") { var n = document.getElementById("qnext"); if (n) n.click(); }
    });
  }
  function bar(i, n) { return '<div class="bar"><span style="width:' + (i / n * 100) + '%"></span></div>'; }

  /* ---------- 1. Sentence Builder ---------- */
  var COMMON = ("公司 员工 我们 你们 他们 大家 每个 每个月 每年 可以 需要 已经 以后 以前 的时候 如果 因为 所以 但是 虽然 越南 中国 越南盾 经理 工作 上班 下班 时间 一般 比较 非常 一定 必须 应该 不能 没有 这个 那个 这次 今年 明年 去年 部门 同事 问题 自己 一起 所有 其他 还有 一下 一点 一些 按照 根据 由于 因此 并且 而且 不仅 只要 只有 发现 检查 决定 提高 百分之 越来越 不太 一样 客户 工程师 生产部 人事部 销售部 车间 规定 情况 结果 主要 容易 认真 帮助 完成 开始 结束 包括 通知 管理 发展 希望 觉得 知道 了解 注意 选择 关心 重要 简单 清楚 详细 合同 公司的 员工的").split(" ");
  var PARTICLES = "了的地得着过吗呢吧们上里";
  var dict = null;
  function buildDict() {
    dict = {};
    A().WORDS.forEach(function (w) { dict[w.hanzi] = 1; (w.collocations || []).forEach(function (c) { if (c.zh.length <= 5 && !/[…]/.test(c.zh)) dict[c.zh] = 1; }); });
    COMMON.forEach(function (c) { dict[c] = 1; });
  }
  function tokenize(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var hit = s[i];
      for (var L = Math.min(6, s.length - i); L > 1; L--) { if (dict[s.substr(i, L)]) { hit = s.substr(i, L); break; } }
      out.push(hit); i += hit.length;
    }
    var merged = [];
    out.forEach(function (t) {
      if (merged.length && t.length === 1 && PARTICLES.indexOf(t) >= 0) merged[merged.length - 1] += t;
      else merged.push(t);
    });
    return merged;
  }
  function chunk(s) {
    var toks = tokenize(s), k = s.length <= 10 ? 3 : s.length <= 15 ? 4 : 5;
    while (toks.length > k) {
      var best = 0, bl = 1e9;
      for (var i = 0; i < toks.length - 1; i++) { var l = toks[i].length + toks[i + 1].length; if (l < bl) { bl = l; best = i; } }
      toks.splice(best, 2, toks[best] + toks[best + 1]);
    }
    return toks;
  }
  function sentences() {
    var App = A(), studied = {}, out = [], seen = {};
    App.studiedWords().forEach(function (w) { studied[w._day] = 1; });
    App.DAYS.forEach(function (d) {
      if (!studied[d.day] && d.type === "lesson") return;
      var src = [];
      (d.words || []).forEach(function (w) { src.push(w.example); });
      if (d.grammar) src = src.concat(d.grammar.examples);
      ((d.exercises || {}).translate || []).forEach(function (t) { src.push(t); });
      src.forEach(take);
    });
    // HSK 4 Core examples for core words already in review
    App.WORDS.forEach(function (w) { if (w._set && w.example && SRS.has(w.id)) take(w.example); });
    function take(x) {
      if (!x || !x.zh) return;
      var core = x.zh.replace(/[。？！]$/, "");
      if (seen[core] || /[，、：；“”《》()（）A-Za-z0-9…]/.test(core) || core.length < 7 || core.length > 20) return;
      seen[core] = 1;
      out.push({ core: core, end: x.zh.slice(core.length), py: x.py, vi: x.vi, en: x.en });
    }
    return out;
  }
  function builder() {
    var App = A(), g = BY.builder;
    if (!dict) buildDict();
    var pool = App.shuffle(sentences()).filter(function (s) {
      var c = chunk(s.core); return c.length >= 3 && new Set(c).size === c.length;
    }).slice(0, 8);
    if (pool.length < 3) { App.render(header(g) + '<p class="empty">Study a few days first to unlock sentences.</p>', "game"); return; }
    var i = 0, score = 0, review = [];
    function draw() {
      if (i >= pool.length) return end();
      var s = pool[i], parts = chunk(s.core), order = App.shuffle(parts.map(function (_, k) { return k; }));
      if (order.every(function (v, k) { return v === k; })) order.reverse();
      var placed = [];
      App.render(header(g, (i + 1) + "/" + pool.length) + bar(i, pool.length) +
        '<div class="card bcard" id="qcard"><p class="sub">Tap the pieces in the right order</p>' +
        '<div class="answer" id="ans"><span class="ph">Your sentence…</span></div>' +
        '<div class="pool" id="pool">' + order.map(function (k) { return '<button class="piece zh" data-k="' + k + '">' + App.esc(parts[k]) + "</button>"; }).join("") + "</div>" +
        '<details class="hint-d"><summary>💡 Hint</summary><div class="tr">' + App.M(s) + "</div></details>" +
        '<div id="qfb"></div><button class="btn primary wide" id="chk" disabled>Check</button></div>', "game");
      var ans = document.getElementById("ans"), poolEl = document.getElementById("pool"), chk = document.getElementById("chk");
      function sync() {
        ans.innerHTML = placed.length ? placed.map(function (k) { return '<button class="piece zh in" data-k="' + k + '">' + App.esc(parts[k]) + "</button>"; }).join("") + '<span class="end zh">' + App.esc(s.end) + "</span>" : '<span class="ph">Your sentence…</span>';
        poolEl.querySelectorAll(".piece").forEach(function (p) { p.classList.toggle("used", placed.indexOf(+p.dataset.k) >= 0); });
        chk.disabled = placed.length !== parts.length;
      }
      poolEl.onclick = function (e) { var p = e.target.closest(".piece"); if (!p || p.classList.contains("used")) return; placed.push(+p.dataset.k); Audio2.sfx.tap(); sync(); };
      ans.onclick = function (e) { var p = e.target.closest(".piece"); if (!p || chk.dataset.done) return; placed.splice(placed.indexOf(+p.dataset.k), 1); sync(); };
      chk.onclick = function () {
        if (chk.dataset.done) { i++; draw(); return; }
        var ok = placed.map(function (k) { return parts[k]; }).join("") === s.core;
        chk.dataset.done = 1;
        if (window.Learn) Learn.record("b:" + s.core, { kind: "order", skill: "word-order", parts: parts, core: s.core, end: s.end, py: s.py, vi: s.vi, en: s.en }, ok);
        if (ok) { score++; Audio2.sfx.good(); UI.pop("+3 XP", null, innerHeight * 0.35, "good"); } else { Audio2.sfx.bad(); UI.shake(document.getElementById("qcard")); }
        ans.classList.add(ok ? "ok" : "no");
        review.push({ s: s, ok: ok });
        document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct!" : "✗ Correct order:") + '<div class="ex-zh"><span class="zh">' + App.esc(s.core + s.end) + "</span>" + App.SAY(s.core + s.end) + "</div>" + App.PY(s.py) + '<div class="tr">' + App.M(s) + "</div></div>";
        chk.textContent = i + 1 < pool.length ? "Next ›" : "See results";
      };
    }
    function end() {
      finish("builder", score, score * 3, { title: score + " / " + pool.length + " sentences", mood: score === pool.length ? "cheer" : score >= pool.length / 2 ? "happy" : "sad",
        review: '<h3 class="sec">Sentences</h3><div class="card akey">' + review.map(function (r) {
          return '<div class="ak-row ' + (r.ok ? "ok" : "no") + '"><span class="ak-n">' + (r.ok ? "✓" : "✗") + '</span><div><div class="zh">' + App.esc(r.s.core + r.s.end) + '</div><div class="dim">' + App.M(r.s) + "</div></div></div>";
        }).join("") + "</div>" });
    }
    draw();
  }

  /* ---------- 2. Listen & Pick ---------- */
  function listen() {
    var App = A(), g = BY.listen, audio = Audio2.available();
    var pool = App.shuffle(App.studiedWords()).slice(0, 10), i = 0, score = 0;
    App.render(header(g) + '<div class="card result">' + UI.mascot("wow", 88) + "<h2>Listen & Pick</h2>" +
      '<p class="sub">' + (audio ? "Turn your sound on. You'll hear a word — pick the right hanzi." : "Audio isn't generated yet, so you'll get the pinyin instead.") + "</p>" +
      '<button class="btn primary wide" id="go">Start</button></div>', "game");
    document.getElementById("go").onclick = draw; // tap = user gesture, so iOS allows audio
    function draw() {
      if (i >= pool.length) return finish("listen", score, score * 2, { title: score + " / " + pool.length, mood: score >= 8 ? "cheer" : score >= 5 ? "happy" : "sad" });
      var q = makeQ(pool[i], [audio ? "aud" : "h2p"]);
      if (pool[i + 1]) Audio2.prefetch(pool[i + 1].hanzi);
      if (!audio) q.t = "py2h";
      var body = q.t === "py2h"
        ? '<div class="card qcard" id="qcard"><div class="big-py">' + App.esc(q.w.pinyin) + '</div><p class="sub">Pick the word</p><div class="opts">' + q.opts.map(function (o, k) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[k] + '</span><span class="zh">' + App.esc(o.hanzi) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>'
        : qHTML(q);
      App.render(header(g, "⭐ " + score) + bar(i, pool.length) + body, "game");
      wireQ(q, function (ok) { if (ok) score++; i++; draw(); }, { onAnswer: function (ok) { if (ok) document.getElementById("ghr").textContent = "⭐ " + (score + 1); } });
    }
  }

  /* ---------- 3. Speed Match ---------- */
  function speed() {
    var App = A(), g = BY.speed, words = App.shuffle(App.studiedWords());
    if (words.length < 12) { var md = words.reduce(function (m, w) { return Math.max(m, w._day || 0); }, 4); words = App.shuffle(App.WORDS.filter(function (w) { return w._day && w._day <= md; })); }
    var next = 0, score = 0, combo = 0, left = [], right = [], sel = null, timeLeft = 60, timer = null, over = false;
    function take() { // never put a word on the board twice
      for (var t = 0; t < words.length; t++) {
        var w = words[next % words.length]; next++;
        if (!left.some(function (x) { return x && x.id === w.id; })) return w;
      }
      return words[next++ % words.length];
    }
    for (var k = 0; k < 4; k++) { var w = take(); left.push(w); right.push(w); }
    right = App.shuffle(right);
    App.render(header(g, '⏱ <b id="tl">60</b>') + '<div class="speedbar"><span id="tbar"></span></div>' +
      '<div class="combo-row"><span>Score <b id="sc">0</b></span><span id="cb" class="combo"></span></div>' +
      '<div class="match speed" id="board"></div><p class="hint center">Wrong match = −3 s and combo reset</p>', "game");
    var board = document.getElementById("board");
    function drawBoard() {
      board.innerHTML = '<div class="mcol" data-side="L">' + left.map(function (w, i) { return '<button class="mbtn zh" data-i="' + i + '">' + App.esc(w.hanzi) + "</button>"; }).join("") +
        '</div><div class="mcol" data-side="R">' + right.map(function (w, i) { return '<button class="mbtn" data-i="' + i + '">' + App.M(w) + "</button>"; }).join("") + "</div>";
    }
    drawBoard();
    board.onclick = function (e) {
      if (over) return;
      var b = e.target.closest(".mbtn"); if (!b) return;
      var side = b.parentNode.getAttribute("data-side"), idx = +b.dataset.i;
      if (!sel || sel.side === side) { if (sel) sel.el.classList.remove("sel"); sel = { el: b, side: side, i: idx }; b.classList.add("sel"); return; }
      var li = side === "L" ? idx : sel.i, ri = side === "R" ? idx : sel.i;
      if (left[li].id === right[ri].id) {
        combo++; var pts = Math.min(combo, 5); score += pts;
        Audio2.sfx.combo(combo); UI.hearts(null, null, 5);
        UI.pop("+" + pts + (combo > 1 ? " ×" + Math.min(combo, 5) : ""), App.rect(b).x, App.rect(b).y, "good");
        var nw = take(); left[li] = nw; right[ri] = nw;
        right = App.shuffle(right); // reshuffle meanings so the new pair isn't sitting side by side
        drawBoard();
        var nl = board.querySelector('[data-side=L] [data-i="' + li + '"]'); if (nl) nl.classList.add("pop-in"); // only the new Chinese word animates
      } else {
        combo = 0; timeLeft = Math.max(0, timeLeft - 3); Audio2.sfx.bad();
        var a = sel.el; a.classList.add("bad"); b.classList.add("bad"); UI.shake(board);
        setTimeout(function () { a.classList.remove("bad", "sel"); b.classList.remove("bad"); }, 350);
      }
      sel = null;
      document.getElementById("sc").textContent = score;
      document.getElementById("cb").textContent = combo > 1 ? "🔥 combo ×" + Math.min(combo, 5) : "";
    };
    var t0 = Date.now(), last = 60;
    timer = setInterval(function () {
      var el = document.getElementById("tl"); if (!el) { clearInterval(timer); return; }
      timeLeft -= (Date.now() - t0) / 1000; t0 = Date.now();
      var t = Math.max(0, timeLeft);
      el.textContent = Math.ceil(t);
      document.getElementById("tbar").style.width = (t / 60 * 100) + "%";
      if (Math.ceil(t) <= 5 && Math.ceil(t) !== last) { last = Math.ceil(t); Audio2.sfx.tap(); }
      if (t <= 0) { clearInterval(timer); over = true; finish("speed", score, Math.ceil(score / 3), { title: score + " points", mood: score >= 60 ? "cheer" : "happy" }); }
    }, 100);
  }

  /* ---------- 4. Pinyin Race ---------- */
  function race() {
    var App = A(), g = BY.race, words = App.shuffle(App.studiedWords()), i = 0, score = 0, timeLeft = 90, timer = null, done = [];
    App.render(header(g) + '<div class="card result">' + UI.mascot("wow", 88) + "<h2>Pinyin Race</h2>" +
      '<p class="sub">You see the meaning (and hear it). Type the word — in <b>hanzi</b> with a Chinese keyboard, or <b>pinyin without tones</b>. 90 seconds.</p>' +
      '<p class="tip">iPhone: Settings → General → Keyboard → Keyboards → Add → Chinese (Simplified) → <b>Pinyin – QWERTY</b>. Switch with 🌐.</p>' +
      '<button class="btn primary wide" id="go">Start</button></div>', "game");
    document.getElementById("go").onclick = function () {
      App.render(header(g, '⏱ <b id="tl">90</b>') + '<div class="speedbar"><span id="tbar"></span></div>' +
        '<div class="combo-row"><span>Correct <b id="sc">0</b></span><span id="last" class="dim"></span></div>' +
        '<form class="card race" id="rf" autocomplete="off"><div id="prompt"></div>' +
        '<input id="ri" class="race-in zh" lang="zh-CN" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="汉字 or pinyin">' +
        '<div class="actions"><button class="btn primary" type="submit">Enter</button><button class="btn" type="button" id="skip">Skip</button></div></form>', "game");
      var input = document.getElementById("ri");
      function show() {
        var w = words[i % words.length];
        document.getElementById("prompt").innerHTML = '<div class="w-mean big-mean">' + App.M(w) + "</div>" + App.SAY(w.hanzi, null, true) + '<p class="sub">' + w.hanzi.length + " character" + (w.hanzi.length > 1 ? "s" : "") + "</p>";
        input.value = ""; input.focus();
        if (Audio2.available()) Audio2.play(w.hanzi);
      }
      function check(skip) {
        var w = words[i % words.length], v = input.value.trim();
        var ok = !skip && (v === w.hanzi || (v && App.norm(v).replace(/[1-5]/g, "") === App.norm(w.pinyin)));
        if (ok) { score++; Audio2.sfx.good(); UI.pop("+2 XP", null, innerHeight * 0.3, "good"); } else if (!skip) { Audio2.sfx.bad(); UI.shake(document.getElementById("rf")); }
        if (!skip && !ok) return; // let them try again
        done.push({ w: w, ok: ok });
        if (window.Learn) Learn.record("w:" + w.id, { kind: "word", id: w.id, skill: "pinyin" }, ok);
        if (!ok && SRS.has(w.id)) SRS.lapse(w.id);
        document.getElementById("sc").textContent = score;
        document.getElementById("last").innerHTML = (ok ? "✓ " : "↷ ") + '<span class="zh">' + App.esc(w.hanzi) + "</span> " + App.esc(w.pinyin);
        i++; show();
      }
      document.getElementById("rf").onsubmit = function (e) { e.preventDefault(); check(false); };
      document.getElementById("skip").onclick = function () { check(true); };
      show();
      var t0 = Date.now();
      timer = setInterval(function () {
        var el = document.getElementById("tl"); if (!el) { clearInterval(timer); return; }
        timeLeft -= (Date.now() - t0) / 1000; t0 = Date.now();
        el.textContent = Math.max(0, Math.ceil(timeLeft));
        document.getElementById("tbar").style.width = Math.max(0, timeLeft / 90 * 100) + "%";
        if (timeLeft <= 0) {
          clearInterval(timer); input.blur();
          finish("race", score, score * 2, { title: score + " words", mood: score >= 12 ? "cheer" : "happy",
            review: done.length ? '<div class="card akey">' + done.map(function (r) { return '<div class="ak-row ' + (r.ok ? "ok" : "no") + '"><span class="ak-n">' + (r.ok ? "✓" : "↷") + '</span><div><span class="zh">' + App.esc(r.w.hanzi) + "</span> " + App.esc(r.w.pinyin) + '<div class="dim">' + App.M(r.w) + "</div></div></div>"; }).join("") + "</div>" : "" });
        }
      }, 200);
    };
  }

  /* ---------- 5. Boss Battle ---------- */
  var BOSSES = {
    5: { e: "👾", zh: "算薪小怪", en: "Payroll Imp" }, 10: { e: "🧌", zh: "奖金妖", en: "Bonus Troll" },
    15: { e: "🐲", zh: "个税龙", en: "Tax Dragon" }, 20: { e: "👹", zh: "绩效魔", en: "KPI Demon" },
    25: { e: "🗿", zh: "预算巨人", en: "Budget Giant" }, 30: { e: "🐉", zh: "C&B大魔王", en: "C&B Overlord" }
  };
  function boss(arg) {
    var App = A(), g = BY.boss, n = parseInt(arg, 10);
    var d = App.DAYMAP[n], pool = d && d.type === "review" ? App.dayWords(d) : App.studiedWords();
    var B = BOSSES[n] || BOSSES[5 * Math.min(6, Math.max(1, Math.ceil((pool[pool.length - 1] || { _day: 5 })._day / 5)))] || BOSSES[5];
    var hp = 100, lives = 3, combo = 0, correct = 0, qn = 0, words = App.shuffle(pool);
    var audio = Audio2.available(), types = audio ? ["h2m", "m2h", "h2p", "aud"] : ["h2m", "m2h", "h2p"];
    App.render(header(g) + '<div class="card result boss-intro"><div class="boss-e big">' + B.e + '</div><h2 class="zh">' + B.zh + "</h2><p>" + B.en + '</p><p class="sub">Answer correctly to hit. Streaks hit harder. You have ❤️❤️❤️.</p>' +
      '<button class="btn primary wide" id="go">⚔️ Fight</button></div>', "game");
    document.getElementById("go").onclick = draw;
    function arena() {
      return '<div class="arena card g-boss"><div class="boss-e" id="bossE">' + B.e + '</div><div class="hp"><span id="hpb" style="width:' + hp + '%"></span></div>' +
        '<div class="arena-row"><span class="zh">' + B.zh + '</span><span id="lives">' + "❤️".repeat(lives) + "🖤".repeat(3 - lives) + "</span></div></div>";
    }
    function draw() {
      if (hp <= 0 || lives <= 0 || qn >= 18) return end();
      var q = makeQ(words[qn % words.length], types);
      Audio2.prefetch(words[(qn + 1) % words.length].hanzi);
      App.render(header(g, "⚔️ " + (qn + 1)) + arena() + qHTML(q), "game");
      wireQ(q, function () { qn++; draw(); }, { onAnswer: function (ok) {
        var be = document.getElementById("bossE");
        if (ok) {
          combo++; correct++;
          var dmg = 10 + Math.min(combo - 1, 4) * 2; hp = Math.max(0, hp - dmg);
          Audio2.sfx.hit(); be.classList.add("hit"); UI.pop("−" + dmg, App.rect(be).x, App.rect(be).y, "dmg");
          document.getElementById("hpb").style.width = hp + "%";
        } else {
          combo = 0; lives--;
          document.getElementById("lives").textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
          document.querySelector(".arena").classList.add("hurt");
        }
        if (hp <= 0 || lives <= 0) { var nb = document.getElementById("qnext"); if (nb) nb.textContent = "Finish"; }
      } });
    }
    function end() {
      var win = hp <= 0;
      if (win) Store.state.stats.bossWins++;
      finish("boss", correct, win ? 30 + correct : correct, { title: win ? "Victory! " + B.e + " defeated" : "Defeated… try again", sub: correct + " correct", mood: win ? "cheer" : "sad", arg: arg });
    }
  }

  /* ---------- 6. Quick Quiz ---------- */
  function quick(arg) {
    var App = A(), g = BY.quick, set = /^k\d+$/.test(arg || "") && App.COREMAP[parseInt(arg.slice(1), 10)];
    var pool = App.shuffle(set ? set.words : App.studiedWords()).slice(0, set ? set.words.length : 10), i = 0, score = 0;
    var types = Audio2.available() ? ["h2m", "m2h", "h2p", "aud"] : ["h2m", "m2h", "h2p"];
    function draw() {
      if (i >= pool.length) return finish("quick", score, score * 2, { title: score + " / " + pool.length, arg: set ? arg : "", mood: score >= pool.length * 0.8 ? "cheer" : score >= pool.length / 2 ? "happy" : "sad" });
      var q = makeQ(pool[i], i === 0 ? types.filter(function (t) { return t !== "aud"; }) : types);
      if (pool[i + 1]) Audio2.prefetch(pool[i + 1].hanzi);
      App.render(header(g, "⭐ " + score) + bar(i, pool.length) + qHTML(q), "game");
      wireQ(q, function (ok) { if (ok) score++; i++; draw(); });
    }
    draw();
  }


  /* ---------- 7. Listening Drill ---------- */
  function drillPool() {
    var App = A(), days = {}, out = [], seen = {};
    App.studiedWords().forEach(function (w) { days[w._day] = 1; });
    Object.keys(days).forEach(function (n) {
      var d = App.DAYMAP[n]; if (!d) return;
      function add(o, voice) { if (o && o.zh && !seen[o.zh] && Audio2.has(o.zh)) { seen[o.zh] = 1; out.push({ zh: o.zh, py: o.py, vi: o.vi, en: o.en, voice: voice || "F" }); } }
      if (d.reading) d.reading.lines.forEach(function (l) { add(l, l.speaker ? Audio2.voiceFor(l.speaker) : "F"); });
      (d.words || []).forEach(function (w) { add(w.example); });
    });
    App.WORDS.forEach(function (w) { if (w._set && w.example && SRS.has(w.id) && !seen[w.example.zh] && Audio2.has(w.example.zh)) { seen[w.example.zh] = 1; out.push({ zh: w.example.zh, py: w.example.py, vi: w.example.vi, en: w.example.en, voice: "F" }); } });
    return out;
  }
  function drillCard(it, onDone, autoplay) {
    var App = A();
    var html = '<div class="card qcard" id="qcard"><p class="sub">Listen first. Reveal the text only when you\'re ready.</p>' +
      '<div class="drill-btns"><button class="btn primary" id="d-play">▶ Play</button><button class="btn" id="d-slow">🐢 0.75×</button></div>' +
      '<div id="d-text" class="drill-text" hidden><div class="ex-zh"><span class="zh">' + App.esc(it.zh) + "</span></div>" + (it.py ? App.PY(it.py) : "") + '<div class="tr">' + App.M(it) + "</div></div>" +
      '<button class="btn wide" id="d-rev">👁 Reveal text</button>' +
      '<div class="tf-btns" id="d-grade" hidden><button class="btn good-btn" id="d-ok">Understood ✔</button><button class="btn bad-btn" id="d-no">Missed ✘</button></div></div>';
    return { html: html, wire: function () {
      var play = function (rate) { Audio2.play(it.zh, it.voice, null, rate); };
      document.getElementById("d-play").onclick = function () { play(); };
      document.getElementById("d-slow").onclick = function () { play(0.75); };
      document.getElementById("d-rev").onclick = function () {
        document.getElementById("d-text").hidden = false; document.getElementById("d-grade").hidden = false; this.hidden = true;
      };
      function grade(ok) {
        if (window.Learn) Learn.record("ls:" + it.zh, { kind: "ls", skill: "listen-sentence", zh: it.zh, py: it.py, vi: it.vi, en: it.en, voice: it.voice }, ok);
        (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
        onDone(ok);
      }
      document.getElementById("d-ok").onclick = function () { grade(true); };
      document.getElementById("d-no").onclick = function () { grade(false); };
      if (autoplay) play();
    } };
  }
  function drill() {
    var App = A(), g = BY.drill, pool = App.shuffle(drillPool()).slice(0, RUN.count || 8), i = 0, score = 0;
    if (!pool.length && RUN.onDone) { var cb0 = RUN.onDone; RUN = {}; cb0(0); return; }
    if (!pool.length) {
      App.render(header(g) + '<p class="empty">' + (Audio2.available() ? "Study a day first to unlock sentences." : "Audio isn't generated yet — it's created when you deploy.") + "</p>", "game");
      return;
    }
    (function draw() {
      if (i >= pool.length) return finish("drill", score, score * 2, { title: score + " / " + pool.length + " understood", mood: score >= 6 ? "cheer" : score >= 4 ? "happy" : "sad" });
      var c = drillCard(pool[i], function (ok) { if (ok) score++; i++; draw(); }, i > 0);
      if (pool[i + 1]) Audio2.prefetch(pool[i + 1].zh, pool[i + 1].voice);
      App.render(header(g, (i + 1) + "/" + pool.length) + bar(i, pool.length) + c.html, "game");
      c.wire();
    })();
  }

  /* ---------- 8. Stroke Writing (Hanzi Writer, MIT · stroke data Arphic PL, bundled in vendor/) ---------- */
  var hwLoading = null;
  function loadHW() {
    if (window.HanziWriter) return Promise.resolve();
    if (!hwLoading) hwLoading = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = "vendor/hanzi-writer.min.js"; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
    });
    return hwLoading;
  }
  function charLoader(ch, onLoad, onErr) {
    fetch("vendor/hanzi/" + encodeURIComponent(ch) + ".json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(onLoad).catch(onErr);
  }
  function write(arg) {
    var App = A(), g = BY.write, dayN = parseInt(arg, 10), words;
    var cset = /^k\d+$/.test(arg || "") && App.COREMAP[parseInt(arg.slice(1), 10)];
    if (cset) { words = cset.words.slice(); dayN = arg; }
    else if (dayN && App.DAYMAP[dayN]) words = App.dayWords(App.DAYMAP[dayN]).slice();
    else words = App.shuffle(App.studiedWords()).slice(0, 5);
    if (!words.length) { App.render(header(g) + '<p class="empty">Study a day first.</p>', "game"); return; }
    App.render(header(g) + '<p class="empty">Loading stroke data…</p>', "game");
    loadHW().then(function () { session(); }).catch(function () {
      App.render(header(g) + '<p class="empty">Couldn\'t load the writing module. Check your connection and try again.</p>', "game");
    });
    function session() {
      var wi = 0, score = 0, results = [];
      (function drawWord() {
        if (wi >= words.length) return finish("write", score, score * 3, { title: score + " / " + words.length + " words written well", arg: dayN || "", mood: score === words.length ? "cheer" : "happy",
          review: '<div class="card akey">' + results.map(function (r) { return '<div class="ak-row ' + (r.ok ? "ok" : "no") + '"><span class="ak-n">' + (r.ok ? "✓" : "✗") + '</span><div><span class="zh">' + App.esc(r.w.hanzi) + "</span> " + App.esc(r.w.pinyin) + ' <span class="dim">· ' + (r.skipped ? "skipped" : r.miss + " slip" + (r.miss === 1 ? "" : "s")) + "</span></div></div>"; }).join("") + "</div>" });
        var w = words[wi], chars = Array.from(w.hanzi).filter(function (c) { return /[㐀-鿿]/.test(c); }), ci = 0, miss = 0, skipped = false;
        (function drawChar() {
          if (ci >= chars.length) {
            var ok = !skipped && miss <= chars.length; // about one slip per character is fine
            if (ok) score++;
            results.push({ w: w, ok: ok, miss: miss, skipped: skipped });
            if (window.Learn && !skipped) Learn.record("hw:" + w.id, { skill: "handwriting", statsOnly: true }, ok);
            (ok ? Audio2.sfx.good : Audio2.sfx.bad)();
            wi++; return drawWord();
          }
          var ch = chars[ci], advanced = false;
          function advance(extra) { // one move per character, and only while this screen is still showing
            if (advanced || !document.getElementById("hw")) return;
            advanced = true; if (extra) extra(); ci++; drawChar();
          }
          App.render(header(g, (wi + 1) + "/" + words.length) + bar(wi, words.length) +
            '<div class="card hw-card"><div class="hw-word"><span class="zh">' + Array.from(w.hanzi).map(function (c, k) { return '<b class="' + (c === ch && k >= ci ? "cur" : "") + '">' + App.esc(c) + "</b>"; }).join("") + "</span>" + App.SAY(w.hanzi) +
            '<div>' + App.PY(w.pinyin) + '</div><div class="dim">' + App.M(w) + "</div></div>" +
            '<div class="hw-box" id="hw"></div><p class="sub center" id="hw-msg">Watch the strokes, then trace the character.</p>' +
            '<div class="drill-btns"><button class="btn" id="hw-anim">▶ Strokes</button><button class="btn primary" id="hw-quiz">✍️ Trace</button><button class="btn" id="hw-blind">🙈 Blind</button></div>' +
            '<button class="btn wide" id="hw-skip">Skip ›</button></div>', "game");
          var color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#7c5cff";
          var wr = HanziWriter.create("hw", ch, { width: 260, height: 260, padding: 14, showCharacter: false, showOutline: true, strokeColor: color, radicalColor: color,
            drawingColor: "#333", drawingWidth: 22, highlightColor: "#1fae6d", outlineColor: "rgba(124,92,255,.18)", strokeAnimationSpeed: 1.2, delayBetweenStrokes: 180, charDataLoader: charLoader,
            onLoadCharDataError: function () { skipped = true; var mm = document.getElementById("hw-msg"); if (mm) mm.textContent = "No stroke data for " + ch + " — skipping."; setTimeout(function () { advance(); }, 900); } });
          var msg = document.getElementById("hw-msg");
          function quiz(blind) {
            if (blind) wr.hideOutline(); else wr.showOutline();
            wr.hideCharacter();
            msg.textContent = blind ? "Write it from memory." : "Trace each stroke in order.";
            wr.quiz({ showHintAfterMisses: 2, onMistake: function () { miss++; }, onComplete: function (sum) {
              msg.innerHTML = sum.totalMistakes ? "Done · " + sum.totalMistakes + " slip" + (sum.totalMistakes > 1 ? "s" : "") : "Perfect! ✨";
              setTimeout(function () { advance(); }, 900);
            } });
          }
          var auto = true; // start tracing automatically after the first animation, unless the learner already chose
          document.getElementById("hw-anim").onclick = function () { auto = false; wr.cancelQuiz(); wr.showOutline(); wr.animateCharacter(); };
          document.getElementById("hw-quiz").onclick = function () { auto = false; quiz(false); };
          document.getElementById("hw-blind").onclick = function () { auto = false; quiz(true); };
          document.getElementById("hw-skip").onclick = function () { auto = false; wr.cancelQuiz(); advance(function () { skipped = true; }); };
          wr.animateCharacter({ onComplete: function () { if (auto) quiz(false); } });
        })();
      })();
    }
  }

  /* ---------- 9. Type the Sentence (HSK 4 computer-based writing) ---------- */
  function plain(s) { return String(s || "").replace(/[\s，。？！、：；,.?!:;“”"'‘’（）()…—\-]/g, ""); }
  /* Longest-common-subsequence alignment → which target chars were typed, and which typed chars are extra. */
  function align(a, b) {
    var A = Array.from(a), B = Array.from(b), n = A.length, m = B.length, L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var okA = [], okB = [], x = 0, y = 0;
    while (x < n && y < m) { if (A[x] === B[y]) { okA[x] = okB[y] = true; x++; y++; } else if (L[x + 1][y] >= L[x][y + 1]) x++; else y++; }
    return { A: A, B: B, okA: okA, okB: okB, lcs: L[0][0] };
  }
  /* one round. it = { core, end, py, vi, en } (arrange) or { word, model, vi, en, free: true } (free sentence) */
  function typeCard(it, onDone, opts) {
    var App = A(); opts = opts || {};
    var parts = it.free ? null : (function () { var c = chunk(it.core); var o = App.shuffle(c.slice()); if (o.join("") === c.join("")) o.reverse(); return o; })();
    var html = '<div class="card qcard" id="qcard">' +
      (it.free
        ? '<p class="sub">Write your own sentence (at least 6 characters) that uses:</p><div class="hz big zh">' + App.esc(it.word) + "</div>" + '<div class="tr">' + App.M(it) + "</div>"
        : '<p class="sub">Type these words as one correct sentence:</p><div class="pieces-static">' + parts.map(function (p) { return '<span class="piece zh">' + App.esc(p) + "</span>"; }).join("") + "</div>" +
          '<details class="hint-d"><summary>💡 Meaning</summary><div class="tr">' + App.M(it) + "</div></details>") +
      '<textarea id="ty" class="w2-input ty-in zh" rows="2" lang="zh-CN" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="用拼音输入…"></textarea>' +
      '<div id="qfb"></div><button class="btn primary wide" id="ty-chk">Check</button>' +
      (opts.first ? '<p class="sub small">Tip: add the <b>Chinese (Simplified) – Pinyin</b> keyboard in iPhone Settings → General → Keyboard → Keyboards, then tap 🌐 to switch.</p>' : "") + "</div>";
    return { html: html, wire: function () {
      var ta = document.getElementById("ty"), chk = document.getElementById("ty-chk"), done = false;
      chk.onclick = function () {
        if (done) { onDone(chk.dataset.ok === "1"); return; }
        var got = plain(ta.value);
        if (!got) { UI.shake(ta); return; }
        done = true; ta.disabled = true; chk.textContent = "Next ›";
        var ok, fb;
        if (it.free) {
          var hasWord = got.indexOf(it.word) >= 0, longEnough = Array.from(got).length >= 6;
          fb = '<div class="qexp ' + (hasWord && longEnough ? "ok" : "no") + '">' + (hasWord ? "✓ Uses " : "✗ Doesn't use ") + '<span class="zh">' + App.esc(it.word) + "</span>" + (longEnough ? "" : " · a bit short") +
            '<div class="ex-zh">Model: <span class="zh">' + App.esc(it.model) + "</span></div><p class=\"sub\">Is your sentence correct?</p>" +
            '<div class="tf-btns"><button class="btn good-btn" id="ty-ok">Yes ✔</button><button class="btn bad-btn" id="ty-no">Not quite ✘</button></div></div>';
          document.getElementById("qfb").innerHTML = fb; chk.hidden = true;
          var fin = function (v) { chk.dataset.ok = v ? "1" : "0"; rec(v); (v ? Audio2.sfx.good : Audio2.sfx.bad)(); onDone(v); };
          document.getElementById("ty-ok").onclick = function () { fin(hasWord && longEnough); };
          document.getElementById("ty-no").onclick = function () { fin(false); };
          return;
        }
        var target = plain(it.core), al = align(target, got);
        ok = got === target;
        var close = !ok && al.lcs >= Math.max(1, Math.round(target.length * 0.85)) && Math.abs(got.length - target.length) <= 2;
        var show = al.A.map(function (c, k) { return al.okA[k] ? '<span>' + App.esc(c) + "</span>" : '<span class="miss">' + App.esc(c) + "</span>"; }).join("");
        var yours = al.B.map(function (c, k) { return al.okB[k] ? '<span>' + App.esc(c) + "</span>" : '<span class="extra">' + App.esc(c) + "</span>"; }).join("");
        fb = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Perfect!" : close ? "≈ Almost — check the highlighted characters" : "✗ Not quite") +
          (ok ? "" : '<div class="ty-row"><small>You</small><span class="zh">' + yours + '</span></div><div class="ty-row"><small>Answer</small><span class="zh">' + show + App.esc(it.end || "") + "</span></div>") +
          (it.py ? App.PY(it.py) : "") + "</div>";
        document.getElementById("qfb").innerHTML = fb;
        chk.dataset.ok = ok ? "1" : "0"; rec(ok);
        (ok ? Audio2.sfx.good : Audio2.sfx.bad)(); if (!ok) UI.shake(document.getElementById("qcard"));
      };
      function rec(v) {
        if (!window.Learn) return;
        if (it.free) Learn.record("tf:" + it.word, { skill: "typing", statsOnly: true }, v);
        else Learn.record("ty:" + it.core, { kind: "type", skill: "typing", core: it.core, end: it.end, py: it.py, vi: it.vi, en: it.en }, v);
      }
      ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); chk.click(); } });
    } };
  }
  function typeGame() {
    var App = A(), g = BY.type;
    if (!dict) buildDict();
    var arr = App.shuffle(sentences()).filter(function (s) { var c = chunk(s.core); return c.length >= 3 && new Set(c).size === c.length; }).slice(0, 6);
    var free = App.shuffle(App.studiedWords().filter(function (w) { return w.example && w.hanzi.length >= 2; })).slice(0, 2)
      .map(function (w) { return { free: true, word: w.hanzi, model: w.example.zh, vi: w.vi, en: w.en }; });
    if (RUN.count) { arr = arr.slice(0, RUN.count); free = []; }
    var pool = arr.concat(free), i = 0, score = 0, review = [];
    if (arr.length < (RUN.count ? 1 : 3) && RUN.onDone) { var cb1 = RUN.onDone; RUN = {}; cb1(0); return; }
    if (arr.length < 3 && !RUN.count) { App.render(header(g) + '<p class="empty">Study a few days first to unlock sentences.</p>', "game"); return; }
    (function draw() {
      if (i >= pool.length) return finish("type", score, score * 3, { title: score + " / " + pool.length + " typed correctly", mood: score >= pool.length - 1 ? "cheer" : score >= pool.length / 2 ? "happy" : "sad",
        review: '<div class="card akey">' + review.map(function (r) { return '<div class="ak-row ' + (r.ok ? "ok" : "no") + '"><span class="ak-n">' + (r.ok ? "✓" : "✗") + '</span><div class="zh">' + App.esc(r.t) + "</div></div>"; }).join("") + "</div>" });
      var it = pool[i], c = typeCard(it, function (ok) { if (ok) score++; review.push({ ok: ok, t: it.free ? it.word + " · " + it.model : it.core + (it.end || "") }); i++; draw(); }, { first: i === 0 });
      App.render(header(g, (i + 1) + "/" + pool.length) + bar(i, pool.length) + c.html, "game");
      c.wire();
    })();
  }
  window.Games = { hub: hub, run: run, challenge: challenge, LIST: LIST, _q: { makeQ: makeQ, qHTML: qHTML, wireQ: wireQ }, _drillCard: drillCard, _typeCard: typeCard, _chunk: function (s) { if (!dict) buildDict(); return chunk(s); } };
})();
