  /* ---------- speaking: shadowing (listen, record, compare) ----------
     Sentences are the example sentences of words the learner already studies (weak words first, short first), read by
     the same voice as the rest of the app: the recorded neural voice, or the phone's Chinese voice when a clip isn't
     recorded yet. To keep the model trustworthy, sentences with characters that have two common readings (多音字,
     which a synthetic voice sometimes misreads) are left out, and every sentence has a "sounds wrong?" report link.
     The learner records with the phone's microphone; the recording stays in memory, is never uploaded, and the
     microphone is released after each recording. No microphone (denied, or not supported): listen and repeat. */
  var POLY = /[行长重调传处便差数种觉背假降量相间应难乐空教冲结落角朝省曾薄]/, SPEAK_LEN = [5, 22];
  function speakFocus() { var f = Store.state.settings.focus; return ["exam", "mix", "both", "speak"].indexOf(f) >= 0 ? f : "mix"; }
  function zhLen(t) { return String(t || "").replace(/[^㐀-鿿]/g, "").length; }
  /* sentences to shadow: [{ id, zh, py, mean, w }] where w is the word the sentence belongs to */
  function shadowPool() {
    var S0 = Store.state.srs, seen = {}, out = [];
    (Store.state.speakSeen || []).forEach(function (id, i) { seen[id] = i + 1; });
    var ids = Object.keys(S0).filter(function (id) { return WORDMAP[id] && !/^h5-/.test(id); });
    if (ids.length < 5) DAYS.slice(0, 3).forEach(function (d) { (d.words || []).forEach(function (w) { if (ids.indexOf(w.id) < 0) ids.push(w.id); }); });
    ids.forEach(function (id) {
      var w = WORDMAP[id], ex = w && w.example, n = ex ? zhLen(ex.zh) : 0;
      if (!ex || !ex.zh || n < SPEAK_LEN[0] || n > SPEAK_LEN[1] || POLY.test(ex.zh)) return;
      var c = S0[id] || {};
      out.push({ id: id, zh: ex.zh, py: ex.py || "", mean: (Store.state.settings.lang === "en" ? ex.en : ex.vi) || ex.en || ex.vi || "", w: w,
        weak: (c.lapses || 0) * 2 + Math.max(0, (c.wrong || 0) - (c.right || 0)), n: n, seen: seen[id] || 0 });
    });
    // not shadowed recently first, then weak words, then short sentences
    out.sort(function (a, b) { return (a.seen ? 1 : 0) - (b.seen ? 1 : 0) || a.seen - b.seen || b.weak - a.weak || a.n - b.n; });
    return out;
  }
  function speakWeek() { var s = Store.state.speak || {}, t = Store.today(), n = 0; for (var i = 0; i < 7; i++) n += s[Store.addDays(t, -i)] || 0; return n; }
  function speakCount(k) {
    var s = Store.state, t = Store.today(); s.speak = s.speak || {}; s.speak[t] = (s.speak[t] || 0) + k;
    Store.save(); if (typeof syncSoon === "function") syncSoon();
  }
  /* microphone: one recording at a time, released as soon as it stops */
  var REC = { stream: null, mr: null, chunks: [], url: null, timer: null };
  function recOK() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
  function recRelease() { clearTimeout(REC.timer); if (REC.stream) REC.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* ignore */ } }); REC.stream = null; REC.mr = null; }
  function recDrop() { recRelease(); if (REC.url) { try { URL.revokeObjectURL(REC.url); } catch (e) { /* ignore */ } } REC.url = null; }
  function recStart(onStop) {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      REC.stream = st; REC.chunks = [];
      var mr = new MediaRecorder(st); REC.mr = mr;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
      mr.onstop = function () {
        var b = new Blob(REC.chunks, { type: mr.mimeType || "audio/mp4" }); recRelease();
        if (REC.url) { try { URL.revokeObjectURL(REC.url); } catch (e) { /* ignore */ } }
        REC.url = b.size ? URL.createObjectURL(b) : null; onStop(REC.url);
      };
      mr.start();
      REC.timer = setTimeout(function () { recStop(); }, 15000); // a sentence never needs more than 15 seconds
    });
  }
  function recStop() { var mr = REC.mr; if (mr && mr.state !== "inactive") { try { mr.stop(); } catch (e) { recRelease(); } } else recRelease(); }
  function playMine(url, cb) {
    if (!url) { if (cb) cb(); return; }
    try { var a = new Audio(url); a.onended = function () { if (cb) cb(); }; a.onerror = a.onended; var p = a.play(); if (p && p.catch) p.catch(function () { if (cb) cb(); }); } catch (e) { if (cb) cb(); }
  }
  /* #/shadow, or a step of Today's session: o = { n, onDone, exit } */
  function viewShadow(o) {
    o = o || {};
    var pool = shadowPool(), n = Math.max(1, Math.min(o.n || 5, pool.length)), list = pool.slice(0, n), i = 0, again = {}, ok = 0, said = 0, mic = recOK(), denied = false, myHash = location.hash;
    var exit = o.exit || "#/games";
    if (!list.length) { render('<section class="card"><h2>' + tx("🗣️ Shadowing") + '</h2><p class="sub">' + tx("Learn a few words first: their example sentences become your speaking practice.") + '</p><a class="btn primary" href="#/learn">' + tx("Learn") + "</a></section>", "games"); return; }
    var leave = function () { if (location.hash !== myHash) { recDrop(); Audio2.stop(); window.removeEventListener("hashchange", leave); } };
    window.addEventListener("hashchange", leave);
    function done() {
      window.removeEventListener("hashchange", leave); recDrop();
      if (said) { var s = Store.state; s.speakSeen = (s.speakSeen || []).filter(function (id) { return !list.some(function (x) { return x.id === id; }); }).concat(list.map(function (x) { return x.id; }).filter(function (id, k, arr) { return arr.indexOf(id) === k; })).slice(-300); speakCount(said); }
      if (o.onDone) { o.onDone(said ? Math.round(ok / Math.max(1, said) * 100) : 0); return; }
      render('<section class="card result">' + UI.mascot("cheer", 80) + "<h2>" + tx("Nice speaking! 🗣️") + '</h2><p class="sub">' + tx("{n} sentences said aloud · {w} this week", { n: said, w: speakWeek() }) + "</p>" +
        '<div class="actions center"><a class="btn primary" href="#/shadow">' + tx("▶ 5 more") + '</a><a class="btn" href="' + esc(exit) + '">' + tx("Done") + "</a></div></section>", "games");
    }
    function draw(stage) {
      var x = list[i], head = '<div class="ghead"><a class="pill" href="' + esc(exit) + '" aria-label="' + tx("Close") + '">✕</a><b>' + tx("🗣️ Shadowing") + '</b><span class="ghr">' + (i + 1) + "/" + list.length + "</span></div>";
      var steps = mic && !denied
        ? (stage === "rec" ? '<button class="btn bad big" id="sh-stop">⏹ ' + tx("Stop") + "</button>" :
           stage === "done" ? '<div class="actions center"><button class="btn primary" id="sh-cmp">▶ ' + tx("Compare: voice, then you") + '</button><button class="btn" id="sh-mine">' + tx("Only me") + '</button><button class="btn" id="sh-rec">🎙 ' + tx("Record again") + "</button></div>" :
           '<button class="btn primary big" id="sh-rec">🎙 ' + tx("Record yourself") + "</button>")
        : '<p class="sub">' + (denied ? tx("No microphone access, so this is listen and repeat: play the sentence, say it aloud, then rate yourself.") : tx("This phone can't record here, so this is listen and repeat: play the sentence, say it aloud, then rate yourself.")) + "</p>";
      var rate = stage !== "rec" ? '<div class="actions center sh-rate"><button class="btn good" data-sh="ok">✓ ' + tx("Close enough") + '</button><button class="btn" data-sh="again">↻ ' + tx("Try again later") + "</button></div>" : "";
      render(head + '<section class="card qcard sh-card"><p class="sub">' + tx("Listen, say it aloud the same way, then compare.") + "</p>" +
        '<p class="zh sh-zh">' + linkWords(x.zh) + "</p>" + PY(x.py) + '<p class="dim">' + esc(x.mean) + "</p>" +
        '<div class="actions center"><button class="btn" id="sh-play">🔊 ' + tx("Listen") + '</button><button class="btn" id="sh-slow">🐢 ' + tx("Slow") + "</button></div>" +
        '<div class="sh-steps">' + (stage === "rec" ? '<p class="sh-live" role="status">🔴 ' + tx("Recording… say the sentence") + "</p>" : "") + steps + "</div>" + rate +
        '<p class="sub sh-note">' + tx("The model voice is an AI voice (Microsoft neural), not a teacher. You compare by ear.") + ' <button type="button" class="linklike" id="sh-bad">🚩 ' + tx("Sounds wrong?") + "</button></p></section>" +
        (o.onDone ? '<p class="center"><button type="button" class="linklike" id="sh-skip">' + tx("Can't speak right now · skip") + "</button></p>" : ""), "games");
      var on = function (id, fn) { var b = document.getElementById(id); if (b) b.onclick = fn; };
      on("sh-play", function () { Audio2.play(x.zh, "F"); });
      on("sh-slow", function () { Audio2.play(x.zh, "F", null, 0.7); });
      on("sh-rec", function () {
        Audio2.stop();
        recStart(function (url) { if (location.hash === myHash && list[i] === x) draw(url ? "done" : "idle"); }).then(function () { draw("rec"); }, function () { recDrop(); denied = true; draw("idle"); });
      });
      on("sh-stop", function () { recStop(); });
      on("sh-cmp", function () { Audio2.play(x.zh, "F", function () { setTimeout(function () { playMine(REC.url); }, 250); }); });
      on("sh-mine", function () { playMine(REC.url); });
      on("sh-bad", function () { openReport({ ref: "word:" + x.id, label: tx("Example sentence of {w} (shadowing)", { w: x.w.hanzi }) }); });
      on("sh-skip", function () { recDrop(); window.removeEventListener("hashchange", leave); o.onDone(0); });
      [].forEach.call(document.querySelectorAll("[data-sh]"), function (b) {
        b.onclick = function () {
          var good = b.getAttribute("data-sh") === "ok"; said++;
          if (good) ok++; else if (!again[x.id]) { again[x.id] = 1; list.push(x); } // one more try at the end of the round
          recDrop(); i++;
          if (i >= list.length) done(); else draw("idle");
        };
      });
      if (stage === "idle") Audio2.play(x.zh, "F"); // hear it first
    }
    draw("idle");
  }
  /* Practice tab: the speaking section (at the top when speaking is the learner's focus) */
  function speakSection() {
    var w = speakWeek(), talkOn = !!(window.AI && AI.configured());
    return '<h2 class="gh">' + tx("🗣️ Speaking") + '</h2><div class="glist speak-list">' +
      '<a class="grow" href="#/shadow"><span class="g-ico">🎙</span><span class="g-txt"><b>' + tx("Shadowing · listen, record, compare") + "</b><small>" + (w ? tx("{n} sentences said aloud this week", { n: w }) : tx("5 sentences from your words · about 2 min")) + '</small></span><span class="g-go">▶</span></a>' +
      '<a class="grow" href="#/talk"><span class="g-ico">💬</span><span class="g-txt"><b>' + tx("Role-play with AI") + "</b><small>" + (talkOn ? tx("Answer a colleague or candidate in Chinese") : tx("Needs the AI assistant (Me → AI assistant)")) + '</small></span><span class="g-go">▶</span></a>' +
      '<a class="grow" href="#/phrases"><span class="g-ico">📋</span><span class="g-txt"><b>' + tx("HR phrasebook") + "</b><small>" + tx("Ready-made messages with audio, to say aloud") + '</small></span><span class="g-go">▶</span></a></div>';
  }
  /* Today: how many sentences to shadow for this learner's focus (0 = no speaking step) */
  function speakStepN() {
    var f = speakFocus(), el = examLeft();
    if (f === "exam") return 0;
    if (f === "mix" && el != null && el >= 0 && el <= 7) return 0; // the exam week is for the exam unless speaking was chosen
    return f === "speak" ? 8 : f === "both" ? 5 : 3;
  }
