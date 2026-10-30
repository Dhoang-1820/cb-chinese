  /* ---------- exam strategy: one short card per part (shown at the part, in reviews and after a miss) ---------- */
  var PART_TIPS = {
    L1: { en: "Read the statement before the audio starts. Listen for small changes: a different number, time, person, or a 不/没.", vi: "Đọc câu nhận định trước khi nghe. Chú ý chỗ khác nhỏ: số, giờ, người, hoặc 不/没." },
    L2: { en: "Read the 4 options first and guess the topic. The second speaker's reply usually holds the answer.", vi: "Đọc trước 4 đáp án để đoán chủ đề. Câu đáp của người nói thứ hai thường chứa đáp án." },
    L3: { en: "Read the options before each recording. Note numbers, places and reasons as you listen; the answers come in order.", vi: "Đọc đáp án trước mỗi đoạn nghe. Ghi nhanh số, nơi chốn, lý do; đáp án xuất hiện theo thứ tự." },
    R1: { en: "First decide what kind of word the gap needs (verb, noun, adjective), then check the words around it, e.g. 提高 + 水平.", vi: "Xác định chỗ trống cần loại từ gì (động từ, danh từ, tính từ), rồi xem từ đi kèm, ví dụ 提高 + 水平." },
    R2: { en: "The first sentence never starts with 他/她/这/那/但是/所以/因此. Look for pairs: 虽然…但是, 因为…所以, 不但…而且.", vi: "Câu đầu tiên không bắt đầu bằng 他/她/这/那/但是/所以/因此. Tìm cặp: 虽然…但是, 因为…所以, 不但…而且." },
    R2c: { en: "Find the pair: 虽然…但是, 因为…所以, 如果…就, 不但…而且. The other half is already in the sentence.", vi: "Tìm cặp liên từ: 虽然…但是, 因为…所以, 如果…就, 不但…而且. Vế còn lại đã có trong câu." },
    R3: { en: "Read the question first, then find its key word in the passage. About 1 minute a question: if stuck, pick one and move on.", vi: "Đọc câu hỏi trước, rồi tìm từ khóa trong đoạn văn. Khoảng 1 phút một câu: nếu bí, chọn một đáp án rồi làm tiếp." },
    W1: { en: "Build the core first: subject + time + place + verb + object. 把/被 go before the verb, 了 after it, 都/已经/也 before it.", vi: "Xếp lõi trước: chủ ngữ + thời gian + nơi chốn + động từ + tân ngữ. 把/被 trước động từ, 了 sau động từ, 都/已经/也 trước động từ." },
    W2: { en: "Write a short sentence you are sure of: 他正在…, 这个…很…, 我们要…. Use the given word exactly; 8–12 characters is enough.", vi: "Viết câu ngắn mà bạn chắc chắn: 他正在…, 这个…很…, 我们要…. Dùng đúng từ cho sẵn; 8–12 chữ là đủ." }
  };
  /* the part an item belongs to: L1…W2 from its id; a reading part 2 item is ordering (R2) or a linking word (R2c) */
  function partKey(it) { var k = String(it.id || "").split("-")[0]; return k === "R2" && !it.parts ? "R2c" : k; }
  function partTip(k, cls) { var t = PART_TIPS[k]; return t ? '<p class="' + (cls || "ptip") + '"><span aria-hidden="true">💡 </span><b>Exam tip:</b> ' + M(t) + "</p>" : ""; }
  function tipAtPart(k) { return EXAM && EXAM.strict ? "" : partTip(k); } // the simulator stays like the real exam
  function mockOpt(itemId, idx, text, pos) {
    return '<button type="button" class="opt mc" data-item="' + esc(itemId) + '" data-idx="' + idx + '">' +
      '<b>' + LETTERS[pos == null ? idx : pos] + "</b> " + esc(text) + "</button>";
  }
  /* Options are shown in a random order (fixed for the attempt) so the key isn't guessable by position. */
  function mockOpts(it) {
    if (it.parts) return '<div class="ord-opts">' + ORDERS.map(function (o, k) { return '<button type="button" class="opt mc ord" data-item="' + esc(it.id) + '" data-idx="' + k + '">' + o.split("").join(" → ") + "</button>"; }).join("") + "</div>";
    if (EXAM && !EXAM.order) EXAM.order = {};
    var ord = EXAM && EXAM.order[it.id];
    if (!ord) { ord = shuffle(it.options.map(function (_, k) { return k; })); if (EXAM) EXAM.order[it.id] = ord; }
    return ord.map(function (k, pos) { return mockOpt(it.id, k, it.options[k], pos); }).join("");
  }
  function orderOk(it, a) { return a === it.answer || (it.alt || []).indexOf(a) >= 0; }
  function markMC(itemId, chosen, correct, mode) {
    if (!markMC.restoring) markWork();
    var group = document.querySelectorAll('[data-item="' + CSS.escape(itemId) + '"].mc, [data-item="' + CSS.escape(itemId) + '"].tf');
    group.forEach(function (b) {
      var v = b.dataset.idx !== undefined ? +b.dataset.idx : (b.dataset.val === "true");
      b.classList.toggle("picked", v === chosen);
      if (mode === "practice") { b.classList.toggle("good", v === correct); b.classList.toggle("bad", v === chosen && chosen !== correct); b.disabled = true; }
    });
    if (mode === "practice" && chosen === correct && !markMC.restoring) UI.hearts();
    updateCount();
  }

  function renderListeningHTML(m, mode) {
    var L = m.listening, i = 0, html = (mode === "exam" ? timerHTML(L.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Listen, then say whether the statement is True or False</h3>' + tipAtPart("L1");
    L.p1.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + "</div>" + SAY(it.audio.text, it.audio.voice, true) +
        '<p class="statement">' + esc(it.statement) + '</p><div class="tf-btns">' +
        '<button type="button" class="opt tf" data-item="' + esc(it.id) + '" data-val="true">✔ True</button>' +
        '<button type="button" class="opt tf" data-item="' + esc(it.id) + '" data-val="false">✘ False</button></div></div>';
    });
    html += '<h3 class="exam-part">Part 2 · Listen to the dialogue, then answer</h3>' + tipAtPart("L2");
    L.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><button type="button" class="btn small dlg-play" data-dlg="' + esc(it.id) + '">▶ Play dialogue</button>' +
        '<p class="statement">' + esc(it.question) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 3 · Listen to the longer dialogue or passage, then answer</h3>' + tipAtPart("L3");
    L.p3.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + "</div>" + listenHTML(it) +
        '<p class="statement">' + esc(it.question) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    return html;
  }
  function wireListening(m, mode) {
    m.listening.p1.forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].tf').forEach(function (b) {
        b.onclick = function () { var v = b.dataset.val === "true"; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
    m.listening.p2.concat(m.listening.p3).forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].mc').forEach(function (b) {
        b.onclick = function () { var v = +b.dataset.idx; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
    m.listening.p2.concat(m.listening.p3).filter(isDlg).forEach(function (it) {
      var btn = document.querySelector('[data-dlg="' + CSS.escape(it.id) + '"]');
      if (btn) btn.onclick = function () {
        if (!playOnceOk("dlg:" + it.id)) { btn.classList.add("used"); return; }
        if (EXAM && EXAM.strict) btn.classList.add("used");
        Audio2.playAll(it.dialogue, mockRate());
      };
    });
  }

  function renderReadingHTML(m, mode) {
    var R = m.reading, i = 0, html = (mode === "exam" ? timerHTML(R.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Choose the best word for the blank</h3>' + tipAtPart("R1");
    R.p1.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><p class="statement">' + esc(it.sentence) + '</p><div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 2 · ' + (R.p2.length && R.p2[0].parts ? "Put the sentences in the right order" : "Choose the best word for the blank") + "</h3>" + tipAtPart(R.p2.length && R.p2[0].parts ? "R2" : "R2c");
    R.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + "</div>" + sentHTML(it) + '<div class="opts">' + mockOpts(it) + "</div></div>";
    });
    html += '<h3 class="exam-part">Part 3 · Read the passage, then answer</h3>' + tipAtPart("R3");
    R.p3.forEach(function (pg) {
      html += '<div class="card passage"><p>' + linkWords(pg.passage) + "</p></div>";
      pg.questions.forEach(function (q) {
        i++;
        html += '<div class="card q"><div class="qn">' + i + '</div><p class="statement">' + esc(q.q) + '</p><div class="opts">' + mockOpts(q) + "</div></div>";
      });
    });
    return html;
  }
  function wireReading(m, mode) {
    var all = m.reading.p1.concat(m.reading.p2).concat(m.reading.p3.reduce(function (s, p) { return s.concat(p.questions); }, []));
    all.forEach(function (it) {
      document.querySelectorAll('[data-item="' + CSS.escape(it.id) + '"].mc').forEach(function (b) {
        b.onclick = function () { var v = +b.dataset.idx; EXAM.answers[it.id] = v; markMC(it.id, v, it.answer, mode); };
      });
    });
  }

  function renderWritingHTML(m, mode) {
    var W = m.writing, i = 0, html = (mode === "exam" ? timerHTML(W.time) : practiceBar());
    html += '<h3 class="exam-part">Part 1 · Tap the words in the right order</h3>' + tipAtPart("W1");
    W.p1.forEach(function (it) {
      i++;
      html += '<div class="card q" data-w1="' + esc(it.id) + '"><div class="qn">' + i + '</div>' +
        '<div class="wans" id="wans-' + esc(it.id) + '"></div>' +
        '<div class="wpool" id="wpool-' + esc(it.id) + '"></div>' +
        '<button type="button" class="btn small" id="wreset-' + esc(it.id) + '">↺ Reset</button>' +
        (mode === "practice" ? '<span class="w1-check" id="wcheck-' + esc(it.id) + '"></span>' : "") + "</div>";
    });
    html += '<h3 class="exam-part">Part 2 · Write a sentence using the word and scene</h3>' + tipAtPart("W2");
    var ai = w2AI();
    if (ai) html += '<p class="sub w2-note">' + (mode === "exam" ? "🤖 AI scores these sentences out of 5 when you finish, like a real examiner." : "🤖 Tap Check with AI for a score out of 5 and corrections.") + "</p>";
    W.p2.forEach(function (it) {
      i++;
      html += '<div class="card q"><div class="qn">' + i + '</div><p class="w2-scene">' + it.emoji + ' <b class="zh">' + esc(it.word) + '</b></p>' +
        '<textarea class="w2-input" id="w2-' + esc(it.id) + '" rows="2" placeholder="写一个句子…">' + esc((EXAM.w2t || {})[it.id] || "") + "</textarea>" +
        (mode === "practice" && ai ? '<button type="button" class="btn small primary" id="w2ai-' + esc(it.id) + '">🤖 Check with AI</button> ' : "") +
        (mode === "exam" && ai ? "" : '<button type="button" class="btn small" id="w2show-' + esc(it.id) + '">Show a model answer</button>') +
        '<div class="w2-ai" id="w2out-' + esc(it.id) + '"></div><div class="w2-model" id="w2model-' + esc(it.id) + '" hidden></div></div>';
    });
    return html;
  }
  /* Writing part 2 is scored by the AI examiner (0-5 a sentence) when AI is set up; otherwise the learner marks it against the model. */
  function w2AI() { return !!(window.AI && AI.configured()) && navigator.onLine !== false; }
  function w2Item(it) { return { word: it.word, scene: "Picture shown as emoji: " + it.emoji }; }
  function w2Set(it, res) { EXAM.w2s[it.id] = res.result.total; EXAM.w2r[it.id] = res; EXAM.answers[it.id] = res.result.total >= 4 ? 1 : 0; }
  /* timed exam: score every unscored sentence before the result, at most ~30 s; a sentence the AI couldn't score counts 0 */
  function w2GradeAll(done) {
    var items = EXAM.mode === "exam" && w2AI() ? EXAM.test.writing.p2.filter(function (it) { return (EXAM.w2t[it.id] || "").trim() && EXAM.w2s[it.id] == null; }) : [];
    if (!items.length) { done(); return; }
    var ex = EXAM;
    render('<section class="card center w2-wait">' + UI.mascot("think", 72) + "<h2>Scoring your writing…</h2><p class=\"sub\">The AI examiner is checking " + plural(items.length, "sentence") + ". This takes a few seconds.</p></section>", "mock");
    var timeout = new Promise(function (r) { setTimeout(function () { r("timeout"); }, 30000); });
    Promise.race([Promise.all(items.map(function (it) {
      return AI.call("grade", { word: it.word, scene: w2Item(it).scene, sentence: (ex.w2t[it.id] || "").trim().slice(0, 150) }).then(function (res) { if (res && res.ok && ex === EXAM) w2Set(it, res); }, function () {});
    })), timeout]).then(function () { if (ex === EXAM) done(); });
  }
  function w2ResultHTML() {
    var t = EXAM.test; if (!t || !EXAM.w2t) return "";
    var rows = t.writing.p2.filter(function (it) { return (EXAM.w2t[it.id] || "").trim(); });
    if (!rows.length || !(w2AI() || Object.keys(EXAM.w2s).length)) return "";
    return '<section class="card w2-res"><h3>✍️ Writing part 2 · AI scores</h3>' + rows.map(function (it) {
      var res = EXAM.w2r[it.id], sc = EXAM.w2s[it.id];
      return '<details class="w2-row"><summary><span class="zh">' + esc(it.word) + '</span> <b class="w2-sc">' + (sc != null ? sc + "/5" : "not scored") + '</b><span class="zh w2-mine">' + esc(EXAM.w2t[it.id].trim()) + "</span></summary>" +
        (res ? AI._gradeCard(res, EXAM.w2t[it.id]) : '<p class="sub">The AI couldn\'t score this one (offline or busy), so it counted 0. Model: <span class="zh">' + esc(it.sample) + "</span></p>") + "</details>";
    }).join("") + '<p class="sub">Each sentence is out of 5: using the word, grammar and naturalness. Your writing score uses these points.</p></section>';
  }
  function wireWriting(m, mode) {
    if (!EXAM.w1) EXAM.w1 = {};
    m.writing.p1.forEach(function (it) {
      var st = EXAM.w1[it.id] || (EXAM.w1[it.id] = { pool: shuffle(it.tokens), used: [] }), pool = st.pool, used = st.used;
      function refresh() {
        document.getElementById("wans-" + it.id).innerHTML = used.map(function (t) { return '<span class="wtoken used">' + esc(t) + "</span>"; }).join("") || '<span class="wans-ph">Tap words below…</span>';
        document.getElementById("wpool-" + it.id).innerHTML = pool.map(function (t, idx) { return '<button type="button" class="wtoken" data-w="' + idx + '">' + esc(t) + "</button>"; }).join("");
        document.querySelectorAll('#wpool-' + CSS.escape(it.id) + ' .wtoken').forEach(function (b) {
          b.onclick = function () { var idx = +b.dataset.w; used.push(pool[idx]); pool.splice(idx, 1); EXAM.answers[it.id] = used.join(""); markWork(); refresh(); check(); updateCount(); };
        });
      }
      function check() {
        var el = document.getElementById("wcheck-" + it.id);
        if (!el) return;
        if (!pool.length) el.innerHTML = orderOk(it, used.join("")) ? '<span class="good-t">✔ ' + esc(it.answer) + "</span>" : '<span class="bad-t">✘ Correct: ' + esc(it.answer) + "</span>";
        else el.innerHTML = "";
      }
      document.getElementById("wreset-" + it.id).onclick = function () { st.pool = pool = shuffle(it.tokens); st.used = used = []; delete EXAM.answers[it.id]; refresh(); check(); updateCount(); };
      check();
      refresh();
    });
    if (!EXAM.w2t) { EXAM.w2t = {}; EXAM.w2s = {}; EXAM.w2r = {}; }
    var ai = w2AI();
    m.writing.p2.forEach(function (it) {
      var ta = document.getElementById("w2-" + it.id), aib = document.getElementById("w2ai-" + it.id), out = document.getElementById("w2out-" + it.id);
      ta.oninput = function () {
        EXAM.w2t[it.id] = ta.value; markWork();
        if (EXAM.w2s[it.id] != null) { delete EXAM.w2s[it.id]; delete EXAM.w2r[it.id]; delete EXAM.answers[it.id]; out.innerHTML = ""; } // edited after scoring: check again
        if (mode === "exam" && ai) { if (ta.value.trim()) EXAM.answers[it.id] = 0; else delete EXAM.answers[it.id]; } // scored by AI at the end
        updateCount();
      };
      if (aib) aib.onclick = function () {
        var v = ta.value.trim(); if (!v) { UI.toast("Write a sentence first.", "✍️"); return; }
        aib.disabled = true;
        AI.grade(out, w2Item(it), v).then(function (res) {
          aib.disabled = false;
          if (!res || !res.ok || ta.value.trim() !== v) return;
          w2Set(it, res);
          out.insertAdjacentHTML("beforeend", '<p class="sub w2-verdict">' + (res.result.total >= 4 ? "✔ Counts as right" : "✘ Counts as wrong") + " · 4/5 or more counts as right</p>");
          updateCount();
        });
      };
      var sb = document.getElementById("w2show-" + it.id); if (sb) sb.onclick = function () {
        var box = document.getElementById("w2model-" + it.id);
        box.hidden = false;
        box.innerHTML = '<p class="model-t">Model: <span class="zh">' + esc(it.sample) + '</span></p><div class="tf-btns">' +
          '<button type="button" class="btn small good-btn" data-w2ok="' + esc(it.id) + '">I got it ✔</button>' +
          '<button type="button" class="btn small bad-btn" data-w2no="' + esc(it.id) + '">Not quite ✘</button></div>';
        document.querySelector('[data-w2ok="' + CSS.escape(it.id) + '"]').onclick = function () { EXAM.answers[it.id] = 1; box.querySelector(".tf-btns").innerHTML = "<b>Marked ✔</b>"; updateCount(); };
        document.querySelector('[data-w2no="' + CSS.escape(it.id) + '"]').onclick = function () { EXAM.answers[it.id] = 0; box.querySelector(".tf-btns").innerHTML = "<b>Marked ✘</b>"; updateCount(); };
      };
    });
  }

  function viewMockSection(idStr, section) {
    var id = parseInt(idStr, 10);
    if (!EXAM || EXAM.id !== id || EXAM.finished || SEC_ORDER.indexOf(section) < 0) { location.replace("#/mock/" + idStr); return; }
    if (SEC_ORDER.indexOf(section) < SEC_ORDER.indexOf(EXAM.section)) { location.replace("#/mock/" + id + "/" + EXAM.section); return; } // finished sections stay closed
    if (EXAM.mode === "exam" && EXAM.left && EXAM.left[section] === 0) { advanceSection(); return; }
    EXAM.section = section;
    if (EXAM.strict) document.body.classList.add("sim");
    if (section === "listening") Audio2.noise(Store.state.settings.noise);
    var m = EXAM.test, mode = EXAM.mode;
    var body = section === "listening" ? renderListeningHTML(m, mode) : section === "reading" ? renderReadingHTML(m, mode) : renderWritingHTML(m, mode);
    var isLast = section === SEC_ORDER[SEC_ORDER.length - 1];
    var html = '<section class="card exam-head"><b>' + esc(m.title) + "</b><span>" + SEC_LABEL[section] + "</span></section>" + body +
      '<button class="btn primary big" id="m-next">' + (isLast ? "✅ Finish exam" : "Next section ▶") + "</button>";
    render(html, "mock");
    if (section === "listening") {
      wireListening(m, mode);
      m.listening.p1.concat(m.listening.p2, m.listening.p3).forEach(function (it) {
        if (isDlg(it)) it.dialogue.forEach(function (l) { Audio2.prefetch(l.text, l.voice); }); else Audio2.prefetch(it.audio.text, it.audio.voice);
      });
    } else if (section === "reading") wireReading(m, mode); else wireWriting(m, mode);
    markMC.restoring = true;
    mockItems(m).forEach(function (x) { // restore earlier picks after a re-render
      var a = EXAM.answers[x.it.id];
      if (a !== undefined && (x.kind === "tf" || x.kind === "dlg" || x.kind === "aud" || x.kind === "sent" || x.kind === "pass")) markMC(x.it.id, a, x.it.answer, mode);
    });
    markMC.restoring = false;
    document.getElementById("m-next").onclick = function () {
      var ids = sectionIds(m, section), left = ids.filter(function (id) { return EXAM.answers[id] === undefined; }).length;
      if (left && !window.confirm(left + " question" + (left > 1 ? "s are" : " is") + " unanswered. " + (isLast ? "Finish the exam anyway?" : "Go to the next section anyway?"))) return;
      clearExamTimer(); advanceSection();
    };
    updateCount();
    if (mode === "exam") startTimer(m[section].time);
  }

  function recordPace(sec) {
    var ex = EXAM, m = ex.test, pace = ex.pace || (ex.pace = {}), b = {};
    mockItems(m).forEach(function (x) { if (sectionOf(x.it) === sec && ex.answers[x.it.id] === undefined && !(x.kind === "write" && (ex.w2t[x.it.id] || "").trim())) { var k = partKey(x.it); b[k] = (b[k] || 0) + 1; } });
    var left = ex.left && ex.left[sec] != null ? ex.left[sec] : null;
    pace[sec] = { t: m[sec].time, u: left == null ? null : Math.round(m[sec].time - left), o: left != null && left <= 0.5 ? 1 : 0, b: b };
  }
  function sectionOf(it) { var c = String(it.id || "").charAt(0); return c === "L" ? "listening" : c === "R" ? "reading" : "writing"; }
  function advanceSection() {
    if (!EXAM || EXAM.finished) return;
    if (!EXAM.grading) recordPace(EXAM.section);
    var idx = SEC_ORDER.indexOf(EXAM.section);
    if (idx < SEC_ORDER.length - 1) location.hash = "#/mock/" + EXAM.id + "/" + SEC_ORDER[idx + 1];
    else finishExam();
  }

  function scoreExam() {
    var t = EXAM.test, ans = EXAM.answers;
    function tally(items, get) { var c = 0; items.forEach(function (it) { if (get(it)) c++; }); return c; }
    var lt = t.listening.p1.length + t.listening.p2.length + t.listening.p3.length;
    var lc = tally(t.listening.p1, function (it) { return ans[it.id] === it.answer; }) +
      tally(t.listening.p2, function (it) { return ans[it.id] === it.answer; }) +
      tally(t.listening.p3, function (it) { return ans[it.id] === it.answer; });
    var rItems = t.reading.p1.concat(t.reading.p2).concat(t.reading.p3.reduce(function (s, p) { return s.concat(p.questions); }, []));
    var rt = rItems.length, rc = tally(rItems, function (it) { return ans[it.id] === it.answer; });
    var wt = t.writing.p1.length + t.writing.p2.length;
    var wc = tally(t.writing.p1, function (it) { return orderOk(it, ans[it.id]); }) + t.writing.p2.reduce(function (sum, it) { var sc = (EXAM.w2s || {})[it.id]; return sum + (sc != null ? sc / 5 : ans[it.id] === 1 ? 1 : 0); }, 0);
    wc = Math.round(wc * 10) / 10;
    var lS = Math.round(lc / lt * 100), rS = Math.round(rc / rt * 100), wS = Math.round(wc / wt * 100);
    return { listening: { score: lS, correct: lc, total: lt }, reading: { score: rS, correct: rc, total: rt }, writing: { score: wS, correct: wc, total: wt }, total: lS + rS + wS, pass: (lS + rS + wS) >= 180 };
  }

  var MOCK_SKILL = { L1: "listen-tf", L2: "listen-short", L3: "listen-long", R1: "fill-word", R2: "connectors", R3: "passage", W1: "word-order", W2: "writing" };
  function mockItems(m) {
    var out = [];
    m.listening.p1.forEach(function (it) { out.push({ it: it, kind: "tf" }); });
    m.listening.p2.forEach(function (it) { out.push({ it: it, kind: "dlg" }); });
    m.listening.p3.forEach(function (it) { out.push({ it: it, kind: isDlg(it) ? "dlg" : "aud" }); });
    m.reading.p1.concat(m.reading.p2).forEach(function (it) { out.push({ it: it, kind: "sent" }); });
    m.reading.p3.forEach(function (pg) { pg.questions.forEach(function (q) { out.push({ it: q, kind: "pass", passage: pg.passage }); }); });
    m.writing.p1.forEach(function (it) { out.push({ it: it, kind: "order" }); });
    m.writing.p2.forEach(function (it) { out.push({ it: it, kind: "write" }); });
    out.forEach(function (x) { x.skill = x.it.parts ? "ordering" : MOCK_SKILL[x.it.id.split("-")[0]]; });
    return out;
  }
  function mockCorrect(x, a) { return x.kind === "write" ? a === 1 : x.kind === "order" ? orderOk(x.it, a) : a === x.it.answer; }
  function recordMock() {
    var per = {};
    mockItems(EXAM.test).forEach(function (x) {
      var a = EXAM.answers[x.it.id];
      if (a === undefined) return; // unanswered: not counted as a skill mistake
      var ok = mockCorrect(x, a);
      Learn.record("m:" + EXAM.id + ":" + x.it.id, { kind: "mock", skill: x.skill, mock: EXAM.id, item: x.it.id }, ok);
      var p = per[x.skill] || (per[x.skill] = { r: 0, n: 0 }); p.n++; if (ok) p.r++;
    });
    return per;
  }
  function finishExam() {
    if (!EXAM || EXAM.finished || EXAM.grading) return;
    clearExamTimer();
    if (!EXAM.w2done) { EXAM.grading = true; w2GradeAll(function () { EXAM.grading = false; EXAM.w2done = true; finishExam(); }); return; }
    var result = scoreExam();
    result.skills = recordMock();
    EXAM.result = result; EXAM.finished = true;
    var s = Store.state, rec = s.mocks[EXAM.id] || { best: 0, plays: 0 };
    // rep: this set was seen before (in any mode), so the forecast counts the score less
    var rep = rec.plays > 0 || s.mockHistory.some(function (h) { return h.id === EXAM.id; });
    var ws = EXAM.test.writing.p2.some(function (it) { return EXAM.answers[it.id] !== undefined && EXAM.w2s[it.id] == null; }); // a sentence marked by the learner, not the AI
    s.mockHistory.push({ id: EXAM.id, date: Store.today(), mode: EXAM.mode, strict: !!EXAM.strict, total: result.total,
      sections: { listening: result.listening.score, reading: result.reading.score, writing: result.writing.score }, rep: rep, full: !!EXAM.test.full, ws: ws,
      blank: mockBlanks().n, pace: EXAM.mode === "exam" ? EXAM.pace || null : null });
    EXAM.rep = rep;
    rec.plays = (rec.plays || 0) + 1; rec.lastScore = result.total;
    rec.wrong = mockItems(EXAM.test).filter(function (x) { return !mockCorrect(x, EXAM.answers[x.it.id]); }).map(function (x) {
      var a = EXAM.answers[x.it.id]; return [x.it.id, a === undefined ? null : x.kind === "write" ? String(EXAM.w2t[x.it.id] || "").slice(0, 150) : a];
    }).slice(0, 100); // kept for the review screen: [item id, the learner's answer]
    rec.lastSections = { listening: result.listening.score, reading: result.reading.score, writing: result.writing.score };
    if (result.total > (rec.best || 0)) rec.best = result.total;
    s.mocks[EXAM.id] = rec; Store.save();
    location.hash = "#/mock/" + EXAM.id + "/result";
  }

  var REP_NOTE = '<p class="rep-note"><b>Repeat</b> — you have seen these questions, so this score counts less in your forecast. A new set gives a truer number.</p>';
  function secBar(label, sc) {
    sc = Math.max(0, Math.min(100, num(sc)));
    return '<div class="score-row"><span>' + label + "</span><div class=\"score-bar\"><span style=\"width:" + sc + "%\"></span></div><b>" + sc + "/100</b></div>";
  }
  /* Where the points went: HSK 4 has no minimum per section (only 180/300 overall), so this shows which section costs most. */
  function lostHTML(r) {
    var secs = [["Listening", r.listening.score], ["Reading", r.reading.score], ["Writing", r.writing.score]].map(function (x) { return [x[0], 100 - num(x[1])]; });
    var srt = secs.slice().sort(function (a, b) { return b[1] - a[1]; }), worst = srt[0][1] > srt[1][1] ? srt[0] : null, margin = r.total - 180;
    return '<section class="card lost-card"><h3>Where the points went</h3><div class="lost-row">' + secs.map(function (x) {
      return '<div class="' + (x === worst ? "worst" : "") + '"><b>−' + x[1] + "</b><small>" + x[0] + "</small></div>";
    }).join("") + "</div>" +
      '<p class="sub">' + (margin >= 0 ? "You are " + margin + " points above the pass mark (180)." : "You need " + (-margin) + " more points to pass (180).") +
      (worst ? " The most to gain is in <b>" + worst[0] + "</b>." : "") + " There is no minimum per section: points from any section count the same.</p>" + (EXAM && EXAM.test ? blanksHTML() : "") + "</section>";
  }
  /* questions left empty, and the points they could have earned (each section is /100 over its own questions) */
  function mockBlanks() {
    var t = EXAM.test, out = { n: 0, pts: 0, by: {} };
    mockItems(t).forEach(function (x) {
      var a = EXAM.answers[x.it.id]; if (a !== undefined) return;
      if (x.kind === "write" && (EXAM.w2t[x.it.id] || "").trim()) return;
      var sec = sectionOf(x.it), n = sectionIds(t, sec).length;
      out.n++; out.pts += 100 / n; out.by[sec] = (out.by[sec] || 0) + 1;
    });
    out.pts = Math.round(out.pts);
    return out;
  }
  function blanksHTML() {
    var b = mockBlanks(); if (!b.n) return '<p class="sub good-t">✓ No question left blank.</p>';
    return '<p class="blank-note"><b>' + plural(b.n, "question") + " left blank</b> · up to " + b.pts + " points. There is no penalty for a wrong answer in HSK, so always pick something.</p>";
  }
  /* where the time went: a section that ran out of time with questions left points to that part's timed practice */
  var PART_NAME = { L1: "Listening part 1", L2: "Listening part 2", L3: "Listening part 3", R1: "Reading part 1", R2: "Reading part 2", R2c: "Reading part 2", R3: "Reading part 3", W1: "Writing part 1", W2: "Writing part 2" };
  function paceHTML() {
    var P = EXAM.pace; if (EXAM.mode !== "exam" || !P) return "";
    var rows = ["listening", "reading", "writing"].filter(function (k) { return P[k]; }).map(function (k) {
      var p = P[k], worst = Object.keys(p.b).sort(function (a, b) { return p.b[b] - p.b[a]; })[0], bl = worst ? p.b[worst] : 0;
      var drill = worst ? (worst === "R2c" ? "R1" : worst) : null;
      var tot = Object.keys(p.b).reduce(function (n, x) { return n + p.b[x]; }, 0);
      var note = p.o && bl ? '<span class="bad-t">Time ran out with ' + plural(tot, "question") + " left · most in " + esc(PART_NAME[worst] || worst) + "</span>" + (drill ? ' · <a href="#/parts/' + drill + '">practise it timed ›</a>' : "")
        : p.o ? "Used all the time" : p.u != null ? fmtTime(p.t - p.u) + " to spare" : "";
      return '<div class="pace-row"><b>' + SEC_LABEL[k] + "</b><span>" + (p.u != null ? fmtTime(p.u) + " of " + fmtTime(p.t) : "") + "</span><small>" + note + "</small></div>";
    });
    return rows.length ? '<section class="card pace-card"><h3>Your pace</h3>' + rows.join("") + "</section>" : "";
  }
  function reviewBtn(id) {
    var w = ((Store.state.mocks[id] || {}).wrong || []).length;
    return w ? '<a class="btn big rev-btn" href="#/mock/' + id + '/review" style="margin-bottom:10px">🔍 Review ' + plural(w, "mistake") + " with explanations</a>" : "";
  }
  /* answer as the learner saw it: option text, True/False, an order like B → A → C, or the sentence they built */
  function ansText(x, a) {
    var it = x.it; if (a === null || a === undefined || a === "") return "—";
    if (x.kind === "tf") return a === true || a === "true" ? "True" : "False";
    if (x.kind === "order" || x.kind === "write") return String(a);
    if (it.parts) return (ORDERS[a] || "").split("").join(" → ");
    return it.options && it.options[a] != null ? String(it.options[a]) : String(a);
  }
  function rightText(x) {
    var it = x.it;
    if (x.kind === "tf") return it.answer ? "True" : "False";
    if (x.kind === "order") return it.answer;
    if (x.kind === "write") return it.sample;
    if (it.parts) return (it.orderKey || ORDERS[it.answer] || "").split("").join(" → ");
    return String(it.options[it.answer]);
  }
  function scriptOf(x) { var it = x.it; return x.kind === "tf" || x.kind === "aud" ? it.audio.text : x.kind === "dlg" ? it.dialogue.map(function (l) { return l.text; }).join(" / ") : ""; }
  function promptOf(x) {
    var it = x.it;
    if (x.kind === "tf") return it.statement;
    if (x.kind === "dlg" || x.kind === "aud") return it.question;
    if (x.kind === "pass") return it.q;
    if (x.kind === "order") return it.tokens.join(" / ");
    if (x.kind === "write") return it.emoji + " " + it.word;
    if (it.parts) return ["A", "B", "C"].map(function (k) { return k + ". " + it.parts[k]; }).join("  ");
    return it.sentence || it.q || "";
  }
  function SIM_OK(x) { return (x.kind === "sent" && !x.it.parts && x.it.options) || x.kind === "order"; }
  function simPayload(x) {
    var it = x.it;
    return x.kind === "order" ? { kind: "order", sentence: it.tokens.join(" / "), answer: it.answer }
      : { kind: "fill", sentence: it.sentence || "", options: it.options.map(String), answer: String(it.options[it.answer]) };
  }
  var SEC_ICON = { L: "🎧 Listening", R: "📖 Reading", W: "✍️ Writing" };
  /* Review after a mock: every wrong or skipped question with what was played or read, the learner's answer, the key,
     and "Why?" from the AI (the app's key is treated as the truth). Works for the last attempt of each set. */
  function viewMockReview(idStr) {
    var id = parseInt(idStr, 10), m = MOCKMAP[id], rec = Store.state.mocks[id] || {};
    if (!m) { location.replace("#/mock"); return; }
    var list = (rec.wrong || []).map(function (w) { var x = findMockItem(id, w[0]); return x ? { x: x, a: w[1] } : null; }).filter(Boolean);
    if (!list.length) { render('<section class="card"><h2>🔍 Review</h2><p class="sub">No mistakes saved for this test. Take it to see a review here.</p><a class="btn" href="#/mock/' + id + '">' + esc(m.title) + "</a></section>", "mock"); return; }
    var ai = !!(window.AI && AI.available()), sec = "";
    var html = '<section class="card g-coral"><h2>🔍 ' + plural(list.length, "mistake") + " to review</h2><p class=\"sub\">" + esc(m.title) + " · your last attempt. Read what you missed, then practise them again." + (ai ? " Tap 🤖 Why? for an explanation." : "") + "</p>" +
      '<button type="button" class="btn primary" id="rv-drill">▶ Practise these ' + list.length + "</button></section>";
    list.forEach(function (r, k) {
      var x = r.x, it = x.it, s0 = SEC_ICON[it.id.charAt(0)] || "";
      if (s0 !== sec) { sec = s0; html += '<h3 class="sec">' + s0 + "</h3>"; }
      var sc = scriptOf(x);
      html += '<section class="card rv-item" id="rv-' + k + '"><p class="sub">' + skillName(x.skill) + "</p>" +
        (sc ? '<p class="script zh">🎧 ' + esc(sc) + SAY(sc, it.audio ? it.audio.voice : undefined) + "</p>" : "") +
        (x.kind === "pass" ? '<details class="rv-pass"><summary>Show the passage</summary><div class="passage-in zh">' + linkWords(x.passage) + "</div></details>" : "") +
        '<p class="q zh">' + esc(promptOf(x)) + "</p>" +
        '<p class="rv-a bad-t">✘ Yours: <span class="zh">' + esc(ansText(x, r.a)) + "</span></p>" +
        '<p class="rv-a good-t">✔ ' + (x.kind === "write" ? "Model" : "Right") + ': <span class="zh">' + esc(rightText(x)) + "</span></p>" + partTip(partKey(it), "ptip rv-tip") +
        (SIM_OK(x) && ai ? '<button type="button" class="btn small" data-sim="' + k + '">🧪 3 new questions like this</button>' : "") +
        (ai && x.kind !== "write" ? '<button type="button" class="btn small ai-btn" data-why="' + k + '">🤖 Why?</button><div class="ai-out" id="rv-out-' + k + '"></div>' : "") + "</section>";
    });
    render(html + '<a class="btn big" href="#/mock/' + id + '/result">‹ Back to the result</a>', "mock");
    document.getElementById("rv-drill").onclick = function () {
      var items = list.map(function (r) { return { kind: "mock", skill: r.x.skill, mock: id, item: r.x.it.id, key: "m:" + id + ":" + r.x.it.id }; });
      runMistakeDrill("all", { items: items, title: "Mock " + id + " mistakes", icon: "🔍", exit: "#/mock/" + id + "/review" });
    };
    [].forEach.call(document.querySelectorAll("[data-sim]"), function (b) {
      b.onclick = function () {
        var r = list[+b.getAttribute("data-sim")], x = r.x, src = String(simPayload(x).sentence || "").trim().slice(0, 120);
        var ok3 = bankUnseen(function (bq) { return (bq.kind === "fill" || bq.kind === "order") && bq.data.src === src; }).slice(0, 3);
        if (ok3.length >= 2) { bankMark(ok3); runMistakeDrill("all", { items: [].concat.apply([], ok3.map(bankEntries)), title: "New questions like this", icon: "🧪", exit: "#/mock/" + id + "/review" }); return; }
        b.disabled = true; b.textContent = "🧪 Writing 3 new questions…";
        AI.call("similar", simPayload(x)).then(function (res) {
          b.disabled = false; b.textContent = "🧪 3 new questions like this";
          if (!res.ok) { UI.toast(AI.errMsg(res.error), "⚠️"); return; }
          var items = res.result.items.map(function (q, i) { return { kind: "aiq", qk: res.result.kind, q: q, key: "ai:" + x.it.id + ":" + i, skill: x.skill, statsOnly: true }; });
          runMistakeDrill("all", { items: items, title: "3 new questions like this", icon: "🧪", exit: "#/mock/" + id + "/review" });
        });
      };
    });
    [].forEach.call(document.querySelectorAll("[data-why]"), function (b) {
      b.onclick = function () {
        var r = list[+b.getAttribute("data-why")], x = r.x, it = x.it, out = document.getElementById("rv-out-" + b.getAttribute("data-why"));
        var q = (x.kind === "pass" ? x.passage + " | " : "") + promptOf(x);
        var opts = x.kind === "tf" ? ["True", "False"] : it.parts ? ORDERS.map(function (o) { return o.split("").join(" → "); }) : it.options ? it.options.map(String) : [];
        b.disabled = true; out.innerHTML = '<div class="ai-card ai-wait">🤖 Thinking…</div>';
        AI.call("explain", { skill: x.skill, question: q.slice(-400), options: opts, chosen: r.a == null ? "" : ansText(x, r.a), correct: rightText(x), extra: scriptOf(x).slice(0, 300) }).then(function (res) {
          b.disabled = false;
          if (!res.ok) { out.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"; return; }
          b.hidden = true; out.innerHTML = AI._explainCard(res);
        });
      };
    });
  }
  function viewMockResult(idStr) {
    var id = parseInt(idStr, 10);
    if (!EXAM || EXAM.id !== id || !EXAM.finished) {
      var rec = Store.state.mocks[id];
      if (!rec) { location.replace("#/mock/" + idStr); return; }
      render('<section class="card ' + (rec.best >= 180 ? "g-teal" : "g-coral") + '"><h2>' + esc((MOCKMAP[id] || {}).title || "Mock test") + '</h2><p class="score-big">' + num(rec.lastScore) + "/300</p>" +
        '<p>' + (rec.lastSections ? secBar("Listening", rec.lastSections.listening) + secBar("Reading", rec.lastSections.reading) + secBar("Writing", rec.lastSections.writing) : "") +
        '</p><p class="sub">Best so far: ' + num(rec.best) + "/300 over " + num(rec.plays) + " attempt" + (rec.plays > 1 ? "s" : "") + '.</p>' + (rec.plays > 1 ? REP_NOTE : "") + "</section>" +
        reviewBtn(id) + '<a class="btn primary big" href="#/mock/' + id + '">Try again</a><a class="btn big" href="#/mock" style="margin-top:10px">All mock exams</a>', "mock");
      return;
    }
    var r = EXAM.result, pass = r.pass;
    var xp = Math.round(r.total / 300 * 40);
    if (!EXAM.awarded) { EXAM.awarded = true; Game.award(xp, { silent: true }); if (pass) UI.confetti(150); }
    var html = '<section class="card ' + (pass ? "g-teal" : "g-coral") + '">' + (pass ? UI.anim("noto-trophy", 84, UI.mascot("cheer", 64)) : UI.mascot("wow", 64)) +
      '<h2>' + (pass ? "Pass! 🎉" : "Keep practicing") + '</h2>' + (EXAM.strict ? '<p><span class="tag t-hsk">🎯 Exam simulator</span></p>' : "") + '<p class="score-big">' + r.total + "/300</p>" +
      "<p>" + secBar("Listening", r.listening.score) + secBar("Reading", r.reading.score) + secBar("Writing", r.writing.score) + "</p>" +
      '<p class="sub">Real HSK 4 passing score is 180/300. +' + xp + " XP earned.</p>" + (EXAM.rep ? REP_NOTE : "") + "</section>" + lostHTML(r) + paceHTML() + w2ResultHTML() + weakHTML(r.skills) + focusCard() +
      reviewBtn(id) + '<a class="btn primary big" href="#/mock/' + id + '">Try again</a><a class="btn big" href="#/mock" style="margin-top:10px">All mock exams</a>';
    render(html, "mock");
  }

