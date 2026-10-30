  /* ---------- hands-free listening ----------
     Plays each word twice, then its example sentence, and moves on by itself. Keeps the screen awake
     (iPhone pauses web audio when the screen locks). Lock-screen / headphone controls via Media Session. */
  var LM = null;
  function viewListenMode() {
    var due = SRS.dueIds(WORDMAP).map(function (id) { return WORDMAP[id]; });
    var recent = Object.keys(Store.state.srs).map(function (id) { return WORDMAP[id]; }).filter(Boolean)
      .sort(function (a, b) { return (Store.state.srs[b.id].added || "").localeCompare(Store.state.srs[a.id].added || ""); });
    var pool = (due.length ? due : recent).filter(function (w) { return Audio2.has(w.hanzi); }).slice(0, 30);
    if (!pool.length) { render('<div class="card result">' + UI.mascot("wow", 80) + '<h2>Nothing to play yet</h2><p class="sub">' + (Audio2.available() ? "Add some words to review first." : "Audio isn't generated yet — it's created when you deploy.") + '</p><a class="btn primary" href="#/learn">Learn</a></div>', "review"); return; }
    var i = 0, playing = false, rate = 1, token = 0, wake = null;
    var MS_ACTIONS = ["play", "pause", "nexttrack", "previoustrack"];
    LM = { stop: function () {
      token++; playing = false; Audio2.stop(); if (wake) { try { wake.release(); } catch (e) {} wake = null; }
      if ("mediaSession" in navigator) { MS_ACTIONS.forEach(function (a) { try { navigator.mediaSession.setActionHandler(a, null); } catch (e) {} }); try { navigator.mediaSession.metadata = null; } catch (e) {} }
    } };
    render('<div class="ghead"><a class="pill" href="#/review">✕</a><b>🎧 Hands-free</b><span class="ghr" id="lm-n"></span></div>' +
      '<p class="sub center">' + (due.length ? "Your due words" : "Your most recent words") + " · " + pool.length + ' words · keep the app open, screen stays on</p>' +
      '<div class="card lm-card" id="qcard"><div class="hz big zh" id="lm-hz"></div><div id="lm-py" class="lm-py"></div><div class="w-mean" id="lm-mean"></div><div class="lm-ex" id="lm-ex"></div></div>' +
      '<div class="drill-btns"><button class="btn" id="lm-prev" aria-label="Previous">⏮</button><button class="btn primary" id="lm-play">▶ Start</button><button class="btn" id="lm-next" aria-label="Next">⏭</button></div>' +
      '<div class="drill-btns"><button class="btn small" id="lm-rate">Speed 1×</button></div>', "review");
    function show() {
      var w = pool[i];
      document.getElementById("lm-n").textContent = (i + 1) + "/" + pool.length;
      document.getElementById("lm-hz").textContent = w.hanzi;
      document.getElementById("lm-py").textContent = w.pinyin || "";
      document.getElementById("lm-mean").innerHTML = M(w);
      document.getElementById("lm-ex").innerHTML = w.example ? '<span class="zh">' + esc(w.example.zh) + "</span>" : "";
      if ("mediaSession" in navigator && window.MediaMetadata) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: w.hanzi + (w.pinyin ? "  " + w.pinyin : ""), artist: (w.vi || w.en || ""), album: "C&B Chinese · hands-free" }); } catch (e) {} }
    }
    function wait(ms, t, fn) { setTimeout(function () { if (t === token && playing) fn(); }, ms / rate); }
    function step() {
      var t = token, w = pool[i]; show();
      Audio2.play(w.hanzi, "F", function () { wait(1200, t, function () {
        Audio2.play(w.hanzi, "M", function () { wait(900, t, function () {
          var ex = w.example && Audio2.has(w.example.zh) ? w.example.zh : null;
          var after = function () { wait(1600, t, function () { i = (i + 1) % pool.length; step(); }); };
          if (ex) Audio2.play(ex, "F", after, rate); else after();
        }); }, rate);
      }); }, rate);
    }
    function setPlaying(on) {
      playing = on; token++; Audio2.stop();
      document.getElementById("lm-play").textContent = on ? "⏸ Pause" : "▶ Play";
      if (on) {
        var t0 = token;
        if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (l) {
          if (t0 !== token || !playing || LM === null) { try { l.release(); } catch (e) {} return; } // stopped or left meanwhile
          wake = l;
        }).catch(function () {});
        step();
      } else if (wake) { try { wake.release(); } catch (e) {} wake = null; }
    }
    function jump(d) { i = (i + d + pool.length) % pool.length; show(); if (playing) { token++; Audio2.stop(); step(); } }
    document.getElementById("lm-play").onclick = function () { setPlaying(!playing); };
    document.getElementById("lm-next").onclick = function () { jump(1); };
    document.getElementById("lm-prev").onclick = function () { jump(-1); };
    document.getElementById("lm-rate").onclick = function () { rate = rate === 1 ? 0.75 : 1; this.textContent = "Speed " + (rate === 1 ? "1×" : "0.75×"); };
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", function () { setPlaying(true); });
        navigator.mediaSession.setActionHandler("pause", function () { setPlaying(false); });
        navigator.mediaSession.setActionHandler("nexttrack", function () { jump(1); });
        navigator.mediaSession.setActionHandler("previoustrack", function () { jump(-1); });
      } catch (e) {}
    }
    show();
  }

  /* ---------- Today's session: one tap, about 15 minutes ----------
     Steps (each skipped when empty): due reviews → new HSK 4 Core words → mistakes → typing → listening. */
  /* Session length (Me → Today's session length): how much of each step Today's session runs. */
  /* weak: sentences in a weak-skill step (typing / word order under WEAK_ACC); read: questions in the reading step */
  var SESSION_MODES = {
    quick: { due: 10, fresh: 4, mis: 3, type: 1, listen: 2, weak: 2, read: 2, label: "about 7 minutes" },
    std:   { due: 20, fresh: 8, mis: 5, type: 3, listen: 3, weak: 3, read: 3, label: "about 15 minutes" },
    long:  { due: 40, fresh: 16, mis: 10, type: 6, listen: 6, weak: 3, read: 4, label: "about 30 minutes" }
  };
  /* Accuracy (0-100) of a skill when it is below WEAK_ACC with at least WEAK_MIN answers, else 0. */
  var WEAK_ACC = 0.75, WEAK_MIN = 10;
  function weakSkill(k) {
    var st = (Store.state.skills || {})[k], n = st ? st.r + st.w : 0;
    return n >= WEAK_MIN && st.r / n < WEAK_ACC ? Math.max(1, Math.round(st.r / n * 100)) : 0;
  }
  /* Role-play scene for a lesson topic (lesson day -> CB_TALK id). Review days use the lessons they review.
     Lessons with no scene that fits get the scene the learner has tried least. */
  var TALK_FOR_DAY = { 1: "payslip", 2: "payslip", 3: "payslip", 4: "overtime", 6: "payslip", 7: "payslip", 8: "insurance", 9: "insurance", 11: "payslip", 12: "payslip",
    13: "leave", 14: "probation", 16: "probation", 17: "raise", 18: "review", 19: "review", 21: "offer", 22: "insurance", 32: "raise", 33: "raise", 36: "expenses",
    39: "conflict", 43: "review", 46: "training", 48: "resign", 49: "resign", 57: "remote", 61: "offer", 62: "offer", 63: "offer", 64: "probation", 66: "insurance",
    67: "payslip", 68: "resign", 73: "raise", 76: "conflict", 77: "accident", 78: "conflict", 82: "offer", 84: "insurance" };
  function talkForSession() {
    var T = window.CB_TALK || [], s = Store.state, done = Object.keys(s.days || {}).filter(function (k) { return (s.days[k] || {}).completed; }).map(Number).sort(function (a, b) { return b - a; });
    var d = DAYMAP[done[0]] || nextDay(), days = d ? (d.type === "review" ? (d.reviewOf || []).slice().reverse() : [d.day]) : [];
    for (var i = 0; i < days.length; i++) { var sc = talkScene(TALK_FOR_DAY[days[i]]); if (sc) return sc; }
    var n = {}; (s.talkLog || []).forEach(function (x) { n[x.id] = (n[x.id] || 0) + 1; });
    return T.slice().sort(function (a, b) { return (n[a.id] || 0) - (n[b.id] || 0); })[0] || null; // stable sort: ties keep the CB_TALK order
  }
  function sessionCfg() { return SESSION_MODES[Store.state.settings.sessionMode] || SESSION_MODES.std; }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function sessionPlan(mode) {
    var rescue = mode === true || mode === "rescue", back = mode === "comeback";
    var cfg = sessionCfg(), cs = nextCoreSet() || nextCoreSet("found");
    var due = SRS.dueIds(WORDMAP).slice(0, rescue ? 5 : cfg.due), ew = examFresh(rescue ? 5 : cfg.fresh);
    var fresh = ew.length ? ew : cs ? cs.words.filter(function (w) { return !SRS.has(w.id); }).slice(0, rescue ? 5 : cfg.fresh) : [];
    var el = examLeft(); if (el != null && el >= 0 && el <= 2) { fresh = []; ew = []; } // the last 2 days: review only, nothing new
    var steps = [];
    if (back) { // 5 minutes after a break: the oldest overdue words first, a couple of mistakes, then a short listening
      var old = SRS.dueIds(WORDMAP).sort(function (a, b) { var x = (SRS.get(a) || {}).due || "", y = (SRS.get(b) || {}).due || ""; return x < y ? -1 : x > y ? 1 : 0; }).slice(0, 8);
      if (old.length) steps.push({ id: "review", icon: "🔁", name: "Review " + plural(old.length, "overdue word"), ids: old });
      else if (fresh.length) steps.push({ id: "new", icon: "📘", name: plural(fresh.length, "new word"), words: fresh });
      if (Learn.count()) steps.push({ id: "mistakes", icon: "📒", name: "Fix up to 2 mistakes", n: 2 });
      if (Audio2.available()) steps.push({ id: "listen", icon: "🎧", name: "Listen to 2 sentences", n: 2 });
      else steps.push({ id: "type", icon: "⌨️", name: "Type 1 sentence", n: 1 });
      return steps;
    }
    if (rescue) { // 2 minutes: five cards (due ones, otherwise five new words), then one short listening or typing step
      if (due.length) steps.push({ id: "review", icon: "🔁", name: "Review " + plural(due.length, "due word"), ids: due });
      else if (fresh.length) steps.push({ id: "new", icon: "📘", name: plural(fresh.length, "new word"), words: fresh });
      if (Audio2.available()) steps.push({ id: "listen", icon: "🎧", name: "Listen to 2 sentences", n: 2 });
      else steps.push({ id: "type", icon: "⌨️", name: "Type 1 sentence", n: 1 });
      return steps;
    }
    if (due.length) steps.push({ id: "review", icon: "🔁", name: "Review " + plural(due.length, "due word"), ids: due });
    if (fresh.length) steps.push({ id: "new", icon: "📘", name: ew.length ? plural(fresh.length, "exam word") + " (used most in the tests)" : fresh.length + " new " + (isFound(cs) ? "HSK 1–3 Foundation" : "HSK 4 Core") + " words", words: fresh });
    var pi = paceIssue();
    if (pi) steps.push({ id: "pace", icon: "⏱", name: "Timed: " + PART_NAME[pi.k] + " (time ran out in your last mock)", part: pi.k });
    if (Learn.count()) steps.push({ id: "mistakes", icon: "📒", name: "Fix up to " + cfg.mis + " mistakes", n: cfg.mis });
    /* a weak typing skill turns the typing step into a focus step (never two typing steps); weak word order adds its own short step */
    var wt = weakSkill("typing"), wo = weakSkill("word-order");
    if (wt) { var nt = Math.max(cfg.type, cfg.weak); steps.push({ id: "weak-type", icon: "🎯", name: "Typing focus: " + plural(nt, "sentence") + " (" + wt + "% so far)", n: nt }); }
    else steps.push({ id: "type", icon: "⌨️", name: "Type " + plural(cfg.type, "sentence"), n: cfg.type });
    if (wo) steps.push({ id: "weak-order", icon: "🧱", name: "Word order focus: " + plural(cfg.weak, "sentence") + " (" + wo + "% so far)", n: cfg.weak });
    if (readingWeakest()) steps.push({ id: "reading", icon: "📖", name: "Reading: " + plural(cfg.read, "question") + " (your weakest section)", n: cfg.read });
    if (Audio2.available()) steps.push({ id: "listen", icon: "🎧", name: "Listen to " + plural(cfg.listen, "sentence"), n: cfg.listen });
    /* writing part 2 every day while the AI is on: two sentences, scored by the AI examiner */
    if (window.AI && AI.available()) steps.push({ id: "write", icon: "✍️", name: "Write 2 sentences (AI scores them)", n: 2 });
    /* optional last step, only with the AI on and online: a 3-reply role-play on the current lesson's topic */
    var tsc = window.AI && AI.available() ? talkForSession() : null;
    if (tsc) steps.push({ id: "talk", icon: "🗣️", name: "Talk 3 minutes (optional): " + (Store.state.settings.lang === "vi" ? tsc.t.vi : tsc.t.en), scene: tsc.id, optional: true });
    return steps;
  }
  function sessionCTA() {
    var s = Store.state, done = (s.sessions || {})[Store.today()], steps = sessionPlan();
    return '<a class="cta card g-violet session-cta' + (done ? " done" : "") + '" href="#/session"><span class="cta-l"><small>' + (done ? "Done today ✓ · run again anytime" : "One tap · " + sessionCfg().label) + "</small><b>▶ Today's session</b><em>" +
      esc(steps.map(function (x) { return x.icon; }).join(" ")) + " " + steps.length + " steps</em></span><span class=\"cta-go\">▶</span></a>";
  }
  /* A tiny version of today that still counts for the streak and the weekly goal. */
  function shortLink() {
    var s = Store.state, t = Store.today();
    if ((s.log[t] || 0) > 0 || (s.sessions || {})[t] || rescueCard()) return "";
    return '<a class="mini-link has-dog" href="#/session/rescue">' + UI.anim("dog-peek", 46, "⏱") + "<span>Short on time? Do the 2-minute version</span></a>";
  }
  /* After your study time with a streak running and nothing studied yet: offer the 2-minute rescue. */
  function rescueCard() {
    var s = Store.state, t = Store.today(), now = new Date(), hour = now.getHours() + now.getMinutes() / 60;
    if (Store.streak() < 1 || (s.log[t] || 0) > 0 || hour < atRiskHour()) return "";
    return '<a class="cta card g-coral" href="#/session/rescue"><span class="cta-l"><small>🔥 ' + Store.streak() + '-day streak at risk</small><b>⏱ 2-minute rescue</b><em>Five cards and a short listening — keeps your streak alive</em></span><span class="cta-go">▶</span></a>';
  }
  /* The last day with study before today (null if none). */
  function lastStudyDay() {
    var t = Store.today(), L = Store.state.log, ds = Object.keys(L).filter(function (d) { return L[d] > 0 && d < t; }).sort();
    return ds.length ? ds[ds.length - 1] : null;
  }
  /* Back after 2+ days away and nothing studied yet today: a 5-minute restart, first thing on Home. */
  function comebackCard() {
    var s = Store.state, t = Store.today(), last = lastStudyDay(), gap = last ? Store.daysBetween(last, t) : 0;
    if (!last || gap < 2 || (s.log[t] || 0) > 0) return "";
    return '<a class="cta card g-coral comeback" href="#/session/comeback"><span class="cta-l"><small>👋 Welcome back · ' + gap + ' days away</small><b>⏱ 5-minute restart</b><em>Your oldest reviews first, then a short listening. Small steps count.</em></span><span class="cta-go">▶</span></a>';
  }


  /* ---------- the last two days before each learner's own exam ----------
     The day before: a checklist (kept per exam date) and light review. Exam day: a short warm-up with easy words and one
     strategy line per part. New words stop 2 days before the exam. Everything follows the date set in My exams. */
  var EVE = [["ticket", "Admission ticket (准考证) printed or saved on the phone"], ["id", "The ID card or passport you registered with"], ["route", "Know where the test centre is and how long it takes to get there"],
    ["early", "Plan to arrive 30 minutes early"], ["rules", "Read the test centre's rules (what you may bring)"], ["time", "Exam start time saved in My exams"], ["sleep", "Light review only today, then sleep early"]];
  function eveDone() { var ex = Store.state.settings.examDate, c = (Store.state.eve || {})[ex] || {}; return EVE.filter(function (x) { return x[0] === "time" ? !!Store.state.settings.examTime || c.time : c[x[0]]; }).length; }
  function viewEve() {
    var s = Store.state, ex = s.settings.examDate, c = (s.eve || (s.eve = {}))[ex] || {};
    var html = '<section class="card g-sun"><h2>🎒 Ready for tomorrow?</h2><p class="sub">HSK ' + exLv() + " · " + esc(lrnDate(ex)) + (s.settings.examTime ? " at " + esc(s.settings.examTime) : "") + '. Tick each one. Nothing new to learn today: a rested brain scores better than one more hour of study.</p></section>' +
      '<section class="card"><ul class="eve-list">' + EVE.map(function (x) {
        var on = x[0] === "time" ? !!s.settings.examTime || !!c.time : !!c[x[0]];
        return '<li><label><input type="checkbox" data-eve="' + x[0] + '"' + (on ? " checked" : "") + "> " + esc(x[1]) + "</label>" + (x[0] === "time" && !s.settings.examTime ? ' <a href="#/exams">Set it ›</a>' : "") + "</li>";
      }).join("") + '</ul><p class="sub" id="eve-n">' + eveDone() + "/" + EVE.length + ' ready</p></section>' +
      '<section class="card"><h2>Light review</h2><p class="sub">10 minutes at most: your due words, then the strategy line for each part.</p><div class="actions"><a class="btn primary" href="#/review">🔁 Review due words</a><a class="btn" href="#/warmup">💡 Strategy per part</a></div></section>';
    render(html, "home");
    app.querySelectorAll("[data-eve]").forEach(function (b) {
      b.onchange = function () { var cc = s.eve[ex] || (s.eve[ex] = {}), k = b.getAttribute("data-eve"); if (b.checked) cc[k] = 1; else delete cc[k]; Store.save(); document.getElementById("eve-n").textContent = eveDone() + "/" + EVE.length + " ready";
        if (eveDone() === EVE.length) UI.toast("All set for tomorrow. Sleep well! 加油", "🌙"); };
    });
  }
  /* exam morning: easy words she already knows (confidence, not new learning) and one tip per part */
  function viewWarmup() {
    var s = Store.state, srs = s.srs, known = shuffle(Object.keys(srs).filter(function (id) { return WORDMAP[id] && !/^h5-/.test(id) && srs[id].box >= 3; })).slice(0, 10).map(function (id) { return WORDMAP[id]; });
    var parts = ["L1", "L2", "L3", "R1", "R2", "R3", "W1", "W2"];
    var html = '<section class="card g-sun"><h2>🌅 Exam-morning warm-up</h2><p class="sub">' + (examLeft() === 0 ? "Today is the day" + (s.settings.examTime ? " · start at " + esc(s.settings.examTime) : "") + ". " : "") + "Wake your Chinese up with words you already know, then read one line per part. Don't learn anything new now.</p>" +
      (known.length ? '<button class="btn primary big" id="wu-go">▶ ' + known.length + " easy words · 3 min</button>" : "") + "</section>" +
      '<section class="card"><h2>One tip per part</h2>' + parts.map(function (k) { return '<h3 class="wu-h">' + esc(PART_NAME[k]) + "</h3>" + partTip(k); }).join("") +
      '<p class="sub">If you are stuck: pick an answer and move on. A blank always scores 0, a guess sometimes scores. 加油！</p></section>';
    render(html, "home");
    var b = document.getElementById("wu-go");
    if (b) b.onclick = function () { (s.warm || (s.warm = {}))[Store.today()] = 1; Store.save(); runDeck({ title: "Warm-up", words: known, mode: "review", back: "#/warmup" }); };
  }

