  /* ---------- mock exam ---------- */
  /* MOCK: the HSK 4 sets (score forecast, exam plan, suggestions); MOCK5: the HSK 5 sets (level: 5), listed on their own.
     MOCKMAP holds both, so #/mock/<id> opens either. */
  var MOCK = [], MOCK5 = [], MOCKMAP = {}, EXAM = null;
  function isH5Mock(id) { var m = MOCKMAP[id]; return m ? m.level === 5 : +id >= 100; }
  var RESOURCES = [
    { name: "Study4 HSK 4 practice tests", url: "https://study4.com/tests/hsk-4/" },
    { name: "Official HSK sample papers (Hanban/CTI)", url: "http://www.chinesetest.cn/gosign.do?id=1&lid=0#" }
  ];
  function buildMockIndex() {
    var all = (window.CB_MOCK || []).slice().sort(function (a, b) { return a.id - b.id; });
    MOCK = all.filter(function (m) { return m.level !== 5; }); MOCK5 = all.filter(function (m) { return m.level === 5; });
    MOCKMAP = {}; all.forEach(function (m) {
      MOCKMAP[m.id] = m;
      // sentence-ordering items (full-length reading part 2): answer "BAC" → index into the 6 possible orders
      m.reading.p2.forEach(function (it) { if (it.parts && typeof it.answer === "string") { it.orderKey = it.answer; it.options = ORDERS.slice(); it.answer = ORDERS.indexOf(it.orderKey); } });
    });
    restoreMini();
  }
  /* ---------- 15-minute mini mock (#/mock/mini → #/mock/90) ----------
     Built from the learner's weakest skills, in the normal mock format, so the usual intro, timer, practice/exam modes,
     result and review screens all work. Questions are copies of HSK 4 mock items (ids "L1-3@2" = item L1-3 of mock 2):
     answers go to the notebook under the original mock and item, so a mistake is the same mistake wherever it was made.
     The choice (mock, part, index) is kept on this phone (cbChinese.mini) so result and review still work after a reload.
     A mini mock is not added to the score history: it is built from weak parts on purpose, so it would pull the forecast down. */
  var MINI_ID = 90, MINI_KEY = "cbChinese.mini", MINI_SECS = 900;
  var MINI_PARTS = [["L", "listening", "p1", "listen-tf", 40], ["L", "listening", "p2", "listen-short", 40], ["L", "listening", "p3", "listen-long", 40],
    ["R", "reading", "p1", "fill-word", 60], ["R", "reading", "p2", "connectors", 60], ["R", "reading", "p3", "passage", 60],
    ["W", "writing", "p1", "word-order", 80], ["W", "writing", "p2", "writing", 180]];
  function miniAcc() { var a = {}; Learn.report(3, true).forEach(function (r) { a[r.skill] = r.acc; }); return a; }
  /* The weakest parts, weakest first, with the accuracy used (parts never answered count as 60%). */
  function miniWeak() {
    var acc = miniAcc();
    return MINI_PARTS.map(function (p) { var k = p[3]; return { p: p, acc: acc[k] != null ? acc[k] : 0.6, known: acc[k] != null }; })
      .sort(function (a, b) { return a.acc - b.acc; });
  }
  /* refs: { listening: { p1: [[mockId, index], …], … }, … } → a mock object with copied items */
  function miniFromRefs(refs) {
    var m = { id: MINI_ID, mini: true, full: false, title: tx("⚡ Mini mock · 15 minutes"), listening: { time: 0, p1: [], p2: [], p3: [] }, reading: { time: 0, p1: [], p2: [], p3: [] }, writing: { time: 0, p1: [], p2: [] } };
    var copy = function (it, mid) { var c = JSON.parse(JSON.stringify(it)); c.src = { m: mid, id: it.id }; c.id = it.id + "@" + mid; return c; };
    MINI_PARTS.forEach(function (P) {
      ((refs[P[1]] || {})[P[2]] || []).forEach(function (r) {
        var src = MOCKMAP[r[0]], it = src && src[P[1]][P[2]][r[1]];
        if (!it || src.level === 5) return;
        if (P[2] === "p3" && P[1] === "reading") {
          m.reading.p3.push({ passage: it.passage, questions: it.questions.map(function (q) { return copy(q, src.id); }) });
          m.reading.time += +P[4] * it.questions.length;
        } else { m[P[1]][P[2]].push(copy(it, src.id)); m[P[1]].time += +P[4]; }
      });
    });
    return m;
  }
  /* Picks about 15 minutes of questions: the weakest part of each section, with the overall weakest part getting most. */
  function buildMini() {
    var weak = miniWeak(), refs = { listening: {}, reading: {}, writing: {} }, used = 0, first = weak[0].p[0];
    var pool = function (P) {
      var out = []; MOCK.forEach(function (m) { (m[P[1]][P[2]] || []).forEach(function (it, i) { out.push([m.id, i]); }); });
      return shuffle(out);
    };
    var cost = function (P, r) { var it = MOCKMAP[r[0]][P[1]][P[2]][r[1]]; return +P[4] * (it.questions ? it.questions.length : 1); };
    /* per section: its weakest part; the section of the overall weakest part gets twice the time */
    ["L", "R", "W"].forEach(function (sec) {
      var parts = weak.filter(function (w) { return w.p[0] === sec; }).map(function (w) { return w.p; });
      var budget = MINI_SECS * (sec === first ? 0.5 : 0.25), spent = 0;
      for (var j = 0; j < parts.length && spent < budget * 0.8; j++) {
        var P = parts[j], list = pool(P), got = refs[P[1]][P[2]] = refs[P[1]][P[2]] || [];
        for (var i = 0; i < list.length && spent + cost(P, list[i]) <= budget + 30; i++) { got.push(list[i]); spent += cost(P, list[i]); }
        if (!got.length) delete refs[P[1]][P[2]];
      }
      used += spent;
    });
    var save = { at: Date.now(), refs: refs, weak: weak.slice(0, 3).map(function (w) { return w.p[3]; }) };
    try { localStorage.setItem(MINI_KEY, JSON.stringify(save)); } catch (e) { /* the mini mock still runs; only a reload loses it */ }
    var rec = Store.state.mocks[MINI_ID]; if (rec) { rec.wrong = []; Store.save(); } // the last review belonged to the previous mini mock
    MOCKMAP[MINI_ID] = miniFromRefs(refs);
    return MOCKMAP[MINI_ID];
  }
  function restoreMini() {
    try { var o = JSON.parse(localStorage.getItem(MINI_KEY) || "null"); if (o && o.refs) MOCKMAP[MINI_ID] = miniFromRefs(o.refs); } catch (e) { /* ignore */ }
  }
  /* #/mock/mini: a new mini mock each time, then the usual intro screen */
  function viewMiniMock() {
    ensureMocks().then(function () {
      if (!MOCK.length) { render('<p class="warn">' + tx("Mock test not found.") + "</p>"); return; }
      buildMini(); location.replace("#/mock/" + MINI_ID);
    });
  }
  var ORDERS = ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"];
  function partsHTML(it) {
    return '<div class="abc">' + ["A", "B", "C"].map(function (k) { return '<p><b>' + k + '</b> <span class="zh">' + esc(it.parts[k]) + "</span></p>"; }).join("") + "</div>";
  }
  function sentHTML(it) { return it.parts ? '<p class="sub">' + tx("Put A, B, C in the right order") + '</p>' + partsHTML(it) : '<p class="statement">' + esc(it.sentence) + "</p>"; }
  function isDlg(it) { return Array.isArray(it.dialogue); }
  function listenHTML(it) { return isDlg(it) ? '<button type="button" class="btn small dlg-play" data-dlg="' + esc(it.id) + '">' + tx("▶ Play dialogue") + '</button>' : SAY(it.audio.text, it.audio.voice, true); }
  /* Listening conditions: speed and background noise for mock listening (Me → Listening practice); the simulator also plays each recording once. */
  function inMockListening() { return /^#\/mock\/\d+\/listening/.test(location.hash); }
  function mockRate() { return inMockListening() ? (Store.state.settings.mockRate || undefined) : undefined; }
  function playOnceOk(key) {
    if (!EXAM || !EXAM.strict) return true;
    if (!EXAM.played) EXAM.played = {};
    if (EXAM.played[key]) { UI.toast(tx("Simulator: each recording plays once"), "🎯"); return false; }
    EXAM.played[key] = 1; return true;
  }
  function clearExamTimer() { if (EXAM && EXAM.timer) { clearInterval(EXAM.timer); EXAM.timer = null; } }
  var SEC_ORDER = ["listening", "reading", "writing"];
  var SEC_LABEL = { listening: "Listening · 听力", reading: "Reading · 阅读", writing: "Writing · 书写" };
  var LETTERS = ["A", "B", "C", "D"];

  function num(x) { x = +x; return isFinite(x) ? Math.round(x) : 0; }
  /* ---------- Exam parts: one part of the exam, timed at the real pace ----------
     Questions come from the shorter tests only, so the full-length sets stay fresh for the exam-plan rehearsals.
     Seconds per question follow the real HSK 4: listening ~30 min for 45, reading 40 min for 40, writing 25 min for 15. */
  var PARTS = [
    { k: "L1", name: "Listening part 1", what: "True or false", skill: "listen-tf", sec: 40, n: 10 },
    { k: "L2", name: "Listening part 2", what: "Short dialogues", skill: "listen-short", sec: 40, n: 10 },
    { k: "L3", name: "Listening part 3", what: "Longer dialogues and talks", skill: "listen-long", sec: 40, n: 10 },
    { k: "R1", name: "Reading part 1", what: "Choose the word for the gap", skill: "fill-word", sec: 60, n: 10 },
    { k: "R2", name: "Reading part 2", what: "Put three sentences in order", skill: "ordering", sec: 60, n: 10, drill: "order" },
    { k: "R3", name: "Reading part 3", what: "Passages and questions", skill: "passage", sec: 60, n: 10 },
    { k: "W1", name: "Writing part 1", what: "Arrange the words", skill: "word-order", sec: 80, n: 10 },
    { k: "W2", name: "Writing part 2", what: "One sentence for a picture and word", skill: "writing", sec: 180, n: 5 }];
  function partItems(k) {
    var P = PARTS.filter(function (p) { return p.k === k; })[0], out = [];
    if (P && P.drill) { // the shorter tests have no ordering items: use the Sentence Order drill set (same exam format)
      return (Games._drillList ? Games._drillList(P.drill) : []).map(function (it) { return { kind: "drill", skill: P.skill, d: P.drill, id: it.id, key: "dr:" + P.drill + ":" + it.id }; });
    }
    MOCK.forEach(function (m) {
      if (m.full) return;
      mockItems(m).forEach(function (x) { if (x.it.id.split("-")[0] === k && !x.it.parts) out.push({ kind: "mock", skill: x.skill, mock: m.id, item: x.it.id, key: "m:" + m.id + ":" + x.it.id }); });
    });
    return out;
  }
  function weakParts() {
    var acc = {}; Learn.report(5, true).forEach(function (r) { acc[r.skill] = Math.round(r.acc * 100); });
    return PARTS.filter(function (p) { return acc[p.skill] != null && acc[p.skill] < 80; }).map(function (p) { return { k: p.k, name: tx(p.name), acc: acc[p.skill] }; })
      .sort(function (a, b) { return a.acc - b.acc; });
  }
  var EW_KEY = "cbChinese.examWords2";
  function examWords() {
    if (!mocksReady || !MOCK.length) return null;
    var sig = MOCK.map(function (m) { return m.id; }).join(",") + "|" + WORDS.length, c = null;
    try { c = JSON.parse(localStorage.getItem(EW_KEY) || "null"); } catch (e) { c = null; }
    if (c && c.sig === sig && Array.isArray(c.ids)) return c.ids;
    var text = MOCK.map(function (m) { return JSON.stringify([m.listening, m.reading, m.writing]); }).join(" "), seen = {}, rank = [];
    WORDS.forEach(function (w) {
      var h = w.hanzi; if (!h || h.length < 2 || seen[h] || /^h5-/.test(w.id)) return; seen[h] = 1;
      var n = text.split(h).length - 1; if (n >= 2) rank.push([w.id, n]);
    });
    // HSK 4-level words first (lessons and core sets), then the HSK 1–3 basics; each group by how often the tests use it
    var basic = function (id) { var w = WORDMAP[id]; return /^f/.test(id) || (w && isFound(COREMAP[w._set])) ? 1 : 0; };
    rank.sort(function (a, b) { return basic(a[0]) - basic(b[0]) || b[1] - a[1]; });
    var ids = rank.map(function (x) { return x[0]; });
    try { localStorage.setItem(EW_KEY, JSON.stringify({ sig: sig, ids: ids })); } catch (e) { /* fine: computed again next time */ }
    return ids;
  }
  /* the next exam words not yet in the review deck, most frequent first */
  function examFresh(n) { var ids = examWords(); return ids ? ids.filter(function (id) { return WORDMAP[id] && !SRS.has(id); }).slice(0, n).map(function (id) { return WORDMAP[id]; }) : []; }
  function examCoverage() { var ids = examWords(); return ids ? { have: ids.filter(function (id) { return SRS.has(id); }).length, all: ids.length } : null; }
  function viewSprint() {
    var w = examFresh(10);
    if (!w.length) { render('<section class="card"><h2>' + tx("🔤 Exam words") + '</h2><p class="sub">' + tx("Every word the tests use most is already in your review deck. Keep reviewing them daily.") + '</p><a class="btn primary" href="#/review">' + tx("Review") + '</a></section>', "games"); return; }
    SRS.addMany(w.map(function (x) { return x.id; }));
    runDeck({ title: tx("Exam words"), words: w, mode: "learn", back: "#/games" });
  }
  function runPart(k, o) {
    var P = PARTS.filter(function (p) { return p.k === k; })[0]; if (!P) return false;
    var all = partItems(P.k), open = Learn.list().reduce(function (m, e) { m[e.key] = 1; return m; }, {});
    var missed = shuffle(all.filter(function (e) { return open[e.key]; })), rest = shuffle(all.filter(function (e) { return !open[e.key]; }));
    var items = missed.concat(rest).slice(0, P.n); // your open mistakes from this part first
    if (!items.length) return false;
    runMistakeDrill("all", Object.assign({ items: items, title: tx(P.name), icon: "⏱", timer: items.length * P.sec, exit: "#/parts", again: "#/parts/" + P.k, againFn: function () { viewParts(P.k); } }, o || {}));
    return true;
  }
  /* the part where the last timed mock (10 days) ran out of time with 3+ blanks, for Today's session */
  function paceIssue() {
    var from = Store.addDays(Store.today(), -10), h = byDate(Store.state.mockHistory || []).filter(function (x) { return x.date >= from && x.pace; }).pop(), best = null;
    if (!h) return null;
    ["listening", "reading", "writing"].forEach(function (sec) {
      var p = h.pace[sec]; if (!p || !p.o) return;
      Object.keys(p.b || {}).forEach(function (k) { if (p.b[k] >= 3 && (!best || p.b[k] > best.n)) best = { k: k === "R2c" ? "R1" : k, n: p.b[k] }; });
    });
    return best && PARTS.some(function (x) { return x.k === best.k; }) ? best : null;
  }
  function viewParts(k) {
    if (PARTS.some(function (p) { return p.k === k; })) { if (!runPart(k)) location.replace("#/parts"); return; }
    var weak = weakParts(), acc = {}; Learn.report(5, true).forEach(function (r) { acc[r.skill] = Math.round(r.acc * 100); });
    bankRefresh(); setTimeout(aiqFill, 2500); // keep a few new questions on the phone for offline use
    var anyNew = ["L1", "L2", "L3", "R3"].some(newQAvail);
    var html = '<section class="card g-violet"><h2>' + tx("⏱ Exam parts") + '</h2><p class="sub">' + tx("Ten questions from one part of the exam, on one clock at the real pace. Your open mistakes from that part come first.") + '</p>' +
      (weak.length ? '<a class="btn primary big" href="#/parts/' + weak[0].k + '">' + tx("▶ Your weakest: {name} ({acc}%)", { name: esc(weak[0].name), acc: weak[0].acc }) + "</a>" : "") + "</section>";
    /* one row per part: the timed 10, and (listening, reading passages) 3 never-seen questions */
    var sec = "";
    PARTS.forEach(function (p) {
      var s0 = SEC_ICON[p.k.charAt(0)];
      if (s0 !== sec) { if (sec) html += "</div></section>"; sec = s0; html += '<section class="card"><h3>' + tx(s0) + '</h3><div class="glist">'; }
      var n = Math.min(p.n, partItems(p.k).length), nq = NEW_PARTS[p.k] && newQAvail(p.k);
      html += '<div class="grow part-row"><span class="g-txt"><b>' + esc(tx(p.name)) + " · " + esc(tx(p.what)) + "</b><small>" + tx("{n} questions · {t} min", { n: n, t: fmtTime(n * p.sec) }) + (acc[p.skill] != null ? " · " + tx("you: {acc}%", { acc: acc[p.skill] }) : "") + "</small></span>" +
        '<span class="pr-acts"><a class="btn small primary" href="#/parts/' + p.k + '" aria-label="' + tx("{name}, timed, {n} questions", { name: esc(tx(p.name)), n: n }) + '">' + tx("Timed · {n}", { n: n }) + "</a>" +
        (nq ? '<a class="btn small" href="#/newq/' + p.k + '" aria-label="' + tx("{name}, new questions", { name: esc(tx(p.name)) }) + '">' + tx("New · {n}", { n: p.k === "R3" ? tx("1 text") : "3" }) + "</a>" : "") + "</span></div>";
    });
    html += "</div></section>" + (anyNew ? '<p class="sub center">' + tx("“New” = questions you have never seen, built around your weak words: checked by the C&amp;B team when available, otherwise written by AI. Untimed games are in Practice → All games.") + '</p>' : "");
    render(html, "games");
  }
  /* Practice tab, "For the exam": the mock test to take next, timed exam parts and the mistake notebook */
  function practiceTop() {
    var fin = planInfo().inBuffer, n = MOCK.length ? nextMock(fin) : null, m = n && n.m, w = weakParts()[0], mis = Learn.count(), rep = repeatItems().length;
    var mock = m ? '<section class="card pr-mock g-violet"><small>' + tx("Recommended mock test") + '</small><b>' + esc(m.title) + "</b><em>" + (m.full ? tx("Full length · 100 questions · ~100 min") : tx("Shorter test · about 40 questions · ~30 min")) + " · " + (n.rep ? tx("repeat") : tx("new")) + "</em>" +
        '<a class="tm-go" id="pr-mock-go" href="#/mock/' + m.id + (fin && m.full ? "/sim" : "") + '">' + tx("▶ Start mock test") + '</a><a class="tm-short" href="#/mock">' + tx("All {n} mock tests and your scores", { n: MOCK.length }) + "</a></section>"
      : '<a class="cta card g-violet" href="#/mock"><span class="cta-l"><small>' + tx("Timed, real exam format") + '</small><b>' + tx("📝 Mock tests") + '</b></span><span class="cta-go">▶</span></a>';
    return mock + '<div class="glist">' +
      '<a class="grow" href="#/parts"><span class="g-ico">⏱</span><span class="g-txt"><b>' + tx("Exam parts, timed") + '</b><small>' + tx("10 questions at the real pace") + (w ? " · " + tx("weakest: {name} ({acc}%)", { name: esc(w.name), acc: w.acc }) : "") + (function () { bankRefresh(); setTimeout(aiqFill, 3000); return newQAvail(weakListenPart()) ? " · " + tx("plus new questions") : ""; })() + '</small></span><span class="g-go">▶</span></a>' +
      (function () { var c = examCoverage(); return c && c.all ? '<a class="grow" href="#/sprint"><span class="g-ico">🔤</span><span class="g-txt"><b>' + tx("Exam words") + '</b><small>' + tx("{have} of the {all} words the tests use most are in your review · 10 more", { have: c.have, all: c.all }) + '</small></span><span class="g-go">▶</span></a>' : ""; })() +
      '<a class="grow" href="#/mistakes"><span class="g-ico">📒</span><span class="g-txt"><b>' + tx("Mistake notebook") + '</b><small>' + (mis ? tx("{n} to fix", { n: mis }) + (rep ? " · " + tx("{n} keep coming back", { n: rep }) : "") : tx("Nothing to fix right now")) + '</small></span><span class="g-go">▶</span></a></div>';
  }

