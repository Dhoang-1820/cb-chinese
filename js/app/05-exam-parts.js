  /* ---------- mock exam ---------- */
  var MOCK = [], MOCKMAP = {}, EXAM = null;
  var RESOURCES = [
    { name: "Study4 HSK 4 practice tests", url: "https://study4.com/tests/hsk-4/" },
    { name: "Official HSK sample papers (Hanban/CTI)", url: "http://www.chinesetest.cn/gosign.do?id=1&lid=0#" }
  ];
  function buildMockIndex() {
    MOCK = (window.CB_MOCK || []).slice().sort(function (a, b) { return a.id - b.id; });
    MOCKMAP = {}; MOCK.forEach(function (m) {
      MOCKMAP[m.id] = m;
      // sentence-ordering items (full-length reading part 2): answer "BAC" → index into the 6 possible orders
      m.reading.p2.forEach(function (it) { if (it.parts && typeof it.answer === "string") { it.orderKey = it.answer; it.options = ORDERS.slice(); it.answer = ORDERS.indexOf(it.orderKey); } });
    });
  }
  var ORDERS = ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"];
  function partsHTML(it) {
    return '<div class="abc">' + ["A", "B", "C"].map(function (k) { return '<p><b>' + k + '</b> <span class="zh">' + esc(it.parts[k]) + "</span></p>"; }).join("") + "</div>";
  }
  function sentHTML(it) { return it.parts ? '<p class="sub">Put A, B, C in the right order</p>' + partsHTML(it) : '<p class="statement">' + esc(it.sentence) + "</p>"; }
  function isDlg(it) { return Array.isArray(it.dialogue); }
  function listenHTML(it) { return isDlg(it) ? '<button type="button" class="btn small dlg-play" data-dlg="' + esc(it.id) + '">▶ Play dialogue</button>' : SAY(it.audio.text, it.audio.voice, true); }
  /* Listening conditions: speed and background noise for mock listening (Me → Listening practice); the simulator also plays each recording once. */
  function inMockListening() { return /^#\/mock\/\d+\/listening/.test(location.hash); }
  function mockRate() { return inMockListening() ? (Store.state.settings.mockRate || undefined) : undefined; }
  function playOnceOk(key) {
    if (!EXAM || !EXAM.strict) return true;
    if (!EXAM.played) EXAM.played = {};
    if (EXAM.played[key]) { UI.toast("Simulator: each recording plays once", "🎯"); return false; }
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
    return PARTS.filter(function (p) { return acc[p.skill] != null && acc[p.skill] < 80; }).map(function (p) { return { k: p.k, name: p.name, acc: acc[p.skill] }; })
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
    if (!w.length) { render('<section class="card"><h2>🔤 Exam words</h2><p class="sub">Every word the tests use most is already in your review deck. Keep reviewing them daily.</p><a class="btn primary" href="#/review">Review</a></section>', "games"); return; }
    SRS.addMany(w.map(function (x) { return x.id; }));
    runDeck({ title: "Exam words", words: w, mode: "learn", back: "#/games" });
  }
  function runPart(k, o) {
    var P = PARTS.filter(function (p) { return p.k === k; })[0]; if (!P) return false;
    var all = partItems(P.k), open = Learn.list().reduce(function (m, e) { m[e.key] = 1; return m; }, {});
    var missed = shuffle(all.filter(function (e) { return open[e.key]; })), rest = shuffle(all.filter(function (e) { return !open[e.key]; }));
    var items = missed.concat(rest).slice(0, P.n); // your open mistakes from this part first
    if (!items.length) return false;
    runMistakeDrill("all", Object.assign({ items: items, title: P.name, icon: "⏱", timer: items.length * P.sec, exit: "#/parts", again: "#/parts/" + P.k, againFn: function () { viewParts(P.k); } }, o || {}));
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
    var html = '<section class="card g-violet"><h2>⏱ Exam parts</h2><p class="sub">Ten questions from one part of the exam, with one clock at the real pace. Your open mistakes from that part come first. Questions come from the shorter tests, so the full-length tests stay new for your rehearsals.</p>' +
      (weak.length ? '<a class="btn primary big" href="#/parts/' + weak[0].k + '">▶ Your weakest: ' + esc(weak[0].name) + " (" + weak[0].acc + "%)</a>" : "") + "</section>";
    var sec = "";
    PARTS.forEach(function (p) {
      var s0 = SEC_ICON[p.k.charAt(0)];
      if (s0 !== sec) { if (sec) html += "</div></section>"; sec = s0; html += '<section class="card"><h3>' + s0 + '</h3><div class="glist">'; }
      var n = Math.min(p.n, partItems(p.k).length);
      html += '<a class="grow" href="#/parts/' + p.k + '"><span class="g-txt"><b>' + esc(p.name) + " · " + esc(p.what) + "</b><small>" + n + " questions · " + fmtTime(n * p.sec) + " min" + (acc[p.skill] != null ? " · you: " + acc[p.skill] + "%" : "") + '</small></span><span class="tr-go">›</span></a>';
    });
    html += "</div></section>" + newQSection() + '<section class="card"><h3>More practice, untimed</h3><div class="glist">' +
      '<a class="grow" href="#/game/bank"><span class="g-txt"><b>🗃️ Word Bank</b><small>Six words, five gaps · Reading part 1</small></span><span class="tr-go">›</span></a>' +
      '<a class="grow" href="#/game/wordorder"><span class="g-txt"><b>🧱 Arrange the Words</b><small>Writing part 1</small></span><span class="tr-go">›</span></a>' +
      '<a class="grow" href="#/game/picture"><span class="g-txt"><b>🖼️ Picture Writing</b><small>Writing part 2 · AI scores your sentence</small></span><span class="tr-go">›</span></a></div></section>';
    render(html, "me");
  }
  /* Practice tab, "For the exam": the mock test to take next, timed exam parts and the mistake notebook */
  function practiceTop() {
    var fin = planInfo().inBuffer, n = MOCK.length ? nextMock(fin) : null, m = n && n.m, w = weakParts()[0], mis = Learn.count(), rep = repeatItems().length;
    var mock = m ? '<section class="card pr-mock g-violet"><small>Recommended mock test</small><b>' + esc(m.title) + "</b><em>" + (m.full ? "Full length · 100 questions · ~100 min" : "Shorter test · about 40 questions · ~30 min") + (n.rep ? " · repeat" : " · new") + "</em>" +
        '<a class="tm-go" id="pr-mock-go" href="#/mock/' + m.id + (fin && m.full ? "/sim" : "") + '">▶ Start mock test</a><a class="tm-short" href="#/mock">All ' + MOCK.length + " mock tests and your scores</a></section>"
      : '<a class="cta card g-violet" href="#/mock"><span class="cta-l"><small>Timed, real exam format</small><b>📝 Mock tests</b></span><span class="cta-go">▶</span></a>';
    return mock + '<div class="glist">' +
      '<a class="grow" href="#/parts"><span class="g-ico">⏱</span><span class="g-txt"><b>Exam parts, timed</b><small>10 questions at the real pace' + (w ? " · weakest: " + esc(w.name) + " (" + w.acc + "%)" : "") + (function () { bankRefresh(); setTimeout(aiqFill, 3000); return newQAvail(weakListenPart()) ? " · plus new questions" : ""; })() + '</small></span><span class="g-go">▶</span></a>' +
      (function () { var c = examCoverage(); return c && c.all ? '<a class="grow" href="#/sprint"><span class="g-ico">🔤</span><span class="g-txt"><b>Exam words</b><small>' + c.have + " of the " + c.all + ' words the tests use most are in your review · 10 more</small></span><span class="g-go">▶</span></a>' : ""; })() +
      '<a class="grow" href="#/mistakes"><span class="g-ico">📒</span><span class="g-txt"><b>Mistake notebook</b><small>' + (mis ? mis + " to fix" + (rep ? " · " + rep + " keep coming back" : "") : "Nothing to fix right now") + '</small></span><span class="g-go">▶</span></a></div>';
  }

