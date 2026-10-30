  /* ---------- mistake notebook, weak areas & targeted drills ---------- */
  var SKILL_LINK = { confusable: "#/game/confuse", ordering: "#/game/order", measure: "#/game/measure", writing: "#/game/picture", grammar: "#/grammar", typing: "#/game/type", handwriting: "#/game/write", vocab: "#/review", pinyin: "#/game/race", "listen-word": "#/game/listen", "word-order": "#/game/builder", "listen-sentence": "#/game/drill", passage: "#/game/reading",
    "h5-vocab": "#/review", "h5-grammar": "#/grammar/h5", "h5-confusable": "#/game/confuse/h5", "h5-ordering": "#/game/order/h5", "h5-measure": "#/game/measure/h5", "h5-writing": "#/game/picture/h5" };
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
      if (skill === "repeat") return runMistakeDrill("all", { items: repeatItems(), title: "Repeat mistakes", icon: "🔁", exit: "#/mistakes", again: "#/mistakes/repeat", againFn: function () { viewMistakes("repeat"); } });
      if (skill !== "all" && !Learn.SKILLS[skill]) { location.replace("#/mistakes"); return; }
      return runMistakeDrill(skill);
    }
    var rep = Learn.report(3, true), all = Learn.list();
    var bySkill = {};
    all.forEach(function (x) { if (Learn.SKILLS[x.skill]) bySkill[x.skill] = (bySkill[x.skill] || 0) + 1; });
    var html = '<section class="card g-coral"><h2>📒 Mistake notebook</h2><p class="sub">Every wrong answer from quizzes, games and mock exams lands here. Get it right ' + Learn.CLEAR_AFTER + " times in a row to clear it.</p>" +
      '<p class="score-big">' + all.length + "</p>" + (all.length ? '<a class="btn big" id="mis-all" href="#/mistakes/all">▶ Drill all mistakes</a>' : "") +
      (repeatItems().length ? '<a class="btn big" id="mis-rep" href="#/mistakes/repeat" style="margin-top:10px">🔁 Fix ' + plural(repeatItems().length, "repeat mistake") + "</a><p class=\"sub\">Missed " + Learn.REPEAT_N + "+ times in 14 days. Each clears after " + Learn.CLEAR_AFTER + " right answers in a row.</p>" : "") + "</section>";
    if (all.length) {
      html += '<section class="card"><h2>Open mistakes by skill</h2>' + Object.keys(bySkill).sort(function (a, b) { return bySkill[b] - bySkill[a]; }).map(function (k) {
        return '<div class="sk-row"><span class="sk-n">' + skillName(k) + '</span><a class="btn small primary" href="#/mistakes/' + k + '">Practise ' + bySkill[k] + " ▶</a></div>";
      }).join("") + "</section>";
    }
    html += patternBox();
    html += '<section class="card"><h2>Weak-area report</h2>' + (rep.length ? '<p class="sub">Accuracy across all your answers, weakest first.</p>' + rep.map(function (x) {
      return '<div class="sk-block"><div class="sk-row"><span class="sk-n">' + skillName(x.skill) + "</span>" + accBar(x.acc) + "</div>" +
        (x.acc < 0.8 ? '<p class="sub">' + esc(x.info.tip) + "</p>" + practiceLink(x.skill) : "") + "</div>";
    }).join("") : '<p class="sub">Answer a few quizzes, games or a mock exam to see your report.</p>') + "</section>";
    render(html, "review");
    wirePatterns();
  }

  function findMockItem(mockId, itemId) {
    var m = MOCKMAP[mockId]; if (!m) return null;
    var x = mockItems(m).filter(function (y) { return y.it.id === itemId; })[0];
    return x || null;
  }

  /* Render one notebook item as a question. Returns { html, wire(done) } or null if its source is gone. */
  function mistakeQ(e) {
    if (e.kind === "aix") { // a new exam-format question: from the shared bank (checked) or written by the AI just now
      var ax = mockDrillQ(e.x, e);
      ax.html = ax.html.replace('<div class="card qcard" id="qcard">', '<div class="card qcard" id="qcard">' + (e.checked ? OK_NOTE : AI_NOTE) + (e.note || ""));
      return ax;
    }
    if (e.kind === "aiq") { // a question the AI wrote just now, or one from the shared bank (checked); not kept in the notebook
      var q = e.q, note = e.checked ? OK_NOTE : AI_NOTE;
      if (e.qk === "order") {
        var oq = orderQ(q.tokens, shuffle(q.tokens.map(function (_, k) { return k; })), q.answer, "", e, q.explain ? '<p class="sub">' + esc(q.explain) + "</p>" : "");
        oq.html = oq.html.replace('<p class="sub">Tap the pieces in the right order</p>', note + '<p class="sub">Tap the pieces in the right order</p>');
        return oq;
      }
      var ord = shuffle([0, 1, 2, 3]);
      return { html: '<div class="card qcard" id="qcard">' + note + '<p class="q zh">' + esc(q.sentence) + '</p><div class="opts">' +
          ord.map(function (k, n) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[n] + '</span><span class="zh">' + esc(q.options[k]) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>',
        wire: function (done) { wireMC(q.answer, function (ok) { Learn.record(e.key, e, ok); return q.explain ? '<p class="sub">' + esc(q.explain) + "</p>" : ""; }, done); } };
    }
    if (e.kind === "word") {
      var w = WORDMAP[e.id]; if (!w) return null;
      var types = e.skill === "pinyin" ? ["h2p"] : e.skill === "listen-word" ? ["aud"] : ["h2m", "m2h"];
      var q = Games._q.makeQ(w, types);
      return { html: Games._q.qHTML(q), wire: function (done) { Games._q.wireQ(q, done); } };
    }
    if (e.kind === "quiz") {
      var d = DAYMAP[e.day], qq = d && d.quiz && d.quiz[e.idx]; if (!qq) return null;
      var order = shuffle(qq.options.map(function (_, k) { return k; }));
      return { html: '<div class="card qcard" id="qcard"><p class="sub">Day ' + e.day + ' quiz</p>' + (/^根据短文/.test(qq.q) && d.reading && d.reading.lines ? '<p class="zh passage">' + esc(d.reading.lines.map(function (l) { return l.zh; }).join("")) + "</p>" : "") + '<p class="q zh">' + esc(qq.q) + '</p><div class="opts">' +
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
    if (e.kind === "gram") {
      var gp = GRAMMAP()[e.g], gq = gp && gp.quiz[e.i]; if (!gq) return null;
      var gord = shuffle([0, 1, 2, 3]);
      return { html: '<div class="card qcard" id="qcard"><p class="sub">📐 ' + esc(gp.title.zh) + " · " + M(gp.title) + '</p><p class="q zh">' + esc(gq.q) + '</p><div class="opts">' +
          gord.map(function (k, n) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[n] + '</span><span class="zh">' + esc(gq.options[k]) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>',
        wire: function (done) { wireMC(gq.answer, function (ok) { Learn.record(e.key, e, ok); return M(gq.explain); }, done); } };
    }
    if (e.kind === "drill") {
      var di = Games._drillItem(e.d, e.id); if (!di) return null;
      return Games._drillQ(e.d, di);
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
      if (!ok && window.AI) AI.attachExplain(document.getElementById("qfb"));
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
    var it = x.it, head = '<p class="sub">' + (e.kind === "aix" ? "" : "Mock test " + e.mock + " · ") + skillName(x.skill) + "</p>";
    if (x.kind === "order") {
      return orderQ(it.tokens, shuffle(it.tokens.map(function (_, k) { return k; })), it.answer, "", e, "", it.alt);
    }
    if (x.kind === "write") {
      return { html: '<div class="card qcard" id="qcard">' + head + '<p class="w2-scene">' + it.emoji + ' <b class="zh">' + esc(it.word) + '</b></p><textarea class="w2-input" id="dw" rows="2" placeholder="写一个句子…"></textarea>' +
          (w2AI() ? '<button class="btn wide primary" id="dw-ai">🤖 Check with AI</button>' : "") + '<button class="btn wide" id="dw-show">Show a model answer</button><div id="qfb"></div></div>',
        wire: function (done) {
          var aib = document.getElementById("dw-ai");
          if (aib) aib.onclick = function () {
            var v = document.getElementById("dw").value.trim(); if (!v) { UI.toast("Write a sentence first.", "✍️"); return; }
            aib.disabled = true;
            AI.grade(document.getElementById("qfb"), w2Item(it), v).then(function (res) {
              aib.disabled = false; if (!res || !res.ok) return;
              var ok = res.result.total >= 4; aib.hidden = true; document.getElementById("dw-show").hidden = true;
              document.getElementById("qfb").insertAdjacentHTML("beforeend", '<button class="btn primary wide" id="dw-next">' + (ok ? "✔ " : "✘ ") + res.result.total + "/5 · Next ›</button>");
              document.getElementById("dw-next").onclick = function () { Learn.record(e.key, e, ok); done(ok); };
            });
          };
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
    else prompt += sentHTML(it);
    var opts = x.kind === "tf" ? [["true", "✔ True"], ["false", "✘ False"]] : it.parts ? ORDERS.map(function (o, k) { return [String(k), o.split("").join(" → ")]; }) :
      shuffle(it.options.map(function (o, k) { return k; })).map(function (k, pos) { return [String(k), "ABCD"[pos] + " · " + it.options[k]]; });
    var answer = x.kind === "tf" ? String(it.answer) : String(it.answer);
    var script = x.kind === "tf" ? it.audio.text : x.kind === "aud" ? it.audio.text : x.kind === "dlg" ? it.dialogue.map(function (l) { return l.text; }).join(" / ") : "";
    return { html: '<div class="card qcard" id="qcard">' + prompt + '<div class="opts' + (x.kind === "tf" ? " tf-btns" : "") + '">' +
        opts.map(function (o) { return '<button class="opt" data-k="' + o[0] + '"><span class="zh">' + esc(o[1]) + "</span></button>"; }).join("") + '</div><div id="qfb"></div></div>',
      wire: function (done) {
        var dp = document.getElementById("dlg-play"); if (dp) dp.onclick = function () { Audio2.playAll(it.dialogue); };
        wireMC(answer, function (ok) { Learn.record(e.key, e, ok); return (script ? '<div class="script zh">🎧 ' + esc(script) + "</div>" : "") + (e.kind === "aix" && it.explain ? '<p class="sub">' + esc(it.explain) + "</p>" : "") + (ok ? "" : partTip(partKey(it))); }, done);
      } };
  }

  /* ---------- "Learn it" cards for items that keep going wrong ----------
     An item missed Learn.REPEAT_N+ times in 14 days is not being learned by quizzing it again, so before it is retried
     (mistake drill, and Today's session through it) it is taught once: the item, meaning, pinyin, an example and a
     memory hint built from the app's own data (characters, tones, confusable pairs, grammar patterns). No AI and no
     network needed; "Explain with AI" is an extra when the AI is on. Shown once per item per day (kept in memory only). */
  var learnItSeen = {}, hzIdx = null;
  function byHanzi(h) {
    if (!hzIdx || hzIdx.n !== WORDS.length) { hzIdx = { n: WORDS.length, m: {} }; WORDS.forEach(function (w) { if (w.hanzi && !hzIdx.m[w.hanzi]) hzIdx.m[w.hanzi] = w; }); }
    return hzIdx.m[h] || null;
  }
  function gapFill(q, ans) { return String(q || "").replace(/_{2,}/, typeof ans === "string" ? ans : ""); }
  var TONE_OF = { "ā": 1, "ē": 1, "ī": 1, "ō": 1, "ū": 1, "ǖ": 1, "á": 2, "é": 2, "í": 2, "ó": 2, "ú": 2, "ǘ": 2, "ǎ": 3, "ě": 3, "ǐ": 3, "ǒ": 3, "ǔ": 3, "ǚ": 3, "à": 4, "è": 4, "ì": 4, "ò": 4, "ù": 4, "ǜ": 4 };
  /* hints for one word: what each character means, its tones, and the rule that separates it from a look-alike */
  function wordHints(w) {
    var out = [], hz = Array.from(w.hanzi || "");
    if (hz.length > 1) {
      var parts = hz.map(function (c) { var cw = byHanzi(c); return cw ? '<span class="zh">' + esc(c) + "</span> " + M(cw) : null; });
      if (parts.some(Boolean)) out.push("Characters: " + parts.map(function (p, i) { return p || '<span class="zh">' + esc(hz[i]) + "</span>"; }).join(" + "));
    }
    var tones = Array.from(String(w.pinyin || "").normalize("NFC")).map(function (c) { return TONE_OF[c]; }).filter(Boolean);
    if (tones.length) out.push("Tones: " + tones.join(" – ") + ' <span class="muted">(say it aloud with these)</span>');
    var cf = ((window.CB_DRILLS || {}).confuse || []).filter(function (x) { return (x.words || []).indexOf(w.hanzi) >= 0; })[0];
    if (cf) out.push('Don\'t mix up <span class="zh">' + cf.words.map(esc).join(" / ") + "</span>: " + M(cf.explain));
    return out;
  }
  /* the grammar point whose key word appears in a sentence (longest key first): its pattern is the hint, its example the model */
  function grammarFor(zh) {
    var best = null, bestLen = 0;
    (window.CB_GRAMMAR || []).forEach(function (g) {
      var key = String((g.title && g.title.zh) || "").split(/……|…|字句|\//)[0].replace(/[^㐀-鿿]/g, "");
      if (key && key.length > bestLen && zh.indexOf(key) >= 0) { best = g; bestLen = key.length; }
    });
    return best;
  }
  /* What to teach for one notebook entry: { zh, py, mean, ex, hints[] } or null when its source is gone. */
  function learnItData(e) {
    var d = { zh: "", py: "", mean: null, ex: null, hints: [] }, w = null, it;
    if (e.kind === "word") { w = WORDMAP[e.id]; if (!w) return null; d.zh = w.hanzi; d.py = w.pinyin; d.mean = w; d.ex = w.example || null; d.hints = wordHints(w); }
    else if (e.kind === "type" || e.kind === "order") { d.zh = (e.core || "") + (e.end || ""); d.py = e.py; d.mean = e.vi || e.en ? e : null; if (e.core) d.hints.push("Build it piece by piece: " + Games._chunk(e.core).map(function (p) { return '<span class="zh">' + esc(p) + "</span>"; }).join(" + ")); }
    else if (e.kind === "ls") { d.zh = e.zh; d.py = e.py; d.mean = e; }
    else if (e.kind === "drill") {
      it = Games._drillItem(e.d, e.id); if (!it) return null;
      if (e.d === "confuse") { d.zh = gapFill(it.q, it.answer); w = byHanzi(it.answer); d.hints.push('<span class="zh">' + it.words.map(esc).join(" / ") + "</span>: " + M(it.explain)); }
      else if (e.d === "measure") { d.zh = gapFill(it.q, it.options[it.answer]); d.hints.push(M(it.explain)); }
      else if (e.d === "order") { d.zh = it.zh || it.answer.split("").map(function (k) { return it.parts[k]; }).join(""); d.mean = it.vi || it.en ? it : null; if (it.clue) d.hints.push(M(it.clue)); }
      else if (e.d === "bank") { d.zh = gapFill(it.q, it.bank[it.answer]); d.mean = it; w = byHanzi(it.bank[it.answer]); }
      else if (e.d === "wordorder") { d.zh = it.answer; d.mean = it; if (it.point) d.hints.push(M(it.point)); }
      else if (e.d === "picture") { d.zh = it.word; w = byHanzi(it.word); d.ex = (it.samples || [])[0] || null; }
      if (w) { if (!d.mean && e.d === "picture") d.mean = w; d.hints = d.hints.concat(wordHints(w)); if (!d.ex && w.example) d.ex = { zh: w.example.zh, py: w.example.py, vi: w.example.vi, en: w.example.en, word: w.hanzi }; }
    }
    else if (e.kind === "quiz") {
      var day = DAYMAP[e.day], qq = day && day.quiz && day.quiz[e.idx]; if (!qq) return null;
      var a = qq.options[qq.answer];
      d.zh = /_{2,}/.test(qq.q) && typeof a === "string" ? gapFill(qq.q, a) : qq.q; if (!/_{2,}/.test(qq.q)) d.mean = typeof a === "string" ? null : a;
      if (/_{2,}/.test(qq.q) || typeof a === "string") d.hints.push("Answer: " + optHTML(a));
      if (qq.explain) d.hints.push(M(qq.explain));
    }
    else if (e.kind === "gram") {
      var gp = GRAMMAP()[e.g], gq = gp && gp.quiz[e.i]; if (!gq) return null;
      d.zh = /_{2,}/.test(gq.q) ? gapFill(gq.q, gq.options[gq.answer]) : gq.options[gq.answer]; d.ex = (gp.examples || [])[0] || null;
      d.hints.push("Pattern: <span class=\"zh\">" + esc(gp.pattern) + "</span>"); if (gq.explain) d.hints.push(M(gq.explain));
    }
    else if (e.kind === "mock") {
      var x = findMockItem(e.mock, e.item); if (!x) return null; it = x.it;
      if (x.kind === "sent") d.zh = it.parts ? (it.orderKey || ORDERS[it.answer] || "").split("").map(function (k) { return it.parts[k]; }).join("") : gapFill(it.sentence, it.options[it.answer]);
      else if (x.kind === "order") d.zh = it.answer;
      else if (x.kind === "write") d.zh = it.sample;
      else if (x.kind === "tf") { d.zh = it.audio.text; d.hints.push('<span class="zh">' + esc(it.statement) + "</span> → " + (it.answer ? "true" : "false")); }
      else { d.zh = it.q || it.question; d.hints.push("Answer: <span class=\"zh\">" + esc(it.options[it.answer]) + "</span>"); }
    }
    else return null;
    if (!d.zh) return null;
    if (e.kind !== "word" && e.kind !== "gram") { // a sentence: the grammar point it uses gives a pattern and a model sentence
      var g = grammarFor(d.zh);
      if (g) { d.hints.push("Pattern (" + esc(g.title.zh) + "): <span class=\"zh\">" + esc(g.pattern) + "</span>"); if (!d.ex && g.examples && g.examples[0]) d.ex = g.examples[0]; }
    }
    var tip = Learn.SKILLS[e.skill]; if (tip) d.hints.push(esc(tip.tip));
    d.hints = d.hints.slice(0, 4);
    return d;
  }
  function learnItCard(e, reps) {
    var d = learnItData(e); if (!d) return null;
    var ai = !!(window.AI && AI.available());
    var html = '<div class="card learnit" id="learnit"><p class="sub">💡 <b>Learn it first</b> · missed ' + reps + " times in the last 14 days</p>" +
      '<div class="li-item"><span class="zh li-zh" lang="zh-CN">' + esc(d.zh) + "</span>" + SAY(d.zh) + "</div>" + (d.py ? PY(d.py) : "") + (d.mean ? '<div class="tr show">' + M(d.mean) + "</div>" : "") +
      (d.ex && d.ex.zh && d.ex.zh !== d.zh ? '<div class="w-ex"><small class="muted">Example</small><div class="ex-zh"><span class="zh">' + esc(d.ex.zh) + "</span>" + SAY(d.ex.zh) + "</div>" + (d.ex.py ? PY(d.ex.py) : "") + (d.ex.vi || d.ex.en ? '<div class="tr show">' + M(d.ex) + "</div>" : "") + "</div>" : "") +
      (d.hints.length ? '<h3 class="li-h">🧠 Memory hint</h3><ul class="li-hints">' + d.hints.map(function (h) { return "<li>" + h + "</li>"; }).join("") + "</ul>" : "") +
      (ai ? '<button type="button" class="btn small ai-btn" id="li-ai">🤖 Explain with AI</button><div class="ai-out" id="li-out"></div>' : "") +
      '<button type="button" class="btn primary wide" id="li-go">Got it — try it ▶</button></div>';
    return { html: html, wire: function (done) {
      document.getElementById("li-go").onclick = function () { done(); };
      var b = document.getElementById("li-ai"), out = document.getElementById("li-out");
      if (b) b.onclick = function () {
        b.disabled = true; out.innerHTML = '<div class="ai-card ai-wait">🤖 Thinking…</div>';
        AI.call("ask", { text: d.zh.slice(0, 80), context: d.ex && d.ex.zh || "", preset: "why", question: "" }).then(function (res) {
          if (!out.isConnected) return;
          b.disabled = false;
          if (!res.ok) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"; return; }
          b.hidden = true; out.innerHTML = AI._askCard(res);
        });
      };
    } };
  }

  /* ---------- Reading drill: a short passage + questions, HSK 4 reading part 3 (played in js/games.js, "reading") ----------
     No new content. Two sources:
       - mock exams the learner has ALREADY taken (reading part 3 passages): real exam format, and an unseen mock is never
         spoiled, so it still gives an honest score later;
       - lesson passages (every 5th day) with their "根据短文…" quiz questions, from lessons the learner has reached
         (the first two lessons with a passage when none is reached yet, so a new learner still gets a set).
     Questions are taken passage by passage, so one set is usually one or two passages. */
  function readingGroups() {
    var s = Store.state, out = [], reach = maxStudiedDay();
    MOCK.forEach(function (m) {
      var taken = ((s.mocks || {})[m.id] || {}).plays || (s.mockHistory || []).some(function (h) { return h.id === m.id; });
      if (!taken || !m.reading || !m.reading.p3) return;
      m.reading.p3.forEach(function (pg) {
        out.push({ src: "Mock test " + m.id + " (already taken)", passage: pg.passage, qs: pg.questions.map(function (q) {
          return { q: q.q, options: q.options, answer: q.answer, key: "m:" + m.id + ":" + q.id, meta: { kind: "mock", skill: "passage", mock: m.id, item: q.id } };
        }) });
      });
    });
    var days = DAYS.filter(function (d) { return d.reading && d.reading.kind === "passage" && (d.reading.lines || []).length && (d.quiz || []).some(function (q) { return /^根据短文/.test(q.q); }); });
    var reached = days.filter(function (d) { return d.day <= reach; });
    (reached.length ? reached : days.slice(0, 2)).forEach(function (d) {
      var qs = [];
      d.quiz.forEach(function (q, k) { if (/^根据短文/.test(q.q)) qs.push({ q: q.q, options: q.options, answer: q.answer, key: "q:" + d.day + ":" + k, meta: { kind: "quiz", skill: "passage", day: d.day, idx: k } }); });
      out.push({ src: "Day " + d.day + " · " + (d.reading.title ? d.reading.title.zh : ""), passage: d.reading.lines.map(function (l) { return l.zh; }).join(""), lines: d.reading.lines, qs: qs });
    });
    return out;
  }
  function readingSet(n) {
    var out = [];
    shuffle(readingGroups()).some(function (g) {
      shuffle(g.qs).some(function (q) { out.push(Object.assign({ src: g.src, passage: g.passage, lines: g.lines || null }, q)); return out.length >= n; });
      return out.length >= n;
    });
    return out;
  }
  /* Today's session gets a reading step while Reading is the weakest exam section (mock forecast, or practice estimate). */
  function readingWeakest() {
    var r = null; try { r = readiness(); } catch (e) { r = null; }
    return !!(r && r.weakest && r.weakest.k === "R");
  }

  /* notebook items missed again and again (Learn.repeats), most-missed first */
  function repeatItems() {
    return Learn.list().filter(function (e) { return Learn.repeats(e.key); }).sort(function (a, b) { return Learn.repeats(b.key) - Learn.repeats(a.key); }).slice(0, 10);
  }
  function runMistakeDrill(skill, o) {
    o = o || {};
    var pool = shuffle(Learn.list(skill === "all" ? null : skill));
    pool.sort(function (a, b) { return (Learn.repeats(b.key) ? 1 : 0) - (Learn.repeats(a.key) ? 1 : 0); }); // items that keep going wrong first: they get a Learn it card
    var items = o.items ? o.items.slice() : pool.slice(0, o.limit || 10), i = 0, right = 0, skipped = 0;
    var title = o.title || (skill === "all" ? "All mistakes" : Learn.SKILLS[skill].en);
    if (!items.length) { if (o.onDone) return o.onDone(0); location.replace(o.exit || "#/mistakes"); return; }
    /* timed part practice: one clock for the whole run, at the real exam's pace; at zero the run ends */
    var myHash = location.hash, t0 = Date.now(), clock = null, timeUp = false;
    if (o.timer) clock = setInterval(function () {
      if (location.hash !== myHash || i >= items.length) { clearInterval(clock); return; }
      var left = o.timer - Math.floor((Date.now() - t0) / 1000), el = document.getElementById("dr-clock");
      if (el) { el.textContent = fmtTime(left); el.classList.toggle("low", left <= 30); }
      if (left <= 0) { clearInterval(clock); timeUp = true; i = items.length; draw(); }
    }, 1000);
    function draw() {
      if (i >= items.length) {
        if (clock) clearInterval(clock);
        if (o.items && !o.onDone) {
          var done = items.length - skipped, used = Math.round((Date.now() - t0) / 1000);
          Game.award(right * 2);
          render('<div class="card result">' + UI.mascot(right >= done * 0.8 ? "cheer" : "happy", 88) + "<h2>" + (timeUp ? "⏰ Time's up · " : "") + right + " / " + done + " right</h2>" +
            (o.timer ? '<p class="sub">' + (timeUp ? "The real exam gives you the same time for these questions. Unanswered ones count as wrong there." : "Time used: " + fmtTime(used) + " of " + fmtTime(o.timer) + ".") + "</p>" : "") +
            '<p class="sub">Wrong answers are in your mistake notebook.</p><div class="actions center">' + (o.again ? '<a class="btn primary" href="' + o.again + '" id="again">↻ Again</a>' : "") +
            '<a class="btn" href="' + (o.exit || "#/mistakes") + '">Back</a></div></div>', "review");
          var ag0 = document.getElementById("again"); if (ag0 && o.againFn) ag0.onclick = function (ev) { ev.preventDefault(); o.againFn(); };
          return;
        }
        var left = Learn.count(skill === "all" ? null : skill);
        Game.award(right * 2, o.onDone ? { silent: true } : undefined);
        if (o.onDone) return o.onDone(right);
        render('<div class="card result">' + UI.mascot(right === items.length - skipped ? "cheer" : "happy", 88) + "<h2>" + right + " / " + (items.length - skipped) + " right</h2>" +
          '<p class="sub">' + (left ? left + " still in the notebook — they clear after " + Learn.CLEAR_AFTER + " right answers in a row." : "Notebook clear for this skill! 🎉") + "</p>" +
          '<div class="actions center">' + (left ? '<a class="btn primary" href="#/mistakes/' + skill + '" id="again">↻ Drill again</a>' : "") + '<a class="btn" href="#/mistakes">Notebook</a></div></div>', "review");
        var ag = document.getElementById("again"); if (ag) ag.onclick = function (ev) { ev.preventDefault(); runMistakeDrill(skill); };
        if (!left) UI.confetti(100);
        return;
      }
      var e = items[i], q = mistakeQ(e);
      if (!q) {
        var src = String((e.kind === "gram" ? e.g : e.id) || "");
        var loaded = e.kind === "mock" ? mocksReady : /^h5/.test(src) ? h5Loaded() : /^x4-/.test(src) ? x4Loaded() : (e.kind === "quiz" || e.kind === "gram" || e.kind === "drill" ? fullReady : true);
        if (loaded) { delete Store.state.mistakes[e.key]; Store.save(); } // its source really is gone
        skipped++; i++; return draw();
      }
      var head = '<div class="ghead"><a class="pill" href="' + (o.exit || "#/mistakes") + '">✕</a><b>' + (o.icon || "📒") + " " + esc(title) + '</b><span class="ghr">' + (o.timer ? '<span class="dr-clock" id="dr-clock">' + fmtTime(o.timer - Math.floor((Date.now() - t0) / 1000)) + "</span> · " : "") + (i + 1) + "/" + items.length + "</span></div>" +
        '<div class="bar"><span style="width:' + (i / items.length * 100) + '%"></span></div>';
      var reps = Learn.repeats(e.key), seenKey = Store.today() + "|" + e.key, li = null; try { li = reps && !learnItSeen[seenKey] ? learnItCard(e, reps) : null; } catch (er) { li = null; }
      if (li) { learnItSeen[seenKey] = 1; render(head + li.html, "review"); li.wire(draw); return; } // teach first, then the same item is asked
      render(head + q.html, "review");
      q.wire(function (ok) { if (timeUp) return; if (ok) right++; i++; draw(); });
    }
    draw();
  }

