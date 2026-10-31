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
  /* ---------- daily quests: three small goals and a chest, derived from what the learner already does ---------- */
  function sumXP(from, days) { var t = 0; for (var i = 0; i < days; i++) t += Store.state.log[Store.addDays(from, -i)] || 0; return t; }
  function questsCard() {
    var s = Store.state, t = Store.today(), goal = s.settings.dailyGoal || 30, xp = s.log[t] || 0;
    var lessonDone = Object.keys(s.days).some(function (k) { return s.days[k].completedOn === t; });
    var sessionDone = !!(s.sessions && s.sessions[t]), nd = nextDay();
    var items = [
      { ok: xp >= goal, txt: "Earn " + goal + " XP", prog: Math.min(xp, goal) + "/" + goal, href: "#/session" },
      { ok: lessonDone, txt: "Pass a lesson quiz (7+)", prog: lessonDone ? "1/1" : "0/1", href: "#/day/" + nd.day },
      { ok: sessionDone, txt: "Finish Today's session", prog: sessionDone ? "1/1" : "0/1", href: "#/session" }
    ];
    var n = items.filter(function (x) { return x.ok; }).length, opened = !!(s.questChest || {})[t];
    var thisW = sumXP(t, 7), lastW = sumXP(Store.addDays(t, -7), 7);
    return '<section class="card quests"><div class="sec-h"><h2>Daily quests</h2><span class="muted">' + n + "/3</span></div>" +
      weekRow() +
      items.map(function (x) { return '<a class="qrow' + (x.ok ? " done" : "") + '" href="' + x.href + '"><span class="qi">' + (x.ok ? "✓" : "") + "</span><span class=\"qt\">" + x.txt + '</span><span class="qp">' + x.prog + "</span></a>"; }).join("") +
      '<button type="button" class="btn ' + (n === 3 && !opened ? "primary" : "") + ' wide qchest" id="q-chest"' + (n === 3 && !opened ? "" : " disabled") + ">" + (opened ? "🎁 Chest opened today" : n === 3 ? "🎁 Open chest · +20 XP" : "🎁 Finish all 3 to open the chest") + "</button>" +
      '<p class="sub qweek">This week ' + thisW + " XP · last week " + lastW + " XP" + (thisW > lastW && lastW > 0 ? " · you are ahead 🚀" : lastW > 0 ? " · beat it!" : "") + "</p></section>";
  }
  function wireQuests() {
    var b = document.getElementById("q-chest"); if (!b || b.disabled) return;
    b.onclick = function () {
      var s = Store.state, t = Store.today(); s.questChest = s.questChest || {}; if (s.questChest[t]) return;
      s.questChest[t] = true; Store.save(); b.disabled = true; b.classList.remove("primary"); b.textContent = "🎁 Chest opened today";
      Game.award(20); UI.confetti(90); Audio2.sfx.win(); UI.burst("cat-laugh", "+20 XP", "Quest chest opened");
    };
  }

  /* ---------- habit: weekly goal, pattern card, at-risk timing ---------- */
  function weekStart(t) { var d = new Date(t + "T00:00:00"); return Store.addDays(t, -((d.getDay() + 6) % 7)); }
  function weekInfo() {
    var s = Store.state, t = Store.today(), ws = weekStart(t), goal = Math.min(7, Math.max(1, parseInt(s.settings.weeklyDays, 10) || 5)), days = [], n = 0;
    for (var i = 0; i < 7; i++) { var d = Store.addDays(ws, i), on = (s.log[d] || 0) > 0; if (on) n++; days.push({ d: d, on: on, today: d === t, future: d > t }); }
    return { ws: ws, goal: goal, n: n, days: days, met: n >= goal };
  }
  /* Meeting the weekly goal earns a streak freeze (max 2), once per week. Returns true when it was just earned. */
  function weekReward() {
    var s = Store.state, w = weekInfo(); s.weekGoal = s.weekGoal || {};
    if (!w.met || s.weekGoal[w.ws]) return false;
    s.weekGoal[w.ws] = true; var got = (s.freezes || 0) < 2; if (got) s.freezes = (s.freezes || 0) + 1; Store.save(); return got ? "freeze" : "met";
  }
  function weekRow() {
    var w = weekInfo(), fr = Store.state.freezes || 0, L = ["M", "T", "W", "T", "F", "S", "S"];
    return '<div class="wkrow" aria-label="Weekly goal: ' + w.n + " of " + w.goal + ' days"><div class="wk-ring' + (w.met ? " met" : "") + '" style="--p:' + Math.min(100, Math.round(w.n / w.goal * 100)) + '"><b>' + w.n + "</b><small>/" + w.goal + "</small></div>" +
      '<div class="wk-t"><b>' + (w.met ? "Weekly goal met 🎉" : "Study " + w.goal + " days this week") + '</b><div class="wk-dots">' +
      w.days.map(function (d, i) { return '<i class="' + (d.on ? "on" : "") + (d.today ? " now" : "") + '" title="' + d.d + '">' + (d.on ? "✓" : L[i]) + "</i>"; }).join("") + "</div>" +
      '<small class="muted">🧊 ' + fr + " streak freeze" + (fr === 1 ? "" : "s") + " · earn more by hitting the goal</small></div></div>";
  }
  function wordLabel(k) { var m = /^w:(.+)$/.exec(k), w = m && WORDMAP[m[1]]; return w ? w : null; }
  function patternCard() {
    var s = Store.state, t = Store.today(), ps = Learn.patterns(3).filter(function (p) { return s.patternHide[p.sig] !== t; }), p = ps[0];
    if (!p) return "";
    if (p.type === "repeat") {
      var ws = p.keys.map(function (k, i) { var w = wordLabel(k); return w ? { w: w, n: p.counts[i] } : null; }).filter(Boolean);
      var ev = ws.length ? ws.map(function (x) { return '<span class="zh">' + esc(x.w.hanzi) + "</span> ×" + x.n; }).join(" · ") : p.keys.length + " items";
      return '<section class="card pattern" data-sig="' + esc(p.sig) + '"><div class="sec-h"><h2>🔎 Pattern spotted</h2><button type="button" class="x" id="pt-x" aria-label="Hide for today">✕</button></div>' +
        "<p><b>You keep missing the same " + (ws.length ? "words" : "items") + ".</b></p><p class=\"pt-ev\">" + ev + ' <span class="muted">in the last ' + p.days + " days</span></p>" +
        '<div class="actions"><button type="button" class="btn primary small" id="pt-go">Practise ' + (ws.length || p.keys.length) + ' ▶</button>' + (ws.length && window.AI && AI.configured() ? '<button type="button" class="btn small" id="pt-ai">🤖 Explain why</button>' : "") + '</div><div class="ai-out" id="pt-out"></div></section>';
    }
    var info = Learn.SKILLS[p.skill];
    return '<section class="card pattern" data-sig="' + esc(p.sig) + '"><div class="sec-h"><h2>🔎 Pattern spotted</h2><button type="button" class="x" id="pt-x" aria-label="Hide for today">✕</button></div>' +
      "<p><b>" + info.icon + " " + esc(info.en) + " keeps going wrong.</b></p><p class=\"pt-ev\">" + p.n + " wrong in the last " + p.days + " days · " + Math.round(p.acc * 100) + '% overall</p><p class="sub">' + esc(info.tip) + "</p>" +
      '<div class="actions"><a class="btn primary small" href="#/mistakes' + (Learn.count(p.skill) ? "/" + p.skill : "") + '">Practise ▶</a></div></section>';
  }
  function wirePattern() {
    var el = document.querySelector(".pattern"); if (!el) return;
    var s = Store.state, sig = el.getAttribute("data-sig"), p = Learn.patterns(3).filter(function (x) { return x.sig === sig; })[0];
    document.getElementById("pt-x").onclick = function () { s.patternHide[sig] = Store.today(); Store.save(); el.remove(); };
    var go = document.getElementById("pt-go"); if (!go || !p) return;
    var words = p.keys.map(wordLabel).filter(Boolean);
    go.onclick = function () {
      if (!words.length) { location.hash = "#/mistakes"; return; }
      SRS.addMany(words.map(function (w) { return w.id; }));
      runDeck({ title: "Words you keep missing", words: words, mode: "review", back: "#/" });
    };
    var ai = document.getElementById("pt-ai"), out = document.getElementById("pt-out");
    function show(res) { out.innerHTML = AI._askCard(res); }
    if (ai) ai.onclick = function () {
      if (s.patternAI[sig]) { show(s.patternAI[sig]); ai.hidden = true; return; }
      ai.disabled = true; out.innerHTML = '<div class="ai-card ai-wait">🤖 Thinking…</div>';
      AI.call("ask", { text: words[0].hanzi, context: words.slice(1, 4).map(function (w) { return w.hanzi; }).join(" "), preset: "similar" }).then(function (res) {
        ai.disabled = false;
        if (!res.ok) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"; return; }
        var keys = Object.keys(s.patternAI); if (keys.length > 20) delete s.patternAI[keys[0]];
        s.patternAI[sig] = { ok: true, result: res.result, model: res.model }; Store.save(); ai.hidden = true; show(res);
      });
    };
  }
  /* "streak at risk" shows 30 min after your study time (never before 17:00, never later than 22:30) */
  function atRiskHour() {
    var rt = String(Store.state.settings.remindTime || "20:00").split(":"), h = (parseInt(rt[0], 10) || 20) + (parseInt(rt[1], 10) || 0) / 60 + 0.5;
    return Math.min(22.5, Math.max(17, h));
  }

  /* ---------- Reader: paste real Chinese, tap a word ----------
     Works straight away with the course words (Vietnamese + English). The full dictionary (CC-CEDICT, English only,
     about 2 MB) is an optional one-time download kept on the phone. Pasted text never leaves the phone unless you
     tap the AI button on a sentence. */
  var DICT = null, DICT_P = null, DICT_URL = "vendor/dict/cedict.v1.js", DICT_KEY = "cbChinese.dict", READ_KEY = "cbChinese.readText";
  var READ_SAMPLE = "各位同事：本月工资将于10号发放。请大家核对工资条上的个人所得税和社会保险扣除项目。如有问题，请在周五之前联系人力资源部。谢谢！";
  function dictWanted() { try { return localStorage.getItem(DICT_KEY) === "1"; } catch (e) { return false; } }
  function loadDict() {
    if (DICT) return Promise.resolve(DICT);
    return DICT_P || (DICT_P = new Promise(function (res, rej) {
      var sc = document.createElement("script"); sc.src = DICT_URL;
      sc.onload = function () {
        var raw = window.CB_DICT_RAW; if (!raw) { DICT_P = null; return rej(new Error("empty")); }
        var m = Object.create(null), lines = raw.split("\n");
        for (var i = 0; i < lines.length; i++) { var t = lines[i].indexOf("\t"); if (t > 0) m[lines[i].slice(0, t)] = lines[i].slice(t + 1); }
        window.CB_DICT_RAW = null; DICT = m; try { localStorage.setItem(DICT_KEY, "1"); } catch (e) { /* ignore */ }
        res(DICT);
      };
      sc.onerror = function () { DICT_P = null; sc.remove(); rej(new Error("network")); };
      document.head.appendChild(sc);
    }));
  }
  function dictGet(w) { var v = DICT && DICT[w]; if (!v) return null; var a = v.split("\t"), out = []; for (var i = 0; i + 1 < a.length; i += 2) out.push({ py: tonePy(a[i]), en: a[i + 1] }); return out; }
  /* "gong1 zi1" -> "gōng zī" */
  var TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
  function tonePy(num) {
    return String(num).split(" ").map(function (sy) {
      var m = /^([a-zü:v]+)([1-5])$/i.exec(sy); if (!m) return sy;
      var b = m[1].replace(/v|u:/g, "ü"), t = +m[2]; if (t === 5) return b;
      var at = b.indexOf("a") >= 0 ? b.indexOf("a") : b.indexOf("e") >= 0 ? b.indexOf("e") : b.indexOf("ou") >= 0 ? b.indexOf("o") : -1;
      if (at < 0) for (var i = b.length - 1; i >= 0; i--) if (TONES[b.charAt(i)]) { at = i; break; }
      return at < 0 ? b : b.slice(0, at) + TONES[b.charAt(at)].charAt(t - 1) + b.slice(at + 1);
    }).join(" ");
  }
  /* Split each run of Chinese twice — longest match from the left and from the right — and keep the split with
     fewer leftover single characters (then fewer pieces). This fixes most greedy mistakes, e.g. 联系人|力|资源|部. */
  function segment(text) {
    var byHz = {}, maxLen = 5; WORDS.forEach(function (w) { if (w.hanzi && !byHz[w.hanzi]) { byHz[w.hanzi] = w; if (w.hanzi.length > maxLen) maxLen = Math.min(8, w.hanzi.length); } });
    function look(c) { return byHz[c] ? { t: c, w: byHz[c] } : DICT && DICT[c] ? { t: c, d: 1 } : null; }
    function one(c) { return look(c) || { t: c, x: 1 }; }
    function fwd(run) { var o = [], i = 0; while (i < run.length) { var h = null; for (var L = Math.min(maxLen, run.length - i); L >= 2 && !h; L--) h = look(run.substr(i, L)); h = h || one(run.charAt(i)); o.push(h); i += h.t.length; } return o; }
    function bwd(run) { var o = [], j = run.length; while (j > 0) { var h = null; for (var L = Math.min(maxLen, j); L >= 2 && !h; L--) h = look(run.substr(j - L, L)); h = h || one(run.charAt(j - 1)); o.unshift(h); j -= h.t.length; } return o; }
    function cost(o) { return o.reduce(function (a, k) { return a + (k.t.length === 1 ? (k.x ? 3 : 1) : 0); }, 0) * 100 + o.length; }
    var out = [];
    String(text).split(/([㐀-鿿]+)/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2 === 0) { out.push({ t: part }); return; }
      var f = fwd(part), b = bwd(part);
      Array.prototype.push.apply(out, cost(b) < cost(f) ? b : f);
    });
    return out;
  }
  function speakZh(t) { try { var u = new SpeechSynthesisUtterance(t); u.lang = "zh-CN"; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voice on this device */ } }
  function viewRead() {
    var saved = ""; try { saved = sessionStorage.getItem(READ_KEY) || ""; } catch (e) { /* ignore */ }
    var showPy = !!Store.state.settings.showPinyin;
    render('<a class="back" href="#/games">‹ Games</a><section class="card reader"><div class="sec-h"><h2>📖 Reader</h2><span class="tag">real text</span></div>' +
      '<p class="sub">Paste a Chinese email or message, then tap any word. The text stays on this phone.</p>' +
      '<textarea id="rd-in" rows="4" maxlength="3000" placeholder="粘贴中文… Paste Chinese text here" aria-label="Chinese text">' + esc(saved) + "</textarea>" +
      '<div class="actions"><button type="button" class="btn primary" id="rd-go">Read ▶</button><button type="button" class="btn" id="rd-paste">📋 Paste</button><button type="button" class="btn" id="rd-sample">Try a sample</button></div></section>' +
      '<div id="rd-dict"></div><div id="rd-out"></div>', "games");
    var inp = document.getElementById("rd-in"), out = document.getElementById("rd-out"), dbox = document.getElementById("rd-dict"), toks = [];
    function dictCard() {
      if (DICT) { dbox.innerHTML = ""; return; }
      dbox.innerHTML = '<section class="card rd-dl"><p><b>📚 Full dictionary</b> <span class="muted">· optional</span></p><p class="sub">Right now only the course words are recognised. Download the dictionary once (about 2 MB, English meanings) to look up any word, also offline.</p>' +
        '<div class="actions"><button type="button" class="btn small primary" id="rd-dl">Download dictionary</button></div><p class="sub" id="rd-dlmsg" hidden></p></section>';
      document.getElementById("rd-dl").onclick = getDict;
    }
    function getDict() {
      var b = document.getElementById("rd-dl"), msg = document.getElementById("rd-dlmsg");
      if (b) { b.disabled = true; b.textContent = "Downloading…"; }
      loadDict().then(function () { dictCard(); if (inp.value.trim()) run(); UI.toast("Dictionary ready", "📚"); },
        function () { if (b) { b.disabled = false; b.textContent = "Download dictionary"; } if (msg) { msg.hidden = false; msg.textContent = navigator.onLine === false ? "You are offline. Connect once to download it." : "Could not download it. Try again."; } });
    }
    function run() {
      var text = inp.value.replace(/\r/g, "").trim();
      try { sessionStorage.setItem(READ_KEY, text); } catch (e) { /* ignore */ }
      if (!/[㐀-鿿]/.test(text)) { out.innerHTML = '<p class="empty">Paste some Chinese text first.</p>'; return; }
      toks = segment(text);
      var seen = {}, nCourse = 0, nDict = 0, nUnk = 0;
      toks.forEach(function (k) { if (k.w || k.d || k.x) { if (seen[k.t]) return; seen[k.t] = 1; if (k.w) nCourse++; else if (k.d) nDict++; else nUnk++; } });
      var html = "", sent = "", sents = [];
      function endSent() { if (/[㐀-鿿]/.test(sent)) { sents.push(sent.trim()); html += (window.AI && AI.configured() ? '<button type="button" class="rd-ai" data-s="' + (sents.length - 1) + '" aria-label="Translate this sentence with AI">🤖</button>' : ""); } sent = ""; }
      toks.forEach(function (k, i) {
        if (k.w || k.d || k.x) {
          var py = showPy ? (k.w ? k.w.pinyin : k.d ? String((dictGet(k.t) || [{}])[0].py || "").replace(/ /g, "") : "") : "";
          html += '<span class="rw ' + (k.w ? "c" : k.d ? "d" : "x") + '" data-i="' + i + '" role="button" tabindex="0">' + (py ? "<ruby>" + esc(k.t) + "<rt>" + esc(py) + "</rt></ruby>" : esc(k.t)) + "</span>";
          sent += k.t;
        } else {
          k.t.split(/(\n+|[。！？!?；;]+)/).forEach(function (part) {
            if (!part) return;
            if (/^\n+$/.test(part)) { endSent(); html += "<br>"; }
            else if (/^[。！？!?；;]+$/.test(part)) { sent += part; html += esc(part); endSent(); }
            else { sent += part; html += esc(part); }
          });
        }
      });
      endSent();
      out.innerHTML = '<section class="card"><div class="rd-stats"><span class="rd-k c">' + nCourse + " from your course</span>" + (DICT ? '<span class="rd-k d">' + nDict + " other words</span>" : "") + (nUnk ? '<span class="rd-k x">' + nUnk + " not recognised</span>" : "") +
        '<label class="rd-py"><input type="checkbox" id="rd-pyt"' + (showPy ? " checked" : "") + "> Pinyin</label></div>" +
        '<div class="rd-text zh" id="rd-text">' + html + '</div><div id="rd-aiout"></div></section>' +
        (DICT ? '<p class="sub center">Dictionary: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict" target="_blank" rel="noopener">CC-CEDICT</a>, CC BY-SA 4.0. Word splitting is automatic and can be wrong.</p>' : "");
      document.getElementById("rd-pyt").onchange = function () { showPy = this.checked; run(); };
      var box = document.getElementById("rd-text");
      box.onclick = function (e) {
        var ai = e.target.closest(".rd-ai");
        if (ai) { askSentence(sents[+ai.getAttribute("data-s")], ai); return; }
        var el = e.target.closest(".rw"); if (el) openTok(toks[+el.getAttribute("data-i")], sentenceOf(+el.getAttribute("data-i")));
      };
      box.onkeydown = function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("rw")) { e.preventDefault(); e.target.click(); } };
    }
    function sentenceOf(i) {
      var a = i, b = i, stop = /[。！？!?；;\n]/;
      while (a > 0 && !stop.test(toks[a - 1].t)) a--;
      while (b < toks.length - 1 && !stop.test(toks[b + 1].t)) b++;
      return toks.slice(a, b + 1).map(function (k) { return k.t; }).join("").trim().slice(0, 300);
    }
    function askSentence(sentence, btn) {
      var host = document.getElementById("rd-aiout"); btn.disabled = true;
      host.innerHTML = '<div class="ai-card ai-wait">🤖 Translating…</div>'; host.scrollIntoView({ block: "nearest", behavior: "smooth" });
      AI.call("ask", { text: sentence.slice(0, 80), context: sentence, preset: "free", question: "Translate this sentence into Vietnamese and English. Then name the one word or pattern most worth learning from it." }).then(function (res) {
        btn.disabled = false;
        host.innerHTML = res.ok ? '<p class="sub zh rd-q">' + esc(sentence) + "</p>" + AI._askCard(res) : '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>";
      });
    }
    function openTok(k, sentence) {
      if (!k) return;
      if (k.w) { openWordSheet(k.w.id, sentence); return; }
      var rs = k.d ? dictGet(k.t) : null, can = "speechSynthesis" in window;
      UI.modal('<div class="wsheet"><div class="ws-top"><span class="hz big zh">' + esc(k.t) + "</span>" + (can ? '<button type="button" class="btn small" id="rt-say" aria-label="Listen">🔊</button>' : "") + "</div>" +
        (rs ? rs.map(function (r) { return '<p class="ws-py">' + esc(r.py) + '</p><div class="ws-mean">' + esc(r.en) + "</div>"; }).join("") + '<span class="tag">Dictionary · English only</span>'
            : '<p class="sub">This is not one of your course words.' + (DICT ? " The dictionary has no entry for it either." : " Download the full dictionary to look it up.") + "</p>") +
        '<div class="actions center">' + (rs ? '<button type="button" class="btn primary" id="rt-save">➕ Save to My words</button>' : !DICT ? '<button type="button" class="btn primary" id="rt-dl" data-close>Download dictionary</button>' : "") + "</div>" +
        (window.AI && AI.configured() ? '<div class="ws-ask" id="rt-ask"><button type="button" class="btn small ai-btn" id="rt-askbtn">🤖 Ask AI about this word</button></div>' : "") + "</div>");
      var say = document.getElementById("rt-say"); if (say) say.onclick = function () { speakZh(k.t); };
      var dl = document.getElementById("rt-dl"); if (dl) dl.onclick = function () { getDict(); dbox.scrollIntoView({ block: "center" }); };
      var ab = document.getElementById("rt-askbtn"); if (ab) ab.onclick = function () { AI.askBox(document.getElementById("rt-ask"), k.t, sentence); };
      var sv = document.getElementById("rt-save");
      if (sv) sv.onclick = function () {
        if (WORDS.some(function (w) { return w.hanzi === k.t; })) { UI.toast("Already in the app", "➕"); return; }
        var w = { id: "u" + Date.now().toString(36), hanzi: k.t, pinyin: rs[0].py, vi: "", en: rs[0].en, pos: "", level: "Mine", added: Store.today() };
        if (sentence && sentence !== k.t) w.example = { zh: sentence.slice(0, 120), py: "", vi: "", en: "" };
        Store.state.custom.push(w); SRS.add(w.id); Store.save(); buildIndex(); refreshChrome();
        sv.outerHTML = '<span class="tag t-box">Saved · in review</span>'; UI.toast(k.t + " saved to My words", "➕"); run();
      };
    }
    document.getElementById("rd-go").onclick = run;
    document.getElementById("rd-sample").onclick = function () { inp.value = READ_SAMPLE; run(); };
    document.getElementById("rd-paste").onclick = function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { inp.focus(); UI.toast("Press and hold in the box, then tap Paste", "📋"); return; }
      navigator.clipboard.readText().then(function (t) { if (t) { inp.value = t.slice(0, 3000); run(); } else inp.focus(); }, function () { inp.focus(); UI.toast("Press and hold in the box, then tap Paste", "📋"); });
    };
    dictCard();
    if (dictWanted() && !DICT) loadDict().then(function () { dictCard(); if (inp.value.trim()) run(); }, function () { /* offline and not cached: course words still work */ });
    if (saved) run();
  }

  /* ---------- "Am I ready?" : pass mark 180/300 ----------
     Uses the mock/official forecast when there is one. With no mock yet it falls back to a rough estimate
     from answer accuracy per section, shown as rough and with a wide range. */
  var PASS = 180, SEC_OF = { Listening: "L", Reading: "R", Vocabulary: "R", Grammar: "R", Writing: "W" };
  var SEC_NAME = { L: "Listening", R: "Reading", W: "Writing" }, SEC_GO = { L: "#/game/drill", R: "#/mistakes", W: "#/game/type" };
  function readiness() {
    var f = forecast(), out;
    if (f) out = { src: "mock", total: f.total, lo: f.lo, hi: f.hi, L: f.L, R: f.R, W: f.W,
      basis: fcBasis(f) };
    else {
      var acc = { L: [0, 0], R: [0, 0], W: [0, 0] }, sk = Store.state.skills || {};
      Object.keys(sk).forEach(function (k) { var info = Learn.SKILLS[k], sec = info && SEC_OF[info.sec]; if (sec) { acc[sec][0] += sk[k].r; acc[sec][1] += sk[k].r + sk[k].w; } });
      var have = ["L", "R", "W"].filter(function (k) { return acc[k][1] >= 10; });
      if (!have.length) return null;
      var all = have.reduce(function (a, k) { return [a[0] + acc[k][0], a[1] + acc[k][1]]; }, [0, 0]), base = all[0] / all[1];
      /* practice is easier than the exam, so scale down; a section with too few answers borrows the overall rate */
      var est = function (k) { return Math.round((acc[k][1] >= 10 ? acc[k][0] / acc[k][1] : base) * 85); };
      out = { src: "practice", L: est("L"), R: est("R"), W: est("W"), basis: all[1] + " practice answers", missing: ["L", "R", "W"].filter(function (k) { return acc[k][1] < 10; }) };
      out.total = out.L + out.R + out.W; out.lo = Math.max(0, out.total - 40); out.hi = Math.min(300, out.total + 40);
    }
    out.margin = out.total - PASS;
    out.secs = ["L", "R", "W"].map(function (k) { return { k: k, name: SEC_NAME[k], score: out[k], gap: out[k] - PASS / 3 }; });
    out.weakest = out.secs.slice().sort(function (a, b) { return a.score - b.score; })[0];
    out.verdict = out.lo >= PASS ? ["t-hsk", "Likely pass"] : out.hi < PASS ? ["t-warn", "Not yet"] : ["t-dom", "Borderline"];
    return out;
  }
  function readyLine(r) {
    return r.margin === 0 ? "right on the pass mark" : r.margin > 0 ? "+" + r.margin + " over the pass mark" : Math.abs(r.margin) + " short of the pass mark";
  }
  function readyCard() {
    var r = readiness(), exam = Store.daysBetween(Store.today(), Store.state.settings.examDate || "2026-11-14");
    if (exam < 0) return "";
    if (!r) return exam <= 45 ? '<a class="card readyc empty" href="#/mock"><span class="rc-t"><small>Am I ready? · ' + exam + ' days left</small><b>Take one mock exam to find out</b><em>You get a score for each section</em></span><span class="rc-go">›</span></a>' : "";
    return '<a class="card readyc" href="#/ready"><span class="rc-t"><small>Am I ready? · ' + exam + " days left" + (r.src === "practice" ? " · rough" : "") + '</small><b>~' + r.total + "/300 <i class=\"tag " + r.verdict[0] + '">' + r.verdict[1] + "</i></b><em>" + readyLine(r) + " · weakest: " + r.weakest.name + '</em>' +
      '<span class="rc-bars">' + r.secs.map(function (x) { return '<i><b aria-hidden="true">' + x.score + '</b><u aria-hidden="true" style="height:' + Math.max(4, Math.round(x.score * 0.38)) + 'px" class="' + (x.gap < 0 ? "low" : "") + '"></u><s aria-hidden="true">' + x.k + '</s><span class="sr">' + x.name + " " + x.score + " of 100. </span></i>"; }).join("") + "</span></span><span class=\"rc-go\">›</span></a>";
  }
  function viewReady() {
    var r = readiness(), s = Store.state, exam = Store.daysBetween(Store.today(), s.settings.examDate || "2026-11-14"), p = planInfo();
    var html = '<a class="back" href="#/">‹ Home</a>';
    if (!r) {
      render(html + '<section class="card result">' + UI.mascot("think", 84) + "<h2>No result to judge yet</h2><p class=\"sub\">Answer a few practice questions or take one mock exam. Then this page shows a score for each section and what to fix first.</p>" +
        '<div class="actions center"><a class="btn primary" href="#/mock">📝 Mock exams</a><a class="btn" href="#/session">▶ Today\'s session</a></div></section>', "home");
      return;
    }
    var need = PASS / 3;
    html += '<section class="card ready-top"><div class="sec-h"><h2>Am I ready?</h2><span class="tag ' + r.verdict[0] + '">' + r.verdict[1] + "</span></div>" +
      '<p class="score-big">~' + r.total + " <small>/300 · likely " + r.lo + "–" + r.hi + "</small></p>" +
      '<p class="rd-line ' + (r.margin >= 0 ? "ok" : "no") + '"><b>' + readyLine(r) + "</b> (pass = " + PASS + ")" + (exam >= 0 ? " · " + exam + " day" + (exam === 1 ? "" : "s") + " left" : "") + "</p>" +
      r.secs.map(function (x) {
        return '<div class="rd-sec"><div class="rd-h"><b>' + x.name + '</b><span class="' + (x.gap < 0 ? "bad-t" : "good-t") + '">' + x.score + "/100 · " + (x.gap < 0 ? Math.round(-x.gap) + " below" : "+" + Math.round(x.gap) + " above") + ' the average needed</span></div>' +
          '<div class="rd-bar"><span class="' + (x.gap < 0 ? "low" : "") + '" style="width:' + Math.max(2, Math.min(100, x.score)) + '%"></span><i style="left:' + need + '%"></i></div></div>';
      }).join("") +
      '<p class="sub">Based on ' + esc(r.basis) + ". " + (r.src === "practice"
        ? "This is a <b>rough estimate</b> from practice answers, which are easier than the exam." + (r.missing.length ? " Too few answers yet for " + r.missing.map(function (k) { return SEC_NAME[k]; }).join(" and ") + "." : "") + " Take a mock exam for a real number."
        : "The line marks 60, the average you need per section. HSK 4 only requires 180 in total, so a strong section can cover a weak one.") + "</p></section>";
    /* what is pulling the weakest section down */
    var weak = Learn.report(5).filter(function (x) { return SEC_OF[x.info.sec] === r.weakest.k && x.acc < 0.8; }).slice(0, 3);
    html += '<section class="card"><div class="sec-h"><h2>Fix first: ' + r.weakest.name + '</h2><span class="muted">' + r.weakest.score + "/100</span></div>" +
      (weak.length ? weak.map(function (x) {
        return '<a class="task" href="#/mistakes' + (x.open ? "/" + x.skill : "") + '"><span class="tk-ico">' + x.info.icon + "</span><span><b>" + esc(x.info.en) + " · " + Math.round(x.acc * 100) + '%</b><small class="sub fp-why">' + x.n + " answers" + (x.open ? " · " + x.open + " open mistakes" : "") + " · " + esc(x.info.tip) + "</small></span></a>";
      }).join("") : '<p class="sub">No single skill stands out yet. Practise this section to find the weak spot.</p>') +
      '<div class="actions"><a class="btn primary small" href="' + SEC_GO[r.weakest.k] + '">Practise ' + r.weakest.name + ' ▶</a><a class="btn small" href="#/mock">📝 Take a mock</a></div></section>';
    if (p.inBuffer) html += todayCard();
    html += '<p class="sub center"><a href="#/mistakes">All your skills, weakest first (mistake notebook) ›</a><br><a href="#/progress">Full progress and score history ›</a></p>';
    render(html, "home");
  }

  /* ---------- coming back from the background ----------
     iOS keeps a home-screen app frozen for hours. When the learner returns, Home may still show yesterday and the
     weekly coach (started from viewHome) never ran. Draw Home again when the day changed or 3 hours passed.
     Only Home: any other screen may be in the middle of an exercise. Never under a dialog or a celebration card. */
  var homeAt = 0, homeDay = "";
  function resumeHome() {
    if (document.visibilityState === "hidden" || !homeAt) return;
    if (!/^#?\/?$/.test(location.hash)) return;
    if (document.querySelector(".modal-wrap, .fx-streak")) return;
    if (Store.today() === homeDay && Date.now() - homeAt < 3 * 3600 * 1000) return;
    route();
  }
  document.addEventListener("visibilitychange", resumeHome);
  window.addEventListener("pageshow", function (e) { if (e.persisted) resumeHome(); });

  /* ---------- daily tip: the one best thing to do today (rules, no AI) ----------
     The first rule that applies wins. No tip when the coach's plan on Home already asks for the same skill,
     or after today's tip was tapped (kept on this phone only: cbChinese.tip = { d: date, r: rule }). */
  var TIP_KEY = "cbChinese.tip";
  function tipRoute(skill) {
    if (Object.prototype.hasOwnProperty.call(AI.SKILL_ROUTE, skill)) return AI.SKILL_ROUTE[skill];
    return "#/mistakes" + (Learn.count(skill) ? "/" + skill : "");
  }
  function tipSkillName(skill) { return Object.prototype.hasOwnProperty.call(AI.SKILL_NAMES, skill) ? AI.SKILL_NAMES[skill] : (Learn.SKILLS[skill] ? Learn.SKILLS[skill].en : skill); }
  /* Weakest skill of the last 14 days: below 70% with at least 10 answers (the numbers behind studySummary().trend, keyed by skill id). */
  function tipWeakest() {
    var L = Store.state.slog || {}, from = Store.addDays(Store.today(), -13), sum = {}, best = null;
    Object.keys(L).forEach(function (d) {
      if (d < from) return;
      Object.keys(L[d].k || {}).forEach(function (k) { var c = sum[k] || (sum[k] = [0, 0]); c[0] += L[d].k[k][0]; c[1] += L[d].k[k][1]; });
    });
    Object.keys(sum).forEach(function (k) {
      var n = sum[k][0] + sum[k][1], acc = n ? Math.round(sum[k][0] / n * 100) : 100;
      if (!Learn.exam(k) || n < 10 || acc >= 70) return;
      if (!best || acc < best.acc) best = { skill: k, acc: acc, n: n };
    });
    return best;
  }
  function pickTip(fin) {
    var s = Store.state, t = Store.today(), due = SRS.dueIds(WORDMAP).length;
    if (due >= 20) return { id: "due", skill: "review", icon: "🔁", text: due + " words are due. Clear them first.", btn: "Review", href: "#/review" };
    var p = Learn.patterns(1)[0];
    if (p && p.type === "repeat") {
      var ws = p.keys.map(wordLabel).filter(Boolean);
      return { id: "repeat", skill: "vocab", icon: "🔎", text: "You keep missing the same " + (ws.length || p.keys.length) + (ws.length ? " words" : " items") + ". Practise them.", btn: "Practise", href: "#/mistakes", words: ws };
    }
    if (p) return { id: "pattern", skill: p.skill, icon: "🔎", text: tipSkillName(p.skill) + " keeps going wrong: " + p.n + " misses this week.", btn: "Practise", href: tipRoute(p.skill) };
    var w = tipWeakest();
    if (w) return { id: "weak", skill: w.skill, icon: "🎯", text: tipSkillName(w.skill) + " is your weakest skill: " + w.acc + "% in the last 14 days.", btn: "Practise", href: tipRoute(w.skill) };
    var exam = Store.daysBetween(t, s.settings.examDate || "2026-11-14"), from = Store.addDays(t, -13);
    var mocked = (s.mockHistory || []).concat(s.official || []).some(function (m) { return m.date >= from; });
    if (!mocked && exam >= 0 && exam <= 45) return { id: "mock", skill: "mock", icon: "📝", text: "No mock exam in 14 days. The exam is in " + exam + " day" + (exam === 1 ? "" : "s") + ".", btn: "Mock exam", href: "#/mock" };
    var nd = nextDay(), lessonDone = Object.keys(s.days).some(function (k) { return s.days[k].completedOn === t; });
    if (!fin && !lessonDone && !(s.days[nd.day] || {}).completed) return { id: "lesson", skill: "", icon: "📚", text: "Today's lesson is not done yet: Day " + nd.day + ".", btn: "Open lesson", href: "#/day/" + nd.day };
    if (Audio2.available() && new Date(t + "T00:00:00").getDate() % 2 === 0) return { id: "listen", skill: "", icon: "🎧", text: "All caught up. Listen hands-free for a few minutes.", btn: "Listen", href: "#/listen-mode" };
    return { id: "read", skill: "", icon: "📖", text: "All caught up. Read a real text from work.", btn: "Reader", href: "#/read" };
  }
  var tipNow = null;
  function tipCard(planActions, fin) {
    tipNow = null;
    var seen = null; try { seen = JSON.parse(localStorage.getItem(TIP_KEY) || "null"); } catch (e) { /* storage blocked */ }
    if (seen && seen.d === Store.today()) return "";
    var tp = pickTip(fin), R = AI.SKILL_ROUTE, own = Object.prototype.hasOwnProperty;
    if (tp.skill && planActions.some(function (a) { return !a.done && (a.skill === tp.skill || (own.call(R, a.skill) && own.call(R, tp.skill) && R[a.skill] === R[tp.skill])); })) return "";
    tipNow = tp;
    return '<section class="card tip" id="tip" data-rule="' + tp.id + '"><span class="tip-i" aria-hidden="true">' + tp.icon + '</span><p class="tip-t"><small>Tip for today</small>' + esc(tp.text) + "</p>" +
      '<a class="btn small primary" id="tip-go" href="' + tp.href + '">' + esc(tp.btn) + " ›</a></section>";
  }
  function wireTip() {
    var go = document.getElementById("tip-go"), tp = tipNow; if (!go || !tp) return;
    go.onclick = function (e) {
      try { localStorage.setItem(TIP_KEY, JSON.stringify({ d: Store.today(), r: tp.id })); } catch (err) { /* storage blocked */ }
      if (tp.words && tp.words.length) { // the same deck as the "Pattern spotted" card
        e.preventDefault();
        SRS.addMany(tp.words.map(function (x) { return x.id; }));
        runDeck({ title: "Words you keep missing", words: tp.words, mode: "review", back: "#/" });
      }
    };
  }

  /* The Today card: today's few steps (session, lesson or catch-up, the exam-plan task, the weekly quiz) with one button
     that always opens the next step not done. After 2+ days away the session becomes the 5-minute restart. */
  /* On exam day the forecast is frozen, so the real result can be compared with what the app predicted. */
  function examLine() {
    var dl = examLeft(), n = (Store.state.examHist || []).length;
    return "HSK " + exLv() + " · " + (dl == null ? "no date" : dl > 0 ? dl + " day" + (dl === 1 ? "" : "s") + " left" : dl === 0 ? "today" : "done") + (n ? " · " + n + " past" : "");
  }
  function exLv() { return Store.state.settings.examLevel === 5 ? 5 : 4; }
  function examLeft() { var ex = Store.state.settings.examDate; return ex ? Store.daysBetween(Store.today(), ex) : null; }
  function freezeForecast() {
    var s = Store.state, ex = s.settings.examDate;
    if (!ex || exLv() !== 4 || (s.fcAtExam && s.fcAtExam.d === ex) || Store.today() < ex) return; // the forecast is for HSK 4
    var r = readiness(); if (!r) return;
    s.fcAtExam = { d: ex, t: r.total, L: r.L, R: r.R, W: r.W }; Store.save();
  }
  /* the real result of the current exam: a logged real entry dated from the day before the exam on */
  function realResult() { var ex = Store.state.settings.examDate || ""; return (Store.state.official || []).filter(function (o) { return o.real && o.date >= Store.addDays(ex, -1); }).pop() || null; }
  function realAskCard() {
    var s = Store.state, ex = s.settings.examDate;
    if (!ex || Store.today() <= ex || realResult() || s.afterFor === ex) return "";
    return '<a class="card line-card real-ask" href="#/official/real"><span class="lc-i" aria-hidden="true">🎓</span><span class="lc-t"><small>After the exam</small><b>How did HSK ' + exLv() + ' go? Log your real scores</b></span><span class="lc-go" aria-hidden="true">›</span></a>';
  }
  /* once the real result is in: one card until the learner picks what comes next */
  function afterCard() {
    var s = Store.state, ex = s.settings.examDate;
    if (!ex || Store.today() <= ex || !realResult() || s.afterFor === ex) return "";
    return '<a class="card line-card after-next" href="#/exams"><span class="lc-i" aria-hidden="true">🧭</span><span class="lc-t"><small>After HSK ' + exLv() + '</small><b>What\'s next? Another exam, HSK 5, or keep reviewing</b></span><span class="lc-go" aria-hidden="true">›</span></a>';
  }
  /* Move the current exam into the history (with its frozen forecast and real result), once per date. */
  function archiveExam() {
    var s = Store.state, ex = s.settings.examDate, lv = exLv(); if (!ex) return;
    var rr = realResult(), fc = s.fcAtExam && s.fcAtExam.d === ex ? s.fcAtExam : null;
    s.examHist = (s.examHist || []).filter(function (e) { return !(e.d === ex && e.lv === lv); });
    s.examHist.push({ lv: lv, d: ex, fc: fc ? { t: fc.t, L: fc.L, R: fc.R, W: fc.W } : null, real: rr ? { l: rr.l, r: rr.r, w: rr.w } : null });
    if (s.examHist.length > 20) s.examHist.splice(0, s.examHist.length - 20);
    s.afterFor = ex; s.fcAtExam = null;
  }
  var EXAM_NEXT = { exam: ["📅", "Plan another exam", "Pick the level and date; the plan and countdown follow it"], h5: ["📗", "Start HSK 5", "Word packs, grammar and practice for the next level"], keep: ["🔁", "Keep reviewing", "Daily review so your Chinese stays fresh, no exam date"] };
  function histRow(e) {
    var t = e.real ? e.real.l + e.real.r + e.real.w : null, dlt = t != null && e.fc ? t - e.fc.t : null;
    return '<div class="of-item ex-hist"><div><b>HSK ' + e.lv + " · " + esc(lrnDate(e.d)) + "</b><small>" + (e.fc ? "Forecast ~" + e.fc.t : "No forecast") + (t != null ? " · real " + t + "/300" + (dlt != null ? " (" + (dlt >= 0 ? "+" : "") + dlt + ")" : "") : " · no result logged") + "</small></div>" +
      (t != null ? '<span class="tag ' + (t >= 180 ? "t-hsk" : "t-warn") + '">' + (t >= 180 ? "Pass" : "Not yet") + "</span>" : "") + "</div>";
  }
  /* #/exams: the current exam, what to do after it, and every exam so far */
  function viewExams() {
    var s = Store.state, set = s.settings, ex = set.examDate, lv = exLv(), dl = examLeft(), past = dl != null && dl < 0, rr = realResult(), chosen = s.afterFor === ex;
    freezeForecast();
    var html = '<section class="card g-sun"><h2>🎓 My exams</h2>' + (past ? '<p class="sub">Your HSK ' + lv + " exam was on " + esc(lrnDate(ex)) + ".</p>" :
      '<p class="score-big">' + (dl === 0 ? "Today" : dl + ' <small>day' + (dl === 1 ? "" : "s") + "</small>") + '</p><p class="sub">HSK ' + lv + " · " + esc(lrnDate(ex)) + (set.examTime ? " at " + esc(set.examTime) : "") + "</p>") + "</section>";
    if (past && !rr && !chosen) html += '<a class="card line-card real-ask" href="#/official/real"><span class="lc-i" aria-hidden="true">🎓</span><span class="lc-t"><small>Step 1</small><b>Log your real scores</b></span><span class="lc-go" aria-hidden="true">›</span></a>';
    if (rr && !chosen) html += realCompareHTML();
    if (past && !chosen) html += '<section class="card"><h2>' + (rr ? "Step 2 · " : "") + "What's next?</h2><div class=\"glist\">" + Object.keys(EXAM_NEXT).map(function (k) {
      return '<button type="button" class="grow" data-next="' + k + '"><span class="g-ico">' + EXAM_NEXT[k][0] + '</span><span class="g-txt"><b>' + EXAM_NEXT[k][1] + "</b><small>" + EXAM_NEXT[k][2] + '</small></span><span class="g-go">›</span></button>';
    }).join("") + "</div>" + (rr ? "" : '<p class="sub">You can still log your score later in Me › Am I ready › Official papers.</p>') + "</section>";
    html += '<section class="card" id="ex-set"' + (past && !chosen ? " hidden" : "") + '><h2>' + (past ? "Next exam" : "Exam details") + "</h2>" +
      '<div class="mw-form"><label for="ex-lv">Level</label><select id="ex-lv"><option value="4"' + (lv === 4 ? " selected" : "") + '>HSK 4</option><option value="5"' + (lv === 5 ? " selected" : "") + ">HSK 5</option></select>" +
      '<label for="ex-d">Date</label><input type="date" id="ex-d" value="' + esc(past ? "" : ex) + '"><label for="ex-t">Start time <small>(optional · your final full mocks are planned at this hour)</small></label><input type="time" id="ex-t" value="' + esc(past ? "" : set.examTime || "") + '">' +
      '<p class="mw-err" id="ex-err" hidden></p><button type="button" class="btn primary wide" id="ex-save">Save</button></div><p class="sub">The study plan, the 3-week exam plan and the countdown all follow this date. Change it any time.</p>' +
      (!past && examWarn(ex) ? '<p class="sub bad-t">' + examWarn(ex) + "</p>" : "") + "</section>";
    var hist = (s.examHist || []).slice().reverse();
    if (hist.length) html += '<section class="card"><h2>Past exams</h2>' + hist.map(histRow).join("") + "</section>";
    render(html, "me");
    app.querySelectorAll("[data-next]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-next");
        if (k === "exam") { document.getElementById("ex-set").hidden = false; document.getElementById("ex-d").focus(); return; }
        archiveExam(); if (k === "h5") set.level = 5; Store.save();
        UI.toast(k === "h5" ? "HSK 5 is on · your exam is saved in My exams" : "Daily review keeps going · your exam is saved in My exams", "🎓");
        if (k === "h5") location.hash = "#/learn/h5"; else viewExams();
      };
    });
    document.getElementById("ex-save").onclick = function () {
      var d = document.getElementById("ex-d").value, t = document.getElementById("ex-t").value, nl = +document.getElementById("ex-lv").value === 5 ? 5 : 4, err = document.getElementById("ex-err");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { err.textContent = "Pick the exam date."; err.hidden = false; return; }
      if (past && d <= Store.today()) { err.textContent = "Pick a date after today for the next exam."; err.hidden = false; return; }
      if (past || (d !== ex && Store.today() > ex)) archiveExam();
      set.examDate = d; set.examTime = /^\d{2}:\d{2}$/.test(t) ? t : ""; set.examLevel = nl; if (nl === 5) set.level = 5;
      Store.save(); buildIndex(); UI.toast("Exam saved · HSK " + nl + " on " + lrnDate(d), "📅"); viewExams();
    };
  }
  function realCompareHTML() {
    var rr = realResult(), fc = Store.state.fcAtExam; if (!rr) return "";
    if (fc && fc.d !== Store.state.settings.examDate) fc = null;
    var t = rr.l + rr.r + rr.w, d = fc ? t - fc.t : null;
    return '<section class="card real-card ' + (t >= 180 ? "ok" : "low") + '"><h2>🎓 Your real HSK ' + exLv() + '</h2><p class="score-big">' + t + "/300</p>" +
      "<p>" + secBar("Listening", rr.l) + secBar("Reading", rr.r) + secBar("Writing", rr.w) + "</p>" +
      (fc ? '<p class="sub">The app forecast ~' + fc.t + " on exam day · " + (d === 0 ? "exactly right" : (d > 0 ? d + " points better" : -d + " points lower") + " than forecast") + ".</p>" : "") + "</section>";
  }
  function todaySteps() {
    var s = Store.state, t = Store.today(), nd = nextDay(), p = planInfo(), fin = p.inBuffer, steps = [];
    var away = !!comebackCard(), sess = sessionPlan(away ? "comeback" : null);
    var last = lastStudyDay(), gap = last ? Store.daysBetween(last, t) : 0;
    steps.push(away ? { id: "comeback", ico: "⏱", name: "5-minute restart", sub: "Welcome back · " + gap + " days away · your oldest reviews first", href: "#/session/comeback", done: (s.log[t] || 0) > 0 }
      : { id: "session", ico: "▶", name: "Today's session", sub: plural(sess.length, "step") + " · " + sessionCfg().label, href: "#/session", done: !!(s.sessions || {})[t] });
    var cu = fin ? [] : cuLessons();
    if (cu.length) steps.push({ id: "catchup", ico: "⏳", name: "Catch up: " + plural(cu.length, "short lesson") + " today", sub: "Behind plan · Day " + cu.map(function (d) { return d.day; }).join(" + Day "), href: "#/catchup", done: false });
    else if (!fin && nd && !p.afterExam) {
      var lessonDone = Object.keys(s.days).some(function (k) { return s.days[k].completedOn === t; });
      steps.push({ id: "lesson", ico: "📚", name: "Lesson · Day " + nd.day, zh: nd.title.zh, sub: M(nd.title), href: "#/day/" + nd.day, done: lessonDone });
    }
    var el = examLeft();
    if (el === 0) return [{ id: "warmup", ico: "🌅", name: "Exam-morning warm-up", sub: "Easy words you know + one tip per part · 10 min", href: "#/warmup", done: !!(s.warm || {})[t] }];
    if (el === 1) { steps = steps.filter(function (x) { return x.id !== "lesson" && x.id !== "catchup"; }); steps.push({ id: "eve", ico: "🎒", name: "Checklist for tomorrow", sub: eveDone() + "/" + EVE.length + " ready · then light review and sleep early", href: "#/eve", done: eveDone() === EVE.length }); return steps; }
    var sc = examSchedule();
    if (sc.length && sc[0].kind !== "exam") steps.push({ id: "exam", ico: sc[0].ico, name: sc[0].txt, href: sc[0].href, done: sc[0].done,
      sub: "Exam plan · " + plural(sc.length - 1, "day") + " left" + (sc[0].kind === "mock" && !s.settings.examTime && sc[0].left <= 8 ? " · set your exam start time in Me → My exams to rehearse at that hour" : "") });
    if (wqOffer()) steps.push({ id: "weekly", ico: "🧠", name: "Weekly review quiz", sub: "Words and grammar from the last 7 days", href: "#/weekly", done: false });
    return steps;
  }
  function todayMain() {
    var steps = todaySteps(), done = steps.filter(function (x) { return x.done; }).length, next = -1;
    steps.forEach(function (x, i) { if (next < 0 && !x.done) next = i; });
    var away = steps[0].id === "comeback", rescue = !away && rescueCard();
    var short = away ? "" : rescue ? '<a class="tm-short" href="#/session/rescue">🔥 Streak at risk · do the 2-minute rescue</a>'
      : shortLink() ? '<a class="tm-short has-dog" href="#/session/rescue">' + UI.anim("dog-peek", 34, "⏱") + "<span>Only 2 minutes today?</span></a>" : "";
    var btn = next < 0 ? '<a class="tm-go" href="#/review">✓ All done today · review due words</a>'
      : '<a class="tm-go" id="today-go" href="' + steps[next].href + '">▶ ' + (done ? "Continue · step " + (next + 1) + " of " + steps.length : "Start · " + esc(steps[next].name)) + "</a>";
    return '<section class="card today-main g-violet" id="today-main"><div class="tm-h"><h2>Today</h2><span>' + done + "/" + steps.length + ' done</span></div><ol class="tm-steps">' +
      steps.map(function (x, i) {
        return '<li class="' + (x.done ? "done" : i === next ? "now" : "") + '"><a href="' + x.href + '" data-step="' + x.id + '"><span class="tm-box" aria-hidden="true">' + (x.done ? "✓" : x.ico) + '</span><span class="tm-t"><b>' +
          (x.done ? '<span class="sr">Done: </span>' : "") + esc(x.name) + (x.zh ? ' <span class="zh">' + esc(x.zh) + "</span>" : "") + "</b><small>" + x.sub + "</small></span></a></li>";
      }).join("") + "</ol>" + btn + short + "</section>";
  }
  /* one line about the exam plan: tomorrow's task in the last 3 weeks, else the study plan */
  function planLine() {
    var sc = examSchedule();
    if (sc.length > 1) return '<a class="card line-card" href="#/exam"><span class="lc-i" aria-hidden="true">🗓️</span><span class="lc-t"><small>Exam plan · tomorrow</small><b>' + esc(sc[1].txt) + '</b></span><span class="lc-go" aria-hidden="true">›</span></a>';
    var p = planInfo();
    return '<a class="card line-card" href="#/plan"><span class="lc-i" aria-hidden="true">🗓️</span><span class="lc-t"><small>Study plan</small><b>' + plural(p.done, "lesson") + " done · " + esc(STATUS[p.status][1]) + '</b></span><span class="lc-go" aria-hidden="true">›</span></a>';
  }
  function viewHome() {
    var s = Store.state, lv = Game.level(s.xp), goal = s.settings.dailyGoal || 30, todayXP = s.log[Store.today()] || 0;
    var due = SRS.dueIds(WORDMAP).length, nd = nextDay(), exam = Store.daysBetween(Store.today(), s.settings.examDate || "2026-11-14");
    var earned = Game.BADGES.filter(function (b) { return s.badges[b.id]; });
    var html = "";
    if (isIOS && !standalone && location.protocol.indexOf("http") === 0 && !s.settings.installHintDismissed) {
      html += '<div class="install card"><div><b>Add to Home Screen</b><p>Tap <b>Share ⬆︎</b> in Chrome → <b>Add to Home Screen</b>. It opens full-screen, works offline and keeps your progress safe.</p></div><button class="x" id="hint-x" aria-label="Dismiss">✕</button></div>';
    }
    /* One "Today" card is the only call to action; readiness and the exam plan are one line each.
       Everything else lives in one place elsewhere: lessons in Learn, games and mock tests in Practice, progress in Me. */
    html += '<section class="hero home-head"><div class="hh-m bob">' + UI.mascot(todayXP >= goal ? "proud" : todayXP === 0 ? "wave" : "happy", 52) + "</div>" +
      '<div class="hh-t"><p class="hi">' + (todayXP >= goal ? "Đạt mục tiêu hôm nay! 🎉" : "Chào bạn! 加油！") + "</p><h2>" + (exam > 0 ? exam + " days to HSK " + exLv() : exam === 0 ? "HSK " + exLv() + " is today · 加油!" : "Keep your Chinese going") + "</h2>" +
      '<p class="lv">Level ' + lv.n + ' · <span class="zh">' + lv.zh + "</span> · " + s.xp + " XP</p></div></section>";
    var fin = planInfo().inBuffer;
    homeAt = Date.now(); homeDay = Store.today();
    freezeForecast();
    html += chatCard() + syncPausedCard() + realAskCard() + afterCard();
    if (fin) html += readyCard();
    html += todayMain() + h5HomeRow(); // on HSK 5: the next unfinished pack, right under Today
    if (!fin) html += readyCard();
    html += planLine();
    var plan = planCard();
    html += '<details class="more home-more"><summary><span>More: quests, coach plan, activity, badges</span></summary>' +
      questsCard() + plan + patternCard() + focusCard() + todayCard() + weeklyTeaser() +
      '<section class="card"><div class="sec-h"><h2>Study activity</h2><span class="muted">12 weeks</span></div>' + heatmap() + '<div class="heat-key"><span>Less</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>More</span></div></section>' +
      '<section class="card"><div class="sec-h"><h2>Badges</h2><a href="#/me">' + earned.length + "/" + Game.BADGES.length + " ›</a></div>" +
      (earned.length ? '<div class="badge-row">' + earned.slice(-6).reverse().map(function (b) { return '<span class="bdg" title="' + esc(b.en) + '">' + b.icon + "</span>"; }).join("") + "</div>" : '<p class="muted">Grade your first flashcard to earn 🌱</p>') + "</section></details>";
    if (LOAD_ERRORS.length) html += '<p class="warn">Could not load: ' + esc(LOAD_ERRORS.join(", ")) + "</p>";
    if (!Store.available) html += '<p class="warn">Storage is blocked, so progress won\'t be saved.</p>';
    render(html, "home");
    /* offline users: tell them when new audio is not on the phone yet */
    var optedIn = false; try { optedIn = localStorage.getItem("cbChinese.audioDl") === "1"; } catch (e) { /* ignore */ }
    if (optedIn) audioStatus(function (st) {
      var miss = st.total - st.have, host = document.querySelector(".hero");
      if (miss < 1 || !host || !document.getElementById("app").contains(host)) return;
      var d = document.createElement("a"); d.className = "card cta g-violet"; d.href = "#/me";
      d.innerHTML = '<span class="cta-l"><small>New audio</small><b>🔊 ' + miss + ' recordings are not saved on this phone</b><em>Me → Download missing, so lessons work offline</em></span><span class="cta-go">▶</span>';
      host.parentNode.insertBefore(d, host.nextSibling);
    });
    wireQuests(); wirePattern();
    whenIdle(4000).then(autoCoach);
    var wr = weekReward(); if (wr) setTimeout(function () { UI.toast(wr === "freeze" ? "Weekly goal met! +1 streak freeze" : "Weekly goal met!", wr === "freeze" ? "🧊" : "🎉"); UI.confetti(60); UI.burst("noto-muscle", weekInfo().n + " days", "Weekly goal met", wr === "freeze" ? "+1 streak freeze" : ""); }, 600);
    var x = document.getElementById("hint-x");
    if (x) x.onclick = function () { s.settings.installHintDismissed = true; Store.save(); x.closest(".install").remove(); };
  }

