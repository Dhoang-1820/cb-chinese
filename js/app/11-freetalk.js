  /* ---------- Free talk with AI (#/freetalk) ----------
     Speaking practice on any topic the learner picks, with a partner (friend, colleague, teacher, interviewer), a level,
     and how often to be corrected. Voice mode: the AI's reply is spoken, then the mic opens by itself; the learner answers
     aloud and it is sent when they stop (the text stays hidden until "Show text"). Stuck? "Say it in Vietnamese": the AI
     gives the Chinese, the learner says it, and the app shows what the phone heard against it.
     Server tasks: freetalk (one turn, same answer shape as roleplay) and sayit. Nothing is uploaded but the text. */
  var FT_KEY = "cbChinese.freetalk";
  var FT_TOPICS = [["🌤️", "My day"], ["🍜", "Food"], ["✈️", "Travel"], ["🎬", "Films and music"], ["👨‍👩‍👧", "Family"], ["💼", "Work"],
    ["🗓️", "Weekend plans"], ["🇻🇳", "Vietnam and China"], ["🎨", "Hobbies"], ["🤝", "A job interview"]];
  var FT_PARTNERS = [["friend", "🙂", "Friend"], ["colleague", "💼", "Colleague"], ["teacher", "🧑‍🏫", "Teacher"], ["interviewer", "🎤", "Interviewer"]];
  function ftPrefs() {
    var d = { topic: "", partner: "friend", level: "hsk4", fix: "each", voice: true };
    try { var v = JSON.parse(localStorage.getItem(FT_KEY) || "{}"); Object.keys(d).forEach(function (k) { if (v[k] != null) d[k] = v[k]; }); } catch (e) { /* storage blocked */ }
    if (["hsk3", "hsk4", "hsk5"].indexOf(d.level) < 0) d.level = "hsk4";
    if (["each", "end", "off"].indexOf(d.fix) < 0) d.fix = "each";
    return d;
  }
  function ftSave(p) { try { localStorage.setItem(FT_KEY, JSON.stringify(p)); } catch (e) { /* storage blocked */ } }
  function ftSR() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
  /* words added to review in the last 7 days: the AI weaves them in where they fit */
  function ftWeekWords() {
    var since = Store.addDays(Store.today(), -7), s = Store.state.srs || {};
    return Object.keys(s).filter(function (id) { return s[id] && s[id].added >= since && WORDMAP[id] && !/^h5-/.test(id); })
      .map(function (id) { return WORDMAP[id].hanzi; }).filter(function (h) { return h.length <= 4; }).slice(-12);
  }
  /* what the phone heard against what the learner meant to say: the characters it did not hear are marked */
  function ftHeardDiff(target, heard) {
    var clean = function (s) { return Array.from(String(s || "").replace(/[\s，。！？、,.!?；;：:“”"'（）()]/g, "")); };
    var a = clean(target), b = clean(heard), n = a.length, m = b.length, L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = "", miss = 0; i = 0; j = 0;
    while (i < n) {
      if (j < m && a[i] === b[j]) { out += esc(a[i]); i++; j++; }
      else if (j < m && L[i][j + 1] >= L[i + 1][j]) j++;
      else { out += '<mark class="ft-miss">' + esc(a[i]) + "</mark>"; miss++; i++; }
    }
    return { html: out, miss: miss, total: n };
  }

  function viewFreeTalk() {
    var p = ftPrefs(), SR = ftSR(), aiOK = window.AI && AI.configured();
    var seg = function (name, items, cur) {
      return '<div class="seg ft-seg" role="group" aria-label="' + esc(name) + '">' + items.map(function (x) {
        return '<button type="button" class="chip' + (x[0] === cur ? " on" : "") + '" aria-pressed="' + (x[0] === cur) + '" data-ft-' + esc(name) + '="' + esc(x[0]) + '">' + x[1] + "</button>";
      }).join("") + "</div>";
    };
    render('<section class="card ft-setup"><h2>🎙️ ' + tx("Free talk with AI") + '</h2><p class="sub">' + tx("Talk about anything in Chinese. The AI keeps the conversation going, corrects you, and helps when you are stuck.") + "</p>" +
      '<h3 class="ft-h">' + tx("Topic") + '</h3><div class="ft-topics">' + FT_TOPICS.map(function (t) { return '<button type="button" class="chip" data-ft-topic="' + esc(tx(t[1])) + '">' + t[0] + " " + tx(t[1]) + "</button>"; }).join("") + "</div>" +
      '<label class="ft-lab" for="ft-topic">' + tx("…or type any topic (Vietnamese, English or Chinese)") + '</label><input id="ft-topic" maxlength="80" autocomplete="off" value="' + esc(p.topic) + '" placeholder="' + tx("e.g. my cat, football, saving money") + '">' +
      '<h3 class="ft-h">' + tx("Who you talk to") + "</h3>" + seg("partner", FT_PARTNERS.map(function (x) { return [x[0], x[1] + " " + tx(x[2])]; }), p.partner) +
      '<h3 class="ft-h">' + tx("Level") + "</h3>" + seg("level", [["hsk3", "HSK 3"], ["hsk4", "HSK 4"], ["hsk5", "HSK 5"]], p.level) +
      '<h3 class="ft-h">' + tx("Corrections") + "</h3>" + seg("fix", [["each", tx("After each reply")], ["end", tx("At the end")], ["off", tx("Off")]], p.fix) +
      (SR ? '<label class="ft-voice"><input type="checkbox" id="ft-voice"' + (p.voice ? " checked" : "") + "> <span><b>🎧 " + tx("Voice mode") + "</b><br><small>" +
        tx("The AI speaks, then the mic opens by itself. Answer aloud; the text stays hidden until you tap Show.") + "</small></span></label>"
        : '<p class="sub">🎤 ' + tx("Voice input is not available in this browser. Use your pinyin keyboard.") + "</p>") +
      (aiOK ? "" : '<p class="warn">' + tx("Set up AI first: Me → AI assistant.") + "</p>") +
      '<button type="button" class="btn primary wide" id="ft-go"' + (aiOK ? "" : " disabled") + ">▶ " + tx("Start talking") + "</button></section>" +
      '<div class="actions center"><a class="btn" href="#/talk">🗣️ ' + tx("HR role-play scenes") + "</a></div>", "games");
    var inp = document.getElementById("ft-topic");
    [].forEach.call(document.querySelectorAll("[data-ft-topic]"), function (b) {
      b.onclick = function () { inp.value = b.getAttribute("data-ft-topic"); [].forEach.call(document.querySelectorAll("[data-ft-topic]"), function (x) { x.classList.toggle("on", x === b); });
        if (/interview|phỏng vấn/i.test(inp.value)) { var iv = document.querySelector('[data-ft-partner="interviewer"]'); if (iv) iv.click(); } };
    });
    ["partner", "level", "fix"].forEach(function (k) {
      [].forEach.call(document.querySelectorAll("[data-ft-" + k + "]"), function (b) {
        b.onclick = function () { p[k] = b.getAttribute("data-ft-" + k); [].forEach.call(document.querySelectorAll("[data-ft-" + k + "]"), function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); }); };
      });
    });
    document.getElementById("ft-go").onclick = function () {
      var t = inp.value.trim();
      if (!t) { UI.toast(tx("Pick or type a topic first"), "💬"); inp.focus(); return; }
      p.topic = t.slice(0, 80); var v = document.getElementById("ft-voice"); p.voice = !!(v && v.checked); ftSave(p);
      if (window.Audio2 && Audio2.unlock) Audio2.unlock(); // inside the tap, so iPhone lets the first reply be spoken
      runFreeTalk(p);
    };
  }

  function runFreeTalk(cfg) {
    var SR = ftSR(), voice = !!(cfg.voice && SR), autoMic = true, hist = [], turns = 0, busy = false, done = false, lastHint = "", target = "", fixes = [];
    var partner = FT_PARTNERS.filter(function (x) { return x[0] === cfg.partner; })[0] || FT_PARTNERS[0], words = ftWeekWords(), rec = null, myHash = location.hash;
    render('<div class="ghead"><a class="pill" href="#/freetalk" id="ft-x">✕</a><b>' + partner[1] + " " + esc(cfg.topic) + '</b><span class="ghr" id="ft-n">0</span></div>' +
      '<div id="ft-log" class="talk-log" aria-live="polite"></div>' +
      '<div class="talk-in ft-in" id="ft-in">' +
      '<div class="talk-hint"><button type="button" class="chip" id="ft-hint">💡 ' + tx("Hint") + '</button><button type="button" class="chip" id="ft-vi">🇻🇳 ' + tx("Say it in Vietnamese") + '</button><span id="ft-hint-t" class="dim"></span></div>' +
      '<div id="ft-say" class="ft-say" hidden></div>' +
      (voice ? '<button type="button" class="btn primary wide ft-talk" id="ft-talk">🎤 ' + tx("Tap to talk") + "</button>" : "") +
      '<div class="talk-row"><input id="ft-text" class="zh" lang="zh-CN" maxlength="120" autocomplete="off" aria-label="' + tx("Your reply in Chinese") + '" placeholder="用中文回答…">' +
      (SR && !voice ? '<button type="button" class="btn small" id="ft-mic" aria-label="' + tx("Speak in Chinese") + '">🎤</button>' : "") +
      '<button type="button" class="btn primary small" id="ft-send">' + tx("Send") + "</button></div>" +
      '<div class="actions center"><button type="button" class="btn small" id="ft-fin" hidden>🏁 ' + tx("Finish and get my feedback") + "</button></div></div>", "games");
    var log = document.getElementById("ft-log"), inp = document.getElementById("ft-text"), fin = document.getElementById("ft-fin"), talkBtn = document.getElementById("ft-talk");
    function alive() { return location.hash === myHash && log.isConnected; }
    function scrollEnd() { window.scrollTo(0, document.body.scrollHeight); }
    function stopMic() { if (rec) { try { rec.abort(); } catch (e) { /* already stopped */ } rec = null; } setTalk("idle"); }
    window.addEventListener("hashchange", function bye() { window.removeEventListener("hashchange", bye); stopMic(); if (window.Audio2 && Audio2.stop) Audio2.stop(); });
    function setTalk(st) {
      var mb = document.getElementById("ft-mic");
      if (mb) { mb.textContent = st === "rec" ? "●" : "🎤"; mb.classList.toggle("on", st === "rec"); }
      if (!talkBtn) return;
      talkBtn.classList.toggle("on", st === "rec"); talkBtn.disabled = st === "wait";
      talkBtn.textContent = st === "rec" ? "● " + tx("Listening… tap to stop") : st === "wait" ? "…" : "🎤 " + tx("Tap to talk");
    }
    function aiBubble(r, wordsList) {
      var hide = voice;
      var div = document.createElement("div"); div.className = "tb tb-ai" + (hide ? " ft-hid" : "");
      div.innerHTML = '<div class="tb-who">' + partner[1] + " " + tx(partner[2]) + "</div>" +
        '<div class="ft-body"><div class="zh">' + esc(r.zh) + "</div>" + PY(r.pinyin || "") + '<div class="dim">' + esc(r.meaning || "") + "</div>" +
        ((wordsList || []).length ? '<div class="tb-words">' + wordsList.map(function (w) { return '<span class="tw"><b class="zh">' + esc(w.zh) + "</b> " + esc(w.pinyin) + " · " + esc(w.meaning) + "</span>"; }).join("") + "</div>" : "") + "</div>" +
        '<div class="ft-ctl"><button type="button" class="chip" data-ft="play">🔊 ' + tx("Play again") + '</button><button type="button" class="chip" data-ft="slow">🐢 ' + tx("Slow") + "</button>" +
        (hide ? '<button type="button" class="chip" data-ft="show">👁 ' + tx("Show text") + "</button>" : "") + "</div>";
      div.querySelector('[data-ft="play"]').onclick = function () { stopMic(); Audio2.play(r.zh); };
      div.querySelector('[data-ft="slow"]').onclick = function () { stopMic(); Audio2.play(r.zh, null, null, 0.7); };
      var sh = div.querySelector('[data-ft="show"]'); if (sh) sh.onclick = function () { div.classList.remove("ft-hid"); sh.remove(); };
      log.appendChild(div); scrollEnd();
    }
    function afterReply(r) {
      if (!voice) return;
      var go = function () { if (alive() && !done && !busy && autoMic) listen(true); };
      var played = false; try { played = Audio2.play(r.zh, null, go); } catch (e) { played = false; }
      if (played === false) go();
    }
    function listen(auto) {
      if (!SR || busy || done) return;
      if (rec) { try { rec.stop(); } catch (e) { /* not running */ } return; } // a second tap ends the turn
      var heard = "", finalText = "";
      rec = new SR(); rec.lang = "zh-CN"; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
      setTalk("rec");
      rec.onresult = function (e) {
        heard = ""; finalText = "";
        for (var k = 0; k < e.results.length; k++) { heard += e.results[k][0].transcript; if (e.results[k].isFinal) finalText += e.results[k][0].transcript; }
        inp.value = heard;
      };
      rec.onerror = function (e) {
        var err = e && e.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          if (auto) autoMic = false; // the phone wants a tap to open the mic: from now on the learner taps
          else { UI.toast(tx("Could not hear you. Check microphone permission."), "🎤"); }
        } else if (err === "no-speech" && !auto) UI.toast(tx("I didn't hear anything. Tap and speak a little louder."), "🎤");
      };
      rec.onend = function () {
        rec = null; setTalk("idle");
        var t = (finalText || heard).trim();
        if (!t || !alive()) return;
        inp.value = t;
        if (voice) send(true); else inp.focus(); // without voice mode the learner checks the text, then sends
      };
      try { rec.start(); } catch (e) { rec = null; setTalk("idle"); if (auto) autoMic = false; }
    }
    function call(payload) { return AI.call("freetalk", Object.assign({ topic: cfg.topic, partner: cfg.partner, level: cfg.level, words: words, history: hist.slice(-10), turns: turns }, payload)); }
    function opening() {
      busy = true; setTalk("wait");
      var w0 = document.createElement("div"); w0.className = "tb tb-ai"; w0.textContent = "…"; log.appendChild(w0);
      call({ start: true, history: [] }).then(function (res) {
        if (!alive()) return; busy = false; w0.remove(); setTalk("idle");
        if (!res.ok) { log.insertAdjacentHTML("beforeend", '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"); return; }
        hist.push({ role: "ai", zh: res.result.reply.zh }); lastHint = hintOf(res.result);
        aiBubble(res.result.reply, res.result.words); afterReply(res.result.reply);
      });
    }
    function hintOf(r) { return r.hint ? r.hint + (r.hint_pinyin ? " · " + r.hint_pinyin : "") : lastHint; }
    function send(fromVoice) {
      var text = inp.value.trim(); if (!text || busy || done) return;
      if (!/[㐀-鿿]/.test(text)) { UI.toast(tx("Write your reply in Chinese"), "✍️"); return; }
      if (window.Audio2 && Audio2.unlock) Audio2.unlock();
      busy = true; inp.value = ""; turns++; document.getElementById("ft-n").textContent = String(turns); setTalk("wait");
      var my = document.createElement("div"); my.className = "tb tb-me";
      my.innerHTML = '<div class="zh">' + (fromVoice ? "🎤 " : "") + esc(text) + "</div>";
      if (target) { // they asked how to say it: show what the phone heard against it
        var df = ftHeardDiff(target, text);
        my.insertAdjacentHTML("beforeend", '<div class="ft-heard"><span class="dim">' + tx("Goal:") + '</span> <span class="zh">' + df.html + "</span> " +
          (df.miss ? '<span class="bad-t">' + tx("{n} not heard: say those again", { n: df.miss }) + "</span>" : '<span class="good-t">✓ ' + tx("All heard") + "</span>") + "</div>");
        target = ""; var sb = document.getElementById("ft-say"); sb.hidden = true; sb.innerHTML = "";
      }
      log.appendChild(my);
      var wait = document.createElement("div"); wait.className = "tb tb-ai"; wait.textContent = "…"; log.appendChild(wait); scrollEnd();
      call({ text: text }).then(function (res) {
        if (!alive()) return; busy = false; wait.remove(); setTalk("idle");
        if (!res.ok) { turns--; document.getElementById("ft-n").textContent = String(turns); my.remove(); inp.value = text; UI.toast(AI.errMsg(res.error), "⚠️"); return; }
        var r = res.result, fb = r.feedback || {};
        hist.push({ role: "me", zh: text }); hist.push({ role: "ai", zh: r.reply.zh });
        if (fb.changed || fb.upgrade) fixes.push({ said: text, fix: fb.changed ? fb.corrected : "", note: fb.note || "", up: fb.upgrade || "" });
        if (cfg.fix === "each") my.insertAdjacentHTML("beforeend", (fb.changed ? '<div class="tb-fix"><b>✎ ' + esc(fb.corrected) + "</b>" + (fb.note ? "<br>" + esc(fb.note) : "") + "</div>" : '<div class="tb-ok">' + tx("✓ Good") + "</div>") +
          (fb.upgrade ? '<div class="tb-up"><span class="tb-up-l">' + tx("⬆ Level up") + (fb.upgrade_point ? " · " + esc(fb.upgrade_point) : "") + '</span><span class="zh">' + esc(fb.upgrade) + "</span>" + SAY(fb.upgrade) + "</div>" : ""));
        aiBubble(r.reply, r.words); lastHint = hintOf(r); document.getElementById("ft-hint-t").textContent = "";
        if (turns >= 3) fin.hidden = false;
        afterReply(r.reply);
      });
    }
    function finish() {
      if (busy || done) return; stopMic(); busy = true; fin.disabled = true;
      call({ wrap: true }).then(function (res) {
        if (!alive()) return; busy = false; fin.disabled = false;
        if (!res.ok) { UI.toast(AI.errMsg(res.error), "⚠️"); return; }
        done = true; var sm = res.result.summary || {};
        aiBubble(res.result.reply, []);
        Game.award(15); markWork();
        try { var tl = Store.state.talkLog || (Store.state.talkLog = []); tl.push({ d: Store.today(), id: "free", s: sm.score != null ? Math.max(0, Math.min(10, Math.round(sm.score))) : null, g: !!sm.goal_met, l: cfg.level === "hsk5" ? 5 : cfg.level === "hsk3" ? 3 : 4 }); if (tl.length > 60) tl.splice(0, tl.length - 60); Store.save(); } catch (e) { /* log is optional */ }
        var fx = cfg.fix === "off" ? [] : fixes.slice(-3);
        log.insertAdjacentHTML("beforeend", '<div class="ai-card talk-end"><b>' + (sm.score != null ? tx("Your talk: {n}/10", { n: sm.score }) : tx("✅ Conversation done")) + " · +15 XP</b>" +
          (sm.comment ? '<p class="ai-exp">' + esc(sm.comment) + "</p>" : "") +
          (fx.length ? '<h4 class="ft-h">' + tx("To remember") + "</h4>" + fx.map(function (f) {
            return '<p class="ft-fix"><span class="dim zh">' + esc(f.said) + "</span> → <b class=\"zh\">" + esc(f.fix || f.up) + "</b>" + SAY(f.fix || f.up) + (f.note ? '<br><small>' + esc(f.note) + "</small>" : "") + "</p>";
          }).join("") : "") +
          (sm.phrase && sm.phrase.zh ? '<p class="sub">' + tx("Phrase to remember:") + ' <span class="zh">' + esc(sm.phrase.zh) + "</span>" + SAY(sm.phrase.zh) + " " + esc(sm.phrase.pinyin || "") + " · " + esc(sm.phrase.meaning || "") + "</p>" : "") +
          '<p class="sub">' + tx("{n} replies.", { n: turns }) + '</p><div class="actions center"><a class="btn" href="#/freetalk">' + tx("New topic") + '</a><button type="button" class="btn primary" id="ft-again">' + tx("Talk again") + "</button></div></div>");
        document.getElementById("ft-in").hidden = true;
        document.getElementById("ft-again").onclick = function () { runFreeTalk(cfg); };
        scrollEnd();
      });
    }
    /* "Say it in Vietnamese": the learner's idea -> Chinese to say aloud */
    function sayBox() {
      var box = document.getElementById("ft-say");
      if (!box.hidden && box.querySelector("#ft-vi-in")) { box.hidden = true; box.innerHTML = ""; return; }
      box.hidden = false;
      box.innerHTML = '<label class="ft-lab" for="ft-vi-in">' + tx("What do you want to say? (Vietnamese or English)") + '</label><div class="talk-row"><input id="ft-vi-in" maxlength="200" autocomplete="off" placeholder="' + tx("e.g. I want to go hiking this weekend") + '">' +
        '<button type="button" class="btn primary small" id="ft-vi-go">' + tx("In Chinese") + "</button></div>";
      var vin = document.getElementById("ft-vi-in"); vin.focus();
      var go = function () {
        var idea = vin.value.trim(); if (!idea) return;
        var b = document.getElementById("ft-vi-go"); b.disabled = true; b.textContent = "…";
        var last = hist.filter(function (h) { return h.role === "ai"; }).slice(-1)[0];
        AI.call("sayit", { text: idea, context: last ? last.zh : "", level: cfg.level }).then(function (res) {
          if (!alive() || !box.isConnected) return;
          if (!res.ok) { b.disabled = false; b.textContent = tx("In Chinese"); UI.toast(AI.errMsg(res.error), "⚠️"); return; }
          var r = res.result; target = r.zh;
          box.innerHTML = '<div class="ft-sug"><div class="zh ft-sug-zh">' + esc(r.zh) + "</div>" + SAY(r.zh) + PY(r.pinyin) + '<div class="dim">' + esc(r.meaning) + "</div>" + (r.note ? '<p class="sub">💡 ' + esc(r.note) + "</p>" : "") +
            '<p class="sub">' + (voice ? tx("Now say it: tap 🎤 and read it aloud.") : tx("Now say it with 🎤, or type it.")) + "</p>" +
            '<div class="actions"><button type="button" class="btn small" id="ft-sug-x">' + tx("Close") + "</button>" + (voice ? "" : '<button type="button" class="btn small" id="ft-sug-type">⌨️ ' + tx("Type it in") + "</button>") + "</div></div>";
          document.getElementById("ft-sug-x").onclick = function () { target = ""; box.hidden = true; box.innerHTML = ""; };
          var ty = document.getElementById("ft-sug-type"); if (ty) ty.onclick = function () { inp.value = r.zh; inp.focus(); };
        });
      };
      document.getElementById("ft-vi-go").onclick = go;
      vin.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } };
    }
    document.getElementById("ft-send").onclick = function () { send(false); };
    inp.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); send(false); } };
    document.getElementById("ft-hint").onclick = function () { document.getElementById("ft-hint-t").textContent = lastHint || "我觉得……"; };
    document.getElementById("ft-vi").onclick = sayBox;
    fin.onclick = finish;
    if (talkBtn) talkBtn.onclick = function () { if (window.Audio2 && Audio2.stop) Audio2.stop(); listen(false); };
    var mic = document.getElementById("ft-mic"); if (mic) mic.onclick = function () { listen(false); };
    opening();
  }
