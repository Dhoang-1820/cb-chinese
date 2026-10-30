  /* ---------- shared question bank ----------
     Good AI practice questions wait on the server until the admin approves them. Approved ones ("checked by the C&B team")
     are served before the AI is asked again, and the deploy build copies them into data/bank.js so they get recorded audio.
     The list from the server is cached on the phone; the built-in copy covers a phone that has never fetched it. */
  var BANK_KEY = "cbChinese.bank1", bankBusy = null;
  function aiOn() { return !!(window.AI && AI.configured()); }
  function bankCache() { try { var c = JSON.parse(localStorage.getItem(BANK_KEY) || "null"); return c && Array.isArray(c.rows) ? c : null; } catch (e) { return null; } }
  function bankAll() {
    var c = bankCache(), src = c ? c.rows : window.CB_BANK && Array.isArray(CB_BANK.rows) ? CB_BANK.rows : [], seen = {}, out = [];
    src.forEach(function (r) { if (r && r.id > 0 && r.data && typeof r.data === "object" && !seen[r.id]) { seen[r.id] = 1; out.push(r); } });
    return out;
  }
  function bankRefresh(force) {
    var c = bankCache();
    if (bankBusy || !aiOn() || navigator.onLine === false || (!force && c && Date.now() - c.at < 6 * 36e5)) return bankBusy || Promise.resolve(false);
    bankBusy = AI.call("bank_get", {}).then(function (r) {
      bankBusy = null; if (!r.ok || !Array.isArray(r.result.rows)) return false;
      try { localStorage.setItem(BANK_KEY, JSON.stringify({ at: Date.now(), rows: r.result.rows })); } catch (e) { /* storage full: keep the old copy */ }
      return true;
    });
    return bankBusy;
  }
  function bankUnseen(fn) { var seen = {}; (Store.state.bankSeen || []).forEach(function (id) { seen[id] = 1; }); return bankAll().filter(function (r) { return fn(r) && !seen[r.id]; }); }
  function bankMark(rows) { var a = Store.state.bankSeen || (Store.state.bankSeen = []); rows.forEach(function (r) { if (a.indexOf(r.id) < 0) a.push(r.id); }); if (a.length > 2000) a.splice(0, a.length - 2000); Store.save(); }
  /* one bank row or AI item → the same shape as a mock item, so it is shown exactly like the real exam part */
  function lxOf(part, d, id) {
    if (part === "L1") return { kind: "tf", skill: "listen-tf", it: { id: "L1-" + id, audio: { text: d.text, voice: "F" }, statement: d.statement, answer: d.answer === true || d.answer === "true", explain: d.explain || "" } };
    return { kind: "dlg", skill: part === "L2" ? "listen-short" : "listen-long", it: { id: part + "-" + id, dialogue: (d.dialogue || []).map(function (l) { return { text: l.zh, voice: l.sp === "男" ? "M" : "F" }; }),
      question: d.question, options: d.options, answer: d.answer, explain: d.explain || "" } };
  }
  function pxOf(d, id) { return (d.questions || []).map(function (q, i) { return { kind: "pass", skill: "passage", passage: d.passage, it: { id: "R3-" + id + "-" + i, q: q.q, options: q.options, answer: q.answer, explain: q.explain || "" } }; }); }
  var AI_NOTE = '<p class="sub ai-made">🧪 Written by AI for practice · not teacher-checked</p>', OK_NOTE = '<p class="sub ai-ok">✓ Checked by the C&amp;B team</p>';
  function bankEntries(r) {
    if (r.kind === "listen") { var x = lxOf(r.part, r.data, "bk" + r.id); return [{ kind: "aix", x: x, key: "bk:" + r.id, skill: x.skill, statsOnly: true, checked: true }]; }
    if (r.kind === "passage") return pxOf(r.data, "bk" + r.id).map(function (x, i) { return { kind: "aix", x: x, key: "bk:" + r.id + ":" + i, skill: "passage", statsOnly: true, checked: true }; });
    return [{ kind: "aiq", qk: r.kind, q: r.data, key: "bk:" + r.id, skill: r.kind === "order" ? "word-order" : "fill-word", statsOnly: true, checked: true }];
  }
  /* the words she keeps missing (lapses in review, more wrong than right), topped up with exam words she hasn't started */
  function weakWordList(n) {
    var S0 = Store.state.srs, out = Object.keys(S0).filter(function (id) { var c = S0[id]; return WORDMAP[id] && !/^h5-/.test(id) && ((c.lapses || 0) > 0 || c.wrong > c.right); })
      .sort(function (a, b) { return (S0[b].lapses || 0) - (S0[a].lapses || 0) || S0[b].wrong - S0[a].wrong; }).slice(0, n).map(function (id) { return WORDMAP[id].hanzi; });
    if (out.length < n) examFresh(n - out.length).forEach(function (w) { if (out.indexOf(w.hanzi) < 0) out.push(w.hanzi); });
    return out;
  }
  /* A small stock of AI questions fetched while online, so "New questions" also works offline (and opens instantly).
     At most 2 AI calls each 12 hours: the weakest listening part and one reading passage. Used after the bank, before a live call. */
  var AIQ_KEY = "cbChinese.aiq1";
  function aiqAll() { try { var o = JSON.parse(localStorage.getItem(AIQ_KEY) || "null"); return o && typeof o === "object" && o.k ? o : { at: 0, k: {} }; } catch (e) { return { at: 0, k: {} }; } }
  function aiqSave(o) { try { localStorage.setItem(AIQ_KEY, JSON.stringify(o)); } catch (e) { /* full: no stock */ } }
  function aiqStock(k) { var a = aiqAll().k[k]; return Array.isArray(a) ? a.length : 0; }
  function aiqTake(k) { var o = aiqAll(), a = o.k[k] || [], got = a.shift() || null; o.k[k] = a; aiqSave(o); return got; }
  function aiqFill() {
    var o = aiqAll();
    if (!aiOn() || navigator.onLine === false || Date.now() - (o.at || 0) < 12 * 36e5) return;
    o.at = Date.now(); aiqSave(o);
    var words = weakWordList(8), lk = weakListenPart(), jobs = [];
    if (aiqStock(lk) < 1) jobs.push(["listen", lk, { part: lk, words: words }]);
    if (aiqStock("R3") < 1) jobs.push(["passage", "R3", { words: words }]);
    jobs.forEach(function (j) {
      AI.call(j[0], j[2]).then(function (r) {
        if (!r.ok) return;
        var x = aiqAll(), a = x.k[j[1]] || (x.k[j[1]] = []);
        a.push({ res: r.result, words: j[0] === "passage" ? r.result.used_words : null }); if (a.length > 3) a.shift(); aiqSave(x);
      });
    });
  }
  var NEW_PARTS = { L1: "Listening part 1 · true or false", L2: "Listening part 2 · short dialogues", L3: "Listening part 3 · longer dialogues", R3: "Reading part 3 · a passage from your weak words" };
  function weakListenPart() { var w = weakParts().filter(function (p) { return /^L/.test(p.k); })[0]; return w ? w.k : "L2"; }
  function newQAvail(k) { return aiOn() || aiqStock(k) > 0 || bankUnseen(function (r) { return k === "R3" ? r.kind === "passage" : r.kind === "listen" && r.part === k; }).length > 0; }
  /* #/newq/L1|L2|L3|R3: new questions in the exam format: team-checked ones from the bank first, otherwise the AI writes them */
  function viewNewQ(k) {
    if (!NEW_PARTS[k]) { location.replace("#/newq/" + weakListenPart()); return; }
    var read = k === "R3", need = read ? 1 : 2, myHash = location.hash; // 2+ checked listening questions are enough for a round, so no AI call
    var bank = bankUnseen(function (r) { return read ? r.kind === "passage" : r.kind === "listen" && r.part === k; }).slice(0, read ? 1 : 3);
    var head = '<div class="ghead"><a class="pill" href="#/parts">✕</a><b>' + (read ? "📖 " : "🎧 ") + esc(NEW_PARTS[k]) + "</b></div>";
    function go(entries, words) {
      if (location.hash !== myHash) return;
      if (words && words.length && entries[0]) entries[0].note = '<p class="sub">Built from words you keep missing: <span class="zh">' + esc(words.join("、")) + "</span></p>";
      runMistakeDrill("all", { items: entries, title: read ? "New reading passage" : "New listening · " + PART_NAME[k], icon: read ? "📖" : "🎧", exit: "#/parts", again: "#/newq/" + k, againFn: function () { viewNewQ(k); } });
    }
    function fromBank() { bankMark(bank); return [].concat.apply([], bank.map(bankEntries)); }
    function fromAI(res, words) {
      var stamp = Date.now().toString(36), entries = read ? pxOf(res, "ai" + stamp).map(function (x, i) { return { kind: "aix", x: x, key: "ai:" + stamp + ":" + i, skill: "passage", statsOnly: true }; })
        : res.items.map(function (d, i) { var x = lxOf(k, d, "ai" + stamp + i); return { kind: "aix", x: x, key: "ai:" + stamp + ":" + i, skill: x.skill, statsOnly: true }; });
      go(bank.length ? fromBank().concat(entries).slice(0, read ? 9 : 3) : entries, words);
      setTimeout(aiqFill, 1500); // top the stock up for next time
    }
    if (bank.length >= need) { go(fromBank()); return; }
    var stock = aiqTake(k); if (stock && stock.res) { fromAI(stock.res, stock.words); return; }
    if (navigator.onLine === false) {
      if (bank.length) { go(fromBank()); return; }
      render(head + '<section class="card"><p class="sub">You are offline and the new questions saved on this phone are used up. Connect once and new ones are fetched for you.</p><a class="btn primary" href="#/parts">Exam parts</a></section>', "games"); return;
    }
    if (!aiOn()) {
      if (bank.length) { go(fromBank()); return; }
      render(head + '<section class="card"><p class="sub">New questions need the AI assistant (Me → More settings → AI assistant). Your exam parts still work without it.</p><a class="btn primary" href="#/parts">Exam parts</a></section>', "games"); return;
    }
    var words = weakWordList(8);
    render(head + '<section class="card"><div class="ai-card ai-wait">✨ Writing new ' + (read ? "reading" : "listening") + " questions for you…</div></section>", "games");
    AI.call(read ? "passage" : "listen", read ? { words: words } : { part: k, words: words }).then(function (res) {
      if (location.hash !== myHash) return;
      if (!res.ok) {
        if (bank.length) { go(fromBank()); return; }
        render(head + '<section class="card"><div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + '</div><div class="actions"><button class="btn primary" id="nq-again">Try again</button><a class="btn" href="#/parts">Back</a></div></section>', "games");
        document.getElementById("nq-again").onclick = function () { viewNewQ(k); }; return;
      }
      fromAI(res.result, read ? res.result.used_words : null);
    });
  }
  function newQSection() {
    bankRefresh(); setTimeout(aiqFill, 2500); // keep a few questions on the phone for offline use
    var rows = ["L1", "L2", "L3", "R3"].filter(newQAvail);
    if (!rows.length) return "";
    return '<section class="card"><h3>✨ New questions, never seen before</h3><p class="sub">In the real exam format and built around your weak words. Questions checked by the C&amp;B team come first; otherwise the AI writes them.</p><div class="glist">' +
      rows.map(function (k) { return '<a class="grow" href="#/newq/' + k + '"><span class="g-txt"><b>' + esc(NEW_PARTS[k]) + "</b><small>" + (k === "R3" ? "1 passage · 2–3 questions" : "3 questions") + '</small></span><span class="tr-go">›</span></a>'; }).join("") + "</div></section>";
  }

  /* ---------- mistake patterns (AI) ----------
     Sends the open mistakes as text (question + the right answer; the app does not keep what was chosen) and gets back
     groups that share one cause, each with the rule, a tip and a button to practise exactly those items. */
  var PAT = null;
  function mistakeText(e) {
    var x, it, w, q, qq;
    try {
      if (e.kind === "mock") { x = findMockItem(e.mock, e.item); if (!x) return null; it = x.it;
        q = (x.kind === "pass" ? x.passage.slice(0, 60) + "… " : x.kind === "tf" ? "(heard: " + it.audio.text + ") " : x.kind === "dlg" ? "(dialogue: " + it.dialogue.map(function (l) { return l.text; }).join(" / ") + ") " : "") + promptOf(x);
        return { q: q, correct: x.kind === "tf" ? (it.answer ? "true" : "false") : x.kind === "order" ? it.answer : x.kind === "write" ? it.sample : it.parts ? ORDERS[it.answer] : it.options ? String(it.options[it.answer]) : "" }; }
      if (e.kind === "quiz") { qq = DAYMAP[e.day] && DAYMAP[e.day].quiz && DAYMAP[e.day].quiz[e.idx]; return qq ? { q: qq.q, correct: String(qq.options[qq.answer] && (qq.options[qq.answer].zh || qq.options[qq.answer])) } : null; }
      if (e.kind === "gram") { qq = GRAMMAP()[e.g] && GRAMMAP()[e.g].quiz[e.i]; return qq ? { q: qq.q, correct: String(qq.options[qq.answer]) } : null; }
      if (e.kind === "order") return { q: e.parts.join(" / "), correct: e.core + (e.end || "") };
      if (e.kind === "word") { w = WORDMAP[e.id]; return w ? { q: "word " + w.hanzi + " (" + (e.skill === "pinyin" ? "pinyin" : "meaning") + ")", correct: w.pinyin + " = " + (w.en || w.vi || "") } : null; }
      if (e.kind === "drill") { it = Games._drillItem(e.d, e.id); if (!it) return null;
        return { q: it.q || (it.parts ? ["A", "B", "C"].map(function (k) { return k + ". " + it.parts[k]; }).join(" ") : it.word || ""), correct: it.options ? String(it.options[it.answer]) : String(it.answer || (it.samples && it.samples[0] && it.samples[0].zh) || "") }; }
    } catch (err) { return null; }
    return null;
  }
  function patternBox() {
    if (!aiOn() || Learn.count() < 3) return "";
    return '<section class="card" id="pat-box"><h2>🔍 Mistake patterns</h2><p class="sub">AI looks at your open mistakes and groups the ones that have the same cause, so you fix the rule once instead of each question.</p>' +
      '<div id="pat-out">' + (PAT ? patHTML() : '<button class="btn primary" id="pat-go">Find my patterns</button>') + "</div></section>";
  }
  function patHTML() {
    return PAT.groups.map(function (g, i) {
      return '<div class="pat-g"><h3 class="zh-mix">' + esc(g.title) + " <small>· " + plural(g.items.length, "mistake") + "</small></h3>" + (g.explain ? "<p>" + esc(g.explain) + "</p>" : "") + (g.tip ? '<p class="sub">💡 ' + esc(g.tip) + "</p>" : "") +
        '<button class="btn small primary" data-pg="' + i + '">Practise these ' + g.items.length + " ▶</button></div>";
    }).join("") + '<p class="sub ai-made">🧪 Grouped by AI · check the rule if it looks odd</p><button class="btn small" id="pat-go">↻ Look again</button>';
  }
  function wirePatterns() {
    var box = document.getElementById("pat-box"); if (!box) return;
    box.onclick = function (ev) {
      var pg = ev.target.closest("[data-pg]"), go = ev.target.closest("#pat-go");
      if (pg && PAT) { var g = PAT.groups[+pg.getAttribute("data-pg")], items = g.items.map(function (i) { return PAT.entries[i]; }).filter(function (e) { return e && Store.state.mistakes[e.key]; });
        if (!items.length) { UI.toast("Those are already fixed 🎉", "✅"); return; }
        runMistakeDrill("all", { items: items, title: g.title, icon: "🔍", exit: "#/mistakes", again: "#/mistakes", againFn: function () { viewMistakes(); } }); return; }
      if (!go) return;
      var list = Learn.list().sort(function (a, b) { return (b.wrong || 0) - (a.wrong || 0) || String(b.last || "").localeCompare(String(a.last || "")); }), entries = [], ms = [];
      list.forEach(function (e) { if (ms.length >= 25) return; var t = mistakeText(e); if (t && t.q && t.correct) { entries.push(e); ms.push({ skill: tipSkillName(e.skill), q: t.q.slice(0, 160), correct: t.correct.slice(0, 80) }); } });
      if (ms.length < 3) { UI.toast("Answer a few more questions first", "📒"); return; }
      var out = document.getElementById("pat-out"); out.innerHTML = '<div class="ai-card ai-wait">🔍 Looking for patterns in ' + ms.length + " mistakes…</div>";
      AI.call("patterns", { mistakes: ms }).then(function (r) {
        var o = document.getElementById("pat-out"); if (!o) return;
        if (!r.ok) { o.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(r.error)) + '</div><button class="btn small" id="pat-go">Try again</button>'; return; }
        PAT = { groups: r.result.groups, entries: entries }; o.innerHTML = patHTML();
      });
    };
  }

  function viewMockList() {
    var s = Store.state;
    var html = '<section class="card"><h2>Mock HSK 4 Exams</h2><p class="sub">Original questions in the real exam format. The shorter tests are about 40% of the real length (~30 minutes); a <b>full-length</b> test has all 100 questions and the real timing (~100 minutes) to train your stamina. Scored /300 like the real test — 180+ is a pass.</p></section>' +
      '<a class="cta card g-violet" href="#/parts"><span class="cta-l"><small>10 questions at the real exam\'s pace</small><b>⏱ Practise one exam part</b><em>' + (weakParts()[0] ? "Weakest: " + esc(weakParts()[0].name) + " · " + weakParts()[0].acc + "%" : "Listening, reading or writing, one part at a time") + '</em></span><span class="cta-go">▶</span></a>';
    if (!MOCK.length) html += '<p class="warn">No mock exams loaded.</p>';
    MOCK.forEach(function (m) {
      var rec = s.mocks[m.id];
      html += '<a class="cta card' + (rec && rec.best >= 180 ? " g-teal" : " g-blue") + '" href="#/mock/' + m.id + '">' +
        '<span class="cta-l">' + (m.full ? "<small>Full length · 100 questions · ~100 min</small>" : "") + '<b>' + esc(m.title) + '</b><em>' + (rec ? "Best " + num(rec.best) + "/300 (" + num(rec.plays) + " attempt" + (rec.plays > 1 ? "s" : "") + ")" + (rec.best >= 180 ? " · Pass ✓" : "") + " · Repeat: a retake counts less" : "New · not attempted yet") + "</em></span><span class=\"cta-go\">▶</span></a>";
    });
    html += '<a class="cta card g-blue" href="#/official"><span class="cta-l"><small>Done an official paper?</small><b>📄 Log your official score</b><em>Improves your score forecast</em></span><span class="cta-go">▶</span></a>';
    html += '<section class="card"><h2>More practice</h2><p class="sub">Want the real official questions too? These are legitimate free resources:</p>' +
      RESOURCES.map(function (r) { return '<a class="res-link" href="' + esc(r.url) + '" target="_blank" rel="noopener"><span class="cta-l"><b>' + esc(r.name) + "</b></span><span class=\"cta-go\">↗</span></a>"; }).join("") + "</section>";
    render(html, "mock");
  }

  function viewMockIntro(idStr) {
    var id = parseInt(idStr, 10), m = MOCKMAP[id];
    if (!m) { render('<p class="warn">Mock test not found.</p>'); return; }
    clearExamTimer(); EXAM = null;
    var lc = m.listening.p1.length + m.listening.p2.length + m.listening.p3.length;
    var rc = m.reading.p1.length + m.reading.p2.length + m.reading.p3.reduce(function (s, p) { return s + p.questions.length; }, 0);
    var wc = m.writing.p1.length + m.writing.p2.length;
    var html = '<section class="card g-blue"><h2>' + esc(m.title) + '</h2>' +
      '<div class="exam-secs">' +
      '<div class="exam-sec"><b>🎧 Listening</b><span>' + lc + ' questions · ~' + Math.round(m.listening.time / 60) + ' min</span></div>' +
      '<div class="exam-sec"><b>📖 Reading</b><span>' + rc + ' questions · ~' + Math.round(m.reading.time / 60) + ' min</span></div>' +
      '<div class="exam-sec"><b>✍️ Writing</b><span>' + wc + ' questions · ~' + Math.round(m.writing.time / 60) + ' min</span></div></div>' +
      (m.checked === false ? '<p class="h5-note" role="note">⚑ This test is new and not yet checked by a teacher. Use the flag button to report mistakes.</p>' : "") +
      ((Store.state.mocks[id] || {}).plays > 0 ? '<p class="rep-note"><b>Repeat</b> — you have seen these questions, so this score counts less in your forecast.</p>' : "") +
      '<p class="sub">' + (m.full ? "Full length: the same number of questions, parts and timing as the real HSK 4 (100 questions, ~100 minutes). Tip: do it in one sitting, in exam mode." : "Real HSK 4 has 100 questions over ~105 minutes, scored /300 (pass 180). This shortened mock keeps the same format, item types and proportions.") + "</p></section>" +
      '<button class="btn primary big" id="m-practice">📝 Practice mode</button><p class="sub center">Instant feedback after each answer, no timer.</p>' +
      '<button class="btn big" id="m-exam" style="margin-top:10px">⏱ Exam mode</button><p class="sub center">Timed per section, no feedback until the end — like the real test. You can leave and come back.</p>' +
      '<button class="btn big sim-btn" id="m-sim" style="margin-top:10px">🎯 Exam simulator</button><p class="sub center">Strict: no pause, leaving ends the attempt, each recording plays once. Use it for your final rehearsals.</p>';
    render(html, "mock");
    document.getElementById("m-practice").onclick = function () { startExam(id, "practice"); };
    document.getElementById("m-exam").onclick = function () { startExam(id, "exam"); };
    document.getElementById("m-sim").onclick = function () { viewSimPreflight(id, m); };
  }

  /* Exam simulator: exam mode plus the pressure of the real thing. Pre-flight screen, no pausing, a recording plays once,
     leaving the exam ends the attempt (see route()), and the tab bar is hidden while it runs. */
  function viewSimPreflight(id, m) {
    var mins = Math.round((m.listening.time + m.reading.time + m.writing.time) / 60);
    render('<section class="card g-blue"><h2>🎯 Exam simulator</h2><p class="sub">' + esc(m.title) + " · about " + mins + " minutes</p>" +
      '<div class="tasks sim-rules"><div class="task"><span class="tk-ico">🎧</span><span>Headphones in, quiet place. Each recording plays <b>once</b>.</span></div>' +
      '<div class="task"><span class="tk-ico">⏱</span><span>Each section has its own timer. <b>No pause</b>; when time is up you move on.</span></div>' +
      '<div class="task"><span class="tk-ico">🚫</span><span>No feedback until the end. <b>Leaving ends the attempt</b> (swipe-back too).</span></div>' +
      '<div class="task"><span class="tk-ico">📵</span><span>Silence notifications. Do not look anything up.</span></div></div></section>' +
      '<button class="btn primary big" id="sim-go">▶ I\'m ready — start</button><a class="btn big" href="#/mock/' + id + '" style="margin-top:10px">Back</a>', "mock");
    document.getElementById("sim-go").onclick = function () { startExam(id, "exam", true); };
  }

  function startExam(id, mode, strict) {
    EXAM = { id: id, test: MOCKMAP[id], mode: mode, strict: !!strict, section: "listening", answers: {}, timer: null, finished: false, result: null, w2t: {}, w2s: {}, w2r: {} };
    location.hash = "#/mock/" + id + "/listening";
  }

  function timerHTML(sec) { return '<div class="exam-timer"><span id="exam-timer">⏱ ' + fmtTime(sec) + '</span> · <span id="exam-count"></span></div>'; }
  function practiceBar() { return '<div class="exam-timer practice"><span>📝 Practice</span> · <span id="exam-count"></span></div>'; }
  function sectionIds(m, sec) {
    return mockItems(m).filter(function (x) { return x.it.id.charAt(0) === sec.charAt(0).toUpperCase(); }).map(function (x) { return x.it.id; });
  }
  function updateCount() {
    var el = document.getElementById("exam-count"); if (!el || !EXAM) return;
    var ids = sectionIds(EXAM.test, EXAM.section), n = ids.filter(function (id) { return EXAM.answers[id] !== undefined; }).length;
    el.textContent = n + "/" + ids.length + " answered";
  }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }

  /* Time left is kept per section, so leaving and coming back resumes the clock instead of resetting it. */
  function startTimer(seconds) {
    clearExamTimer();
    var ex = EXAM, sec = ex.section;
    if (!ex.left) ex.left = {};
    if (ex.left[sec] == null) ex.left[sec] = seconds;
    var end = Date.now() + ex.left[sec] * 1000;
    var me = setInterval(function () {
      if (EXAM !== ex || ex.timer !== me || ex.section !== sec || ex.finished) { clearInterval(me); return; }
      var left = (end - Date.now()) / 1000;
      ex.left[sec] = Math.max(0, left);
      var t = document.getElementById("exam-timer");
      if (t) t.textContent = "⏱ " + fmtTime(left);
      if (left <= 60 && left > 0 && !(ex.warned || (ex.warned = {}))[sec]) {
        ex.warned[sec] = true;
        var blank = sectionIds(ex.test, sec).filter(function (id) { return ex.answers[id] === undefined; }).length;
        if (blank) {
          UI.toast("1 minute left · " + plural(blank, "question") + " unanswered. Pick an answer for each: a wrong answer costs nothing.", "⏰");
          if (t) t.classList.add("warn");
        }
      }
      if (left <= 0) { clearExamTimer(); UI.toast("Time's up for this section", "⏱"); advanceSection(); }
    }, 500);
    ex.timer = me;
  }

