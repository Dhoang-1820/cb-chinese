  /* ---------- study plan ---------- */
  var BUFFER_DAYS = 14; // last two weeks before the exam: mocks + review
  var PART2_WEEKS = 6; // the lessons after your core target are paced to finish at least 6 weeks after the exam
  /* How many lessons you plan to finish before the exam (Me → Settings). Everything after that is planned for after the exam. */
  function coreCut() { var n = parseInt(Store.state.settings.coreTarget, 10); return Math.max(1, Math.min(DAYS.length, n > 0 ? n : 30)); }
  function coreOptions() { var o = [30, 45, 60, 75, 90, 120, 150].filter(function (n) { return n <= DAYS.length; }); [DAYS.length, coreCut()].forEach(function (n) { if (o.indexOf(n) < 0) o.push(n); }); return o.sort(function (a, b) { return a - b; }); }
  function suggestCore() {
    var left = Store.daysBetween(Store.today(), Store.state.settings.examDate || "2026-11-14") - BUFFER_DAYS;
    return Math.max(10, Math.min(DAYS.length, Math.floor(Math.max(0, left) / 7 * 5)));
  }
  function planInfo() {
    var s = Store.state, t = Store.today(), exam = s.settings.examDate || "2026-11-14";
    var daysLeft = Store.daysBetween(t, exam);
    var p1 = DAYS.filter(function (d) { return d.day <= coreCut(); }), p2 = DAYS.filter(function (d) { return d.day > coreCut(); });
    var isDone = function (d) { return (s.days[d.day] || {}).completed; };
    var done = p1.filter(isDone).length, total = p1.length, remaining = total - done;
    var dates = Object.keys(s.log).filter(function (k) { return s.log[k] > 0; }).sort();
    var start = dates[0] || t;
    var finishBy = Store.addDays(exam, -BUFFER_DAYS);
    var studyLeft = Math.max(1, Store.daysBetween(t, finishBy) + 1);
    var span = Math.max(1, Store.daysBetween(start, finishBy) + 1), elapsed = Store.daysBetween(start, t) + 1;
    var expected = Math.min(total, Math.round(total * elapsed / span));
    var status = !dates.length ? "new" : done >= total ? "done" : done - expected >= 2 ? "ahead" : expected - done >= 2 ? "behind" : "on";
    var p2weeks = Math.max(PART2_WEEKS, Math.ceil(p2.length / 5)), courseEnd = Store.addDays(exam, p2weeks * 7), p2done = p2.filter(isDone).length;
    var p2from = daysLeft >= 0 ? Store.addDays(exam, 1) : t, p2left = Math.max(1, Store.daysBetween(p2from, courseEnd) + 1);
    var cu = p1.filter(function (d) { var r = s.days[d.day] || {}; return r.completed && r.cu; }).length; // done as a short catch-up lesson, full quiz not passed yet
    return { exam: exam, daysLeft: daysLeft, done: done, cu: cu, total: total, remaining: remaining, finishBy: finishBy, studyLeft: studyLeft, perDay: remaining / studyLeft, expected: expected, status: status,
      inBuffer: Store.daysBetween(t, finishBy) < 0 && daysLeft >= 0, afterExam: daysLeft < 0,
      p2: { weeks: p2weeks, done: p2done, total: p2.length, remaining: p2.length - p2done, end: courseEnd, perDay: (p2.length - p2done) / p2left, next: p2.filter(function (d) { return !isDone(d); })[0] || null } };
  }
  var STATUS = { new: ["🌱", "Let's start", "t-box"], ahead: ["🚀", "Ahead of plan", "t-hsk"], on: ["✅", "On track", "t-hsk"], behind: ["⏳", "Behind plan", "t-warn"], done: ["🎓", "All lessons done", "t-hsk"] };
  function firstOpen(list) { return list.filter(function (d) { return !(Store.state.days[d.day] || {}).completed; })[0] || null; }
  function todayTasks() {
    var s = Store.state, t = Store.today(), p = planInfo(), due = SRS.dueIds(WORDMAP).length;
    var nd = firstOpen(DAYS.filter(function (d) { return d.day <= coreCut(); }));
    var tasks = [];
    var tkNext = null;
    (window.CB_TRACK || []).some(function (w) { for (var b = 1; b <= 3; b++) if (!tkDone(w.week, b)) { tkNext = { w: w.week, b: b, t: w.title.zh }; return true; } return false; });
    tasks.push({ ico: "🔁", txt: due ? "Review " + due + " due word" + (due > 1 ? "s" : "") : "Review · all caught up", href: "#/review", done: !due });
    var nMis = Learn.count(), lastMock = s.mockHistory.length ? s.mockHistory[s.mockHistory.length - 1].date : null;
    var studiedToday = Object.keys(s.days).some(function (k) { return s.days[k].completedOn === t; });
    if (p.inBuffer) {
      // Final 2 weeks: no new words — mock exams, mistakes, weakest skill and grammar
      var fullMock = MOCK.filter(function (m) { return m.full; })[0] || (window.CB_MOCK_FILES || []).length > 3 && { id: 4 };
      var mockRecent = lastMock && Store.daysBetween(lastMock, t) < 3;
      tasks.push({ ico: "📝", txt: mockRecent ? "Mock exam done recently ✓ — next one in " + (3 - Store.daysBetween(lastMock, t)) + " day(s)" : "Take a mock exam" + (fullMock ? " (try the full-length one)" : ""), href: fullMock && !mockRecent ? "#/mock/" + fullMock.id : "#/mock", done: !!mockRecent });
      if (nMis) tasks.push({ ico: "📒", txt: "Fix mistakes (" + nMis + " open)", href: "#/mistakes/all", done: false });
      var weak = Learn.report(5)[0];
      if (weak && weak.acc < 0.85) tasks.push({ ico: "🎯", txt: "Weakest skill: " + (s.settings.lang === "vi" ? weak.info.vi : weak.info.en) + " (" + Math.round(weak.acc * 100) + "%)", href: weak.open ? "#/mistakes/" + weak.skill : SKILL_LINK[weak.skill] || "#/mistakes", done: false });
      var ga = grammarAct();
      if (ga) tasks.push({ ico: "📐", txt: ga.txt, href: ga.href, done: false });
      if (nd) tasks.push({ ico: "📖", txt: "Day " + nd.day + " (only if you have time)", href: "#/day/" + nd.day, done: studiedToday });
    } else {
      var cu = nd && !p.afterExam ? cuLessons() : [];
      if (cu.length) tasks.push({ ico: "⏳", txt: "Catch up: " + plural(cu.length, "short lesson") + " (Day " + cu.map(function (d) { return d.day; }).join(", ") + ")", href: "#/catchup", done: false });
      else if (nd && !p.afterExam) tasks.push({ ico: "📖", txt: "Finish Day " + nd.day + (p.perDay > 1.05 ? " (+" + (Math.ceil(p.perDay) - 1) + " more to keep pace)" : ""), href: "#/day/" + nd.day, done: studiedToday });
      else if (p.p2.next) tasks.push({ ico: "📖", txt: "Part 2 · Day " + p.p2.next.day + (p.p2.perDay > 1.05 ? " (+" + (Math.ceil(p.p2.perDay) - 1) + " more to keep pace)" : ""), href: "#/day/" + p.p2.next.day, done: studiedToday });
      if (!p.afterExam) {
        var cs = nextCoreSet(), fs = nextCoreSet("found");
        if (cs) {
          var addedToday = Object.keys(s.srs).some(function (id) { return /^k/.test(id) && s.srs[id].added === t; });
          tasks.push({ ico: "📘", txt: "HSK 4 Core · Set " + cs.set + " (" + cs.words.filter(function (w) { return !SRS.has(w.id); }).length + " new words)", href: "#/core/" + cs.set, done: addedToday });
        }
        if (fs) {
          var checkedToday = Object.keys(s.srs).some(function (id) { return /^f/.test(id) && s.srs[id].added === t; });
          tasks.push({ ico: "⚡", txt: "HSK 1–3 · Set F" + (fs.set - 100) + " quick check", href: "#/check/" + fs.set, done: checkedToday });
        }
      }
      if (nMis) tasks.push({ ico: "📒", txt: "Fix mistakes (" + nMis + " open)", href: "#/mistakes/all", done: false });
      var mockDue = !p.afterExam && p.done >= 10 && (!lastMock || Store.daysBetween(lastMock, t) >= 7);
      if (mockDue) tasks.push({ ico: "📝", txt: "Take a mock exam", href: "#/mock", done: lastMock === t });
    }
    if (tkNext && !p.afterExam) tasks.push({ ico: "💼", txt: "C&B track · Week " + tkNext.w + " · " + tkNext.t, href: "#/track/" + tkNext.w + "/" + tkNext.b, done: false });
    var goal = s.settings.dailyGoal || 30, xp = s.log[t] || 0;
    tasks.push({ ico: "🎯", txt: "Daily goal · " + xp + "/" + goal + " XP", href: "#/games", done: xp >= goal });
    return tasks;
  }
  /* ---------- weak-spot plan: three concrete things to do today, from your own results ----------
     1) your weakest skill  2) the weakest skill from a different exam section  3) the next exam-prep action
     (a mock exam when one is due, else due reviews, else the next grammar point or lesson). */
  function focusActions() {
    var s = Store.state, t = Store.today(), p = planInfo(), out = [], used = {}, lang = s.settings.lang === "vi" ? "vi" : "en";
    var weak = Learn.report(5).filter(function (x) { return x.acc < 0.85; });
    function skillAct(x) {
      used[x.skill] = 1; used["sec:" + x.info.sec] = 1;
      return { ico: x.info.icon, txt: x.info[lang] + " · " + Math.round(x.acc * 100) + "%" + (x.open ? " · " + x.open + " to fix" : ""), why: x.info.tip, href: x.open ? "#/mistakes/" + x.skill : SKILL_LINK[x.skill] || "#/mistakes" };
    }
    if (weak[0]) out.push(skillAct(weak[0]));
    var other = weak.filter(function (x) { return !used["sec:" + x.info.sec]; })[0] || weak.filter(function (x) { return !used[x.skill]; })[0];
    if (other) out.push(skillAct(other));
    function add(a) { if (out.length < 3) out.push(a); }
    var lastMock = s.mockHistory.length ? s.mockHistory[s.mockHistory.length - 1].date : null, gap = lastMock ? Store.daysBetween(lastMock, t) : 99;
    if (out.length < 3 && (!lastMock || gap >= (p.inBuffer ? 3 : 7)) && !p.afterExam && (p.done >= 5 || p.inBuffer || lastMock)) {
      var tried = MOCK.slice().sort(function (a, b) { return ((s.mocks[a.id] || {}).plays || 0) - ((s.mocks[b.id] || {}).plays || 0) || (p.inBuffer && (b.full ? 1 : 0) - (a.full ? 1 : 0)); })[0];
      add({ ico: "📝", txt: lastMock ? "Take a mock exam (last one " + gap + " days ago)" : "Take a mock exam to find your weak spots", why: "Mocks show which of the 13 skills to train next.", href: tried ? "#/mock/" + tried.id : "#/mock" });
    }
    var due = SRS.dueIds(WORDMAP).length;
    if (out.length < 3 && due) add({ ico: "🔁", txt: "Review " + plural(due, "due word"), why: "Words you review on time are the ones you keep.", href: "#/review" });
    var nMis = Learn.count();
    if (out.length < 3 && nMis) add({ ico: "📒", txt: "Clear " + nMis + " mistake" + (nMis === 1 ? "" : "s"), why: "Get each right twice in a row to clear it.", href: "#/mistakes/all" });
    var ga = grammarAct();
    if (out.length < 3 && ga) add({ ico: "📐", txt: ga.txt, why: "5 questions; 4/5 twice masters it.", href: ga.href });
    if (out.length < 3) add({ ico: "▶", txt: "Run Today's session", why: sessionCfg().label + " of mixed practice.", href: "#/session" });
    return out;
  }
  function focusCard() {
    var acts = focusActions(); if (!acts.length) return "";
    return '<section class="card focus-plan"><div class="sec-h"><h2>🎯 Your 3 focus actions</h2><span class="muted">from your results</span></div><div class="tasks">' +
      acts.map(function (a, i) { return '<a class="task" href="' + a.href + '"><span class="tk-box">' + (i + 1) + '</span><span class="tk-ico">' + a.ico + '</span><span><b>' + esc(a.txt) + '</b><small class="sub fp-why">' + esc(a.why) + "</small></span></a>"; }).join("") + "</div></section>";
  }
  function finalModeCard() {
    var p = planInfo();
    return '<section class="card g-coral final-mode"><h2>🏁 Final ' + BUFFER_DAYS + ' days</h2><p class="sub">' + p.daysLeft + " day" + (p.daysLeft === 1 ? "" : "s") + " to the exam. No new words now: mock exams (the full-length one every few days), your mistakes, your weakest skill and grammar. Keep reviewing due words.</p></section>";
  }
  function taskList(tasks) {
    return '<div class="tasks">' + tasks.map(function (k) {
      return '<a class="task' + (k.done ? " done" : "") + '" href="' + k.href + '"><span class="tk-box">' + (k.done ? "✓" : "") + '</span><span class="tk-ico">' + k.ico + "</span><span>" + esc(k.txt) + "</span></a>";
    }).join("") + "</div>";
  }
  function todayCard() {
    var p = planInfo(), st = STATUS[p.status], tasks = todayTasks(), n = tasks.filter(function (k) { return k.done; }).length;
    return (p.inBuffer ? finalModeCard() : "") + '<section class="card today"><div class="sec-h"><h2>Today\'s plan</h2><span class="tag ' + st[2] + '">' + st[0] + " " + st[1] + "</span></div>" +
      taskList(tasks) + '<div class="sec-h"><span class="muted">' + n + "/" + tasks.length + ' done</span><a href="#/plan">Full plan ›</a></div></section>';
  }
  function corePaceHTML(p) {
    return ["core", "found"].map(function (track) {
      var sets = trackSets(track); if (!sets.length) return "";
      var done = sets.filter(function (set) { return set.words.every(function (w) { return SRS.has(w.id); }); }).length, left = sets.length - done;
      var perWeek = left ? Math.max(1, Math.ceil(left / p.studyLeft * 7)) : 0;
      return '<p class="sub">' + trackName(track) + ": <b>" + done + "/" + sets.length + " sets</b> in review" + (left && p.afterExam ? "." : left ? " · pace needed about <b>" + perWeek + " set" + (perWeek > 1 ? "s" : "") + " a week</b>." : " — all done! 🎉") + "</p>";
    }).join("");
  }
  function viewPlan() {
    var p = planInfo(), st = STATUS[p.status], s = Store.state;
    var pace = p.remaining ? (p.perDay >= 1 ? p.perDay.toFixed(1) + " lessons a day" : "about " + Math.max(1, Math.ceil(p.perDay * 7)) + " lessons a week") : "All lessons done";
    var html = '<section class="card g-sun"><h2>🗓️ Road to HSK 4</h2><p class="score-big">' + (p.daysLeft >= 0 ? p.daysLeft : 0) + ' <small>days left</small></p>' +
      '<p><b>' + st[0] + " " + st[1] + "</b> · " + p.done + "/" + p.total + " days done" + (p.status !== "new" && p.status !== "done" ? " (plan: " + p.expected + ")" : "") + (p.cu ? " · " + p.cu + " of them as short catch-up lessons" : "") + "</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(p.done / p.total * 100) + '%"></span></div>' +
      (p.afterExam ? '<p class="sub">Your exam date has passed. Keep going with Part 2 below, or set a new exam date in Settings.</p>' :
        '<p class="sub">Pace needed: <b>' + pace + "</b> to finish by " + esc(p.finishBy) + ", leaving the last " + BUFFER_DAYS + " days for mock exams and review.</p>") + corePaceHTML(p) + "</section>";
    if (p.inBuffer) html += finalModeCard();
    html += '<section class="card"><h2>Today</h2>' + taskList(todayTasks()) + "</section>";
    // week-by-week timeline
    var t = Store.today(), weeks = [], cursor = t, lesson = DAYS.filter(function (d) { return d.day <= coreCut() && !(s.days[d.day] || {}).completed; }).map(function (d) { return d.day; });
    var perWeek = Math.max(1, Math.ceil(p.perDay * 7)), w = 0;
    while (Store.daysBetween(cursor, p.exam) >= 0 && w < 40) {
      var end = Store.addDays(cursor, 6), inBuf = Store.daysBetween(cursor, p.finishBy) < 0;
      var take = inBuf ? [] : lesson.splice(0, perWeek);
      weeks.push({ from: cursor, to: Store.daysBetween(end, p.exam) < 0 ? p.exam : end, days: take, buf: inBuf || !take.length });
      cursor = Store.addDays(end, 1); w++;
    }
    if (!p.afterExam) html += '<section class="card"><h2>Week by week</h2>' + weeks.map(function (x, i) {
      var lbl = x.days.length ? "Days " + x.days[0] + (x.days.length > 1 ? "–" + x.days[x.days.length - 1] : "") : "Mocks + review";
      return '<div class="pw' + (i === 0 ? " now" : "") + '"><span class="pw-d">' + esc(x.from.slice(5)) + " → " + esc(x.to.slice(5)) + "</span><b>" + lbl + (i === 0 ? ' <small class="muted">· now</small>' : "") + "</b>" +
        (x.buf ? '<span class="tag t-hsk">📝 Mocks</span>' : x.days.length ? '<span class="muted">' + x.days.length + " lessons</span>" : "") + "</div>";
    }).join("") + '<div class="pw exam"><span class="pw-d">' + esc(p.exam.slice(5)) + "</span><b>🎓 HSK 4 exam</b></div></section>";
    // part 2: advanced C&B after the exam
    if (p.p2.total) {
      var p2days = DAYS.filter(function (d) { return d.day > coreCut() && !(s.days[d.day] || {}).completed; }).map(function (d) { return d.day; });
      var from = p.afterExam ? t : Store.addDays(p.exam, 1), wk = Math.max(1, Math.ceil(Store.daysBetween(from, p.p2.end) / 7)), per2 = Math.max(1, Math.ceil(p2days.length / wk)), rows = [];
      for (var k = 0; k < wk && p2days.length; k++) { var ds = p2days.splice(0, per2), f = Store.addDays(from, k * 7); rows.push({ from: f, to: Store.addDays(f, 6), days: ds }); }
      html += '<section class="card"><h2>Part 2 · Advanced C&amp;B</h2><p class="sub">' + p.p2.done + "/" + p.p2.total + " days done · planned for the " + p.p2.weeks + " weeks after your exam, finishing by " + esc(p.p2.end) + ". Ahead of plan? You can start earlier.</p>" +
        '<div class="xpbar"><span style="width:' + Math.round(p.p2.done / p.p2.total * 100) + '%"></span></div>' +
        rows.map(function (x) { return '<div class="pw"><span class="pw-d">' + esc(x.from.slice(5)) + " → " + esc(x.to.slice(5)) + "</span><b>Days " + x.days[0] + (x.days.length > 1 ? "–" + x.days[x.days.length - 1] : "") + '</b><span class="muted">' + x.days.length + " lessons</span></div>"; }).join("") +
        '<div class="pw exam"><span class="pw-d">' + esc(p.p2.end.slice(5)) + "</span><b>🏁 Course complete</b></div></section>";
    }
    html += '<p class="sub center">Change the exam date in <a href="#/me">Me → Settings</a>.</p>';
    render(html, "home");
  }

  /* ---------- weekly report ----------
     A snapshot is taken at the start of each week (Monday). The report compares now with that snapshot;
     when a new week starts, the finished week's report is kept as "last week". */
  function weekStart(d) { var x = new Date(d + "T00:00:00"), wd = (x.getDay() + 6) % 7; return Store.addDays(d, -wd); }
  function weekSnap() {
    var s = Store.state, f = forecast(), sk = {};
    Object.keys(s.skills).forEach(function (k) { sk[k] = { r: s.skills[k].r, w: s.skills[k].w }; });
    return { start: weekStart(Store.today()), skills: sk, cards: s.stats.cards || 0, fc: f ? f.total : null };
  }
  function weekSummary(snap, endDate) {
    var s = Store.state, from = snap.start, to = endDate, inR = function (d) { return d && d >= from && d <= to; };
    var xp = 0, active = 0; Object.keys(s.log).forEach(function (d) { if (inR(d) && s.log[d] > 0) { xp += s.log[d]; active++; } });
    var words = Object.keys(s.srs).filter(function (id) { return inR(s.srs[id].added); }).length;
    var mocks = s.mockHistory.filter(function (h) { return inR(h.date); }).length + (s.official || []).filter(function (o) { return inR(o.date); }).length;
    var skills = [];
    Object.keys(s.skills).forEach(function (k) {
      var a = s.skills[k], b = snap.skills[k] || { r: 0, w: 0 }, r = a.r - b.r, w = a.w - b.w;
      if (Learn.exam(k) && r + w >= 5) skills.push({ k: k, acc: r / (r + w), n: r + w });
    });
    skills.sort(function (x, y) { return x.acc - y.acc; });
    var f = forecast();
    return { start: from, end: to, xp: xp, active: active, words: words, cards: (s.stats.cards || 0) - (snap.cards || 0), mocks: mocks, skills: skills,
      fc0: snap.fc, fc1: f ? f.total : null };
  }
  function weekTick() {
    var s = Store.state, w = s.weekly || (s.weekly = {}), ws = weekStart(Store.today());
    if (w.cur && w.cur.start === ws) return;
    if (w.cur && w.cur.start < ws) {
      /* Only a week that finished directly before this one becomes "last week"; after a longer gap the snapshot is
         too old to compare against, so it is dropped rather than shown as one huge "week". */
      if (Store.addDays(w.cur.start, 7) === ws) w.last = weekSummary(w.cur, Store.addDays(ws, -1)); else delete w.last;
    }
    w.cur = weekSnap(); Store.save();
  }
  function knownSkills(r) { return (r.skills || []).filter(function (x) { return Learn.exam(x.k); }); }
  function weekHTML(r, title) {
    r.skills = knownSkills(r);
    var weak = r.skills[0], strong = r.skills.length > 1 ? r.skills[r.skills.length - 1] : null;
    var fc = r.fc1 != null ? (r.fc0 != null ? "~" + r.fc1 + "/300 (" + (r.fc1 - r.fc0 >= 0 ? "+" : "") + (r.fc1 - r.fc0) + ")" : "~" + r.fc1 + "/300") : "—";
    return '<section class="card weekly"><div class="sec-h"><h2>📊 ' + title + '</h2><span class="muted">' + esc(r.start.slice(5)) + " → " + esc(r.end.slice(5)) + "</span></div>" +
      '<div class="wk-grid"><div><b>' + r.active + '/7</b><small>active days</small></div><div><b>' + r.xp + '</b><small>XP</small></div><div><b>' + r.words + '</b><small>new words</small></div><div><b>' + Math.max(0, r.cards) + '</b><small>cards reviewed</small></div><div><b>' + r.mocks + '</b><small>mock/official tests</small></div><div><b>' + fc + "</b><small>forecast</small></div></div>" +
      (r.skills.length ? r.skills.slice(0, 5).map(function (x) { return '<div class="sk-row"><span class="sk-n">' + skillName(x.k) + "</span>" + accBar(x.acc) + "</div>"; }).join("") : '<p class="sub">Answer at least 5 questions in a skill to see its accuracy for the week.</p>') +
      (weak && weak.acc < 0.85 ? '<div class="focus"><b>Focus next week: ' + skillName(weak.k) + '</b><p class="sub">' + esc(Learn.SKILLS[weak.k].tip) + "</p>" + practiceLink(weak.k) + "</div>" :
        strong ? '<p class="sub">Strongest: ' + skillName(strong.k) + " · " + Math.round(strong.acc * 100) + "%.</p>" : "") + "</section>";
  }
  function weeklyCard() {
    var w = Store.state.weekly || {};
    var html = w.cur ? weekHTML(weekSummary(w.cur, Store.today()), "This week so far") : "";
    if (w.last) html += weekHTML(w.last, "Last week");
    return html;
  }
  function weeklyTeaser() {
    var w = Store.state.weekly || {};
    if (!w.last || Store.daysBetween(w.cur ? w.cur.start : Store.today(), Store.today()) > 2) return "";
    var r = w.last, weak = knownSkills(r)[0];
    return '<a class="cta card g-violet" href="#/progress"><span class="cta-l"><small>Last week</small><b>📊 Weekly report</b><em>' + r.active + "/7 days · " + r.xp + " XP · " + r.words + " new words" + (weak && weak.acc < 0.85 ? " · focus: " + esc(Learn.SKILLS[weak.k].en) : "") + '</em></span><span class="cta-go">▶</span></a>';
  }

  /* ---------- progress charts (inline SVG) ---------- */
  function lineChart(points, opts) {
    // points: [{x: label, y: number}], opts: {max, min, ref, refLabel, h}
    var W = 320, H = opts.h || 150, P = { l: 30, r: 10, t: 12, b: 22 }, n = points.length;
    if (!n) return '<p class="sub">' + (opts.empty || "No data yet.") + "</p>";
    points = points.map(function (p) { return { x: p.x, y: num(p.y) }; });
    var max = opts.max != null ? opts.max : Math.max.apply(null, points.map(function (p) { return p.y; }).concat([1]));
    var min = opts.min || 0;
    var X = function (i) { return P.l + (n === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1)); };
    var Y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min || 1)); };
    var path = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    var area = path + " L" + X(n - 1).toFixed(1) + " " + Y(min) + " L" + X(0).toFixed(1) + " " + Y(min) + " Z";
    var g = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [0, 0.5, 1].forEach(function (f) { var v = min + (max - min) * f; g += '<line class="grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax" x="' + (P.l - 4) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + Math.round(v) + "</text>"; });
    if (opts.ref != null) g += '<line class="ref" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(opts.ref) + '" y2="' + Y(opts.ref) + '"/><text class="ref-t" x="' + (P.l + 4) + '" y="' + (Y(opts.ref) - 4) + '" text-anchor="start">' + esc(opts.refLabel || "") + "</text>";
    g += '<path class="area" d="' + area + '"/><path class="line" d="' + path + '"/>';
    if (n <= 14) points.forEach(function (p, i) { g += '<circle class="dot" cx="' + X(i) + '" cy="' + Y(p.y) + '" r="3.5"><title>' + esc(p.x) + ": " + p.y + "</title></circle>"; });
    var step = Math.max(1, Math.ceil(n / 6));
    points.forEach(function (p, i) { if (i % step === 0 || i === n - 1) g += '<text class="ax" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.x) + "</text>"; });
    return g + "</svg>";
  }
  function barChart(points, opts) {
    var W = 320, H = opts.h || 130, P = { l: 26, r: 6, t: 10, b: 22 }, n = points.length;
    var max = Math.max.apply(null, points.map(function (p) { return p.y; }).concat([opts.ref || 0, 1]));
    var bw = (W - P.l - P.r) / n, Y = function (v) { return P.t + (H - P.t - P.b) * (1 - v / max); };
    var g = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [0, max].forEach(function (v) { g += '<text class="ax" x="' + (P.l - 4) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + Math.round(v) + "</text>"; });
    if (opts.ref) g += '<line class="ref" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(opts.ref) + '" y2="' + Y(opts.ref) + '"/>';
    points.forEach(function (p, i) {
      var x = P.l + i * bw + 2, h = Math.max(p.y ? 2 : 0, H - P.b - Y(p.y));
      g += '<rect class="bar-r' + (opts.ref && p.y >= opts.ref ? " hit" : "") + '" x="' + x.toFixed(1) + '" y="' + (H - P.b - h).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"><title>' + esc(p.x) + ": " + p.y + "</title></rect>";
      if (i % 2 === 0 || i === n - 1) g += '<text class="ax" x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.x) + "</text>";
    });
    return g + "</svg>";
  }
  function viewProgress() {
    var s = Store.state, t = Store.today();
    var mh = s.mockHistory.slice(-12).map(function (h, i) { return { x: "#" + (s.mockHistory.length - Math.min(12, s.mockHistory.length) + i + 1), y: num(h.total) }; });
    var best = s.mockHistory.reduce(function (m, h) { return Math.max(m, num(h.total)); }, 0);
    // words in review over the last 30 days (by date added)
    var added = {}; Object.keys(s.srs).forEach(function (id) { var a = s.srs[id].added || t; added[a] = (added[a] || 0) + 1; });
    var before = 0, from = Store.addDays(t, -29);
    Object.keys(added).forEach(function (d) { if (d < from) before += added[d]; });
    var words = [], cum = before;
    for (var i = 0; i < 30; i++) { var d = Store.addDays(from, i); cum += added[d] || 0; words.push({ x: d.slice(5), y: cum }); }
    var xp = []; for (var j = 13; j >= 0; j--) { var dd = Store.addDays(t, -j); xp.push({ x: dd.slice(8), y: s.log[dd] || 0 }); }
    var sec = function (k) { return s.mockHistory.slice(-12).map(function (h, i) { return { x: String(i + 1), y: num((h.sections || {})[k]) }; }); };
    var html = weeklyCard() + coachBox() + forecastCard(false) + '<section class="card"><div class="sec-h"><h2>📝 Mock exam scores</h2><span class="muted">' + (best ? "best " + best + "/300" : "") + "</span></div>" +
      lineChart(mh, { max: 300, ref: 180, refLabel: "pass 180", empty: "Take a mock exam to start your score chart." }) + "</section>";
    if (s.mockHistory.length) {
      html += '<section class="card"><h2>By section</h2><div class="spark3">' + ["listening", "reading", "writing"].map(function (k) {
        var pts = sec(k), last = pts[pts.length - 1].y;
        return '<div><b>' + { listening: "🎧 Listening", reading: "📖 Reading", writing: "✍️ Writing" }[k] + "</b><span class=\"big-n\">" + last + "</span>" + lineChart(pts, { max: 100, h: 70 }) + "</div>";
      }).join("") + "</div></section>";
    }
    html += '<section class="card"><div class="sec-h"><h2>📘 Words in review</h2><span class="muted">' + Object.keys(s.srs).length + " / " + WORDS.length + "</span></div>" + lineChart(words, { max: Math.max(10, cum), empty: "" }) + "</section>";
    html += '<section class="card"><div class="sec-h"><h2>⭐ XP · last 14 days</h2><span class="muted">goal ' + (s.settings.dailyGoal || 30) + "</span></div>" + barChart(xp, { ref: s.settings.dailyGoal || 30 }) + "</section>";
    var rep = Learn.report(3, true);
    if (rep.length) html += '<section class="card"><div class="sec-h"><h2>🎯 Skills</h2><a href="#/mistakes">Details ›</a></div>' + rep.map(function (x) {
      return '<div class="sk-row"><span class="sk-n">' + skillName(x.skill) + "</span>" + accBar(x.acc) + "</div>"; }).join("") + "</section>";
    render(html, "me");
    wireCoachBox();
  }

  /* ---------- AI weekly coach (Progress) ---------- */
  /* ---------- study summary (no AI): habit, practice and mistakes, worked out on the phone ----------
     Minutes and sessions are logged from the day this shipped; study days come from the XP log, so they go further back. */
  var lastTick = 0, WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function studyTick() {
    var s = Store.state, L = s.slog || (s.slog = {}), t = Store.today(), now = Date.now(), gap = now - lastTick;
    var e = L[t] || (L[t] = { m: 0, s: 0, h: new Date().getHours(), k: {} });
    if (!lastTick || gap > 10 * 60000) { e.s++; e.m += 1; } else e.m += gap / 60000; // a pause over 10 minutes starts a new session
    e.m = Math.round(e.m * 10) / 10; lastTick = now;
    var old = Store.addDays(t, -56); Object.keys(L).forEach(function (d) { if (d < old) delete L[d]; });
    Store.save(); try { trackWeek(); } catch (x) { /* never block a reward */ }
  }
  /* One snapshot a week for the teacher's charts: readiness, words that stuck, words in review. The current week is overwritten each time. */
  function trackWeek() {
    var s = Store.state, w = weekStart(Store.today()), L = s.trk || (s.trk = []), r = null, m = 0, c = 0;
    try { var rd = readiness(); r = rd ? rd.total : null; } catch (e) { r = null; }
    Object.keys(s.srs).forEach(function (id) { c++; if (s.srs[id].box >= 4) m++; });
    if (!c) return;
    var e = L.length ? L[L.length - 1] : null;
    if (e && e.w === w) { if (e.r === r && e.m === m && e.c === c) return; e.r = r; e.m = m; e.c = c; }
    else { L.push({ w: w, r: r, m: m, c: c }); if (L.length > 12) L.splice(0, L.length - 12); }
    Store.save();
  }
  /* HSK 5 in numbers, worked out from saved progress alone (ids h5-0001.. sit 20 to a pack), so it needs no HSK 5 data loaded */
  function h5Progress() {
    var s = Store.state, packs = {}, words = 0, done = 0;
    Object.keys(s.srs).forEach(function (id) { var m = /^h5-(\d{4})$/.exec(id); if (m) { words++; packs[Math.ceil(+m[1] / 20)] = 1; } });
    Object.keys(s.packs || {}).forEach(function (k) { var m = /^h5-(\d+)$/.exec(k); if (m) { packs[+m[1]] = 1; if (s.packs[k].b >= 8) done++; } });
    var g = Object.keys(s.grammar || {}).filter(function (k) { return /^h5g/.test(k) && s.grammar[k].mastered; }).length;
    return { started: Object.keys(packs).length, done: done, packs: 62, words: words, grammar: g };
  }
  /* Home, only while the Learn switch is on HSK 5: where to carry on. Home itself stays about the HSK 4 exam. */
  function h5HomeRow() {
    if (Store.state.settings.level !== 5) return "";
    var p = h5Progress(), next = 0;
    for (var k = 1; k <= p.packs && !next; k++) if (!packDone("h5", k)) next = k;
    return '<a class="trackrow toolrow" id="h5-row" href="' + (next ? "#/pack/h5/" + next : "#/learn/h5") + '"><span class="t-ico">📗</span><span class="tr-t"><small>HSK 5 · ' + p.done + "/" + p.packs + " packs finished · " + p.words + " words in review</small><b>" +
      (next ? "Continue with pack " + next : "All packs finished") + '</b></span><span class="tr-go">›</span></a>';
  }
  /* The server keeps a summary of at most 8,000 characters (a longer one is stored as nothing). Make it fit:
     shorten the plan texts first, then drop the less important lists. */
  var SUMMARY_MAX = 7500;
  function fitSummary(o) {
    var len = function () { return JSON.stringify(o).length; }, cuts = [120, 60, 20], i;
    for (i = 0; i < cuts.length && len() > SUMMARY_MAX; i++) if (o.plan && o.plan.actions) o.plan.actions.forEach(function (a) { a.text = String(a.text || "").slice(0, cuts[i]); });
    if (len() > SUMMARY_MAX) o.plan = null;
    if (len() > SUMMARY_MAX) o.hours = {};
    if (len() > SUMMARY_MAX) o.patterns = [];
    if (len() > SUMMARY_MAX && o.trend) o.trend = o.trend.slice(0, 3);
    if (len() > SUMMARY_MAX && o.trk) o.trk = o.trk.slice(-6);
    if (len() > SUMMARY_MAX) o.xpw = [];
    if (len() > SUMMARY_MAX) o.wk = null; // the admin's Week tab then shows only what is left
    return o;
  }
  /* Recent wins for the admin's cheers (last 14 days): mocks, lessons finished per day, the current streak's milestone,
     role-plays with the goal met. Small; dropped first when the summary is too big. */
  function winEvents() {
    var s = Store.state, t = Store.today(), from = Store.addDays(t, -14), ev = [], perDay = {};
    (s.mockHistory || []).forEach(function (h) { if (h.date >= from) ev.push({ k: "mock", d: h.date, id: num(h.id), s: num(h.total), f: h.full === true ? 1 : 0 }); });
    Object.keys(s.days || {}).forEach(function (k) { var r = s.days[k]; if (r && r.completed && DAYRE.test(r.completedOn || "") && r.completedOn >= from) perDay[r.completedOn] = (perDay[r.completedOn] || 0) + 1; });
    Object.keys(perDay).forEach(function (d) { ev.push({ k: "lessons", d: d, n: perDay[d] }); });
    var st = Store.streak(), ms = [100, 60, 30, 21, 14, 7, 3].filter(function (m) { return st >= m; })[0];
    if (ms) ev.push({ k: "streak", d: Store.addDays(t, -(st - ms)), n: ms });
    (s.talkLog || []).forEach(function (x) { if (x.g && x.d >= from) ev.push({ k: "talk", d: x.d, id: String(x.id || "").slice(0, 20), s: x.s }); });
    return ev.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }).slice(0, 10);
  }
  function studySummary() { var o = studySummary0(); try { o.ev = winEvents(); } catch (e) { o.ev = []; } if (JSON.stringify(o).length > SUMMARY_MAX) o.ev = (o.ev || []).slice(0, 3); return fitSummary(o); }
  function hsk4Word(id) { var w = WORDMAP[id]; return !!w && !w._pk && !w._mine; }
  /* Per week for the admin's weekly report, oldest first and this week (so far) last, weeks starting Monday:
     [study days, minutes, right answers, wrong answers, HSK 4 words added]. Answers count HSK 4 exam skills only.
     Minutes come from the study log, which keeps 8 weeks. s = this week's start (yy-mm-dd), so the admin can line weeks up. */
  function weekNumbers(t, n) {
    var s = Store.state, L = s.slog || {}, ws = weekStart(t), out = [], j, k, d, e, row;
    var added = {}; Object.keys(s.srs).forEach(function (id) { var a = s.srs[id].added; if (a && hsk4Word(id)) added[a] = (added[a] || 0) + 1; });
    for (j = n - 1; j >= 0; j--) {
      row = [0, 0, 0, 0, 0];
      for (k = 0; k < 7; k++) {
        d = Store.addDays(ws, k - 7 * j); if (d > t) break;
        if (s.log[d] > 0) row[0]++;
        e = L[d]; if (e) { row[1] += e.m || 0; Object.keys(e.k || {}).forEach(function (x) { if (Learn.exam(x)) { row[2] += e.k[x][0]; row[3] += e.k[x][1]; } }); }
        row[4] += added[d] || 0;
      }
      row[1] = Math.round(row[1]); out.push(row);
    }
    return { s: ws.slice(2), w: out };
  }
  function studySummary0() {
    var s = Store.state, t = Store.today(), L = s.slog || {}, i, d, act28 = 0, gap = 0, longest = 0, miss = [0, 0, 0, 0, 0, 0, 0];
    var first = Object.keys(s.log).sort()[0] || t, span = Math.min(28, Store.daysBetween(first, t) + 1);
    for (i = span - 1; i >= 0; i--) {
      d = Store.addDays(t, -i);
      if (s.log[d] > 0) { act28++; gap = 0; } else if (i > 0) { gap++; longest = Math.max(longest, gap); miss[(new Date(d + "T00:00:00").getDay() + 6) % 7]++; } // today is not a miss yet
    }
    var worst = miss.indexOf(Math.max.apply(null, miss)), days = Object.keys(L).filter(function (x) { return L[x].s > 0; }), hrs = {}, mins = 0, ses = 0;
    days.forEach(function (x) { hrs[L[x].h] = (hrs[L[x].h] || 0) + 1; mins += L[x].m; ses += L[x].s; });
    var usual = days.length >= 3 ? +Object.keys(hrs).sort(function (a, b) { return hrs[b] - hrs[a]; })[0] : null;
    var from = Store.addDays(t, -13), prev = Store.addDays(t, -27), now = {}, bef = {};
    Object.keys(L).forEach(function (x) {
      if (x < prev) return; var to = x >= from ? now : bef;
      Object.keys(L[x].k || {}).forEach(function (k) { var c = to[k] || (to[k] = [0, 0]); c[0] += L[x].k[k][0]; c[1] += L[x].k[k][1]; });
    });
    var trend = Object.keys(now).filter(function (k) { return Learn.exam(k) && now[k][0] + now[k][1] >= 5; }).map(function (k) {
      var a = now[k], b = bef[k], nb = b ? b[0] + b[1] : 0;
      return { skill: tipSkillName(k), acc: Math.round(a[0] / (a[0] + a[1]) * 100), before: nb >= 5 ? Math.round(b[0] / nb * 100) : null, n: a[0] + a[1] };
    }).sort(function (a, b) { return a.acc - b.acc; }).slice(0, 8);
    return { span: span, active28: act28, longestGap: longest, skipDay: span >= 14 && miss[worst] >= 2 ? WD[worst] : "", usualHour: usual, planHour: parseInt(String(s.settings.remindTime || "").slice(0, 2), 10),
      minutes: days.length ? Math.round(mins / days.length) : null, sessions: days.length ? Math.round(ses / days.length * 10) / 10 : null, logDays: days.length, goalDays: s.settings.weeklyDays || 5, trend: trend,
      // readable names (not ids like "fill-word"); a repeat pattern also says how many different items (k) make up its n misses
      patterns: Learn.patterns(3).map(function (p) { var o = { kind: p.type, skill: p.skill ? tipSkillName(p.skill) : "", n: p.n }; if (p.keys) o.k = p.keys.length; return o; }),
      days28: (function () { var o = ""; for (var j = 27; j >= 0; j--) o += s.log[Store.addDays(t, -j)] > 0 ? "1" : "0"; return o; })(), // oldest first, today last
      hours: hrs, // start hour -> number of study days that began in it
      week: (function () { var o = []; for (var j = 6; j >= 0; j--) { var e = L[Store.addDays(t, -j)]; o.push(e ? Math.round(e.m) : 0); } return o; })(), // minutes per day, today last
      progress: (function () {
        var r = null, due = 0; try { r = readiness(); due = SRS.dueIds(WORDMAP).length; } catch (e) { /* content not loaded yet */ }
        var mh = mockHist(), ms = mh.slice(-5).map(function (x) { var h = x.h, o = { d: h.date, t: h.total, l: h.sections.listening, r: h.sections.reading, w: h.sections.writing }; if (x.rep) o.rep = 1; return o; });
        var fa = mh.filter(function (x) { return !x.rep; }); // first attempts over the whole history: [count, average total]
        fa = fa.length ? [fa.length, Math.round(fa.reduce(function (a, x) { return a + num(x.h.total); }, 0) / fa.length)] : null;
        return { hsk5: h5Progress(), lessons: Object.keys(s.days).filter(function (k) { return s.days[k].completed; }).length, lessonsAll: DAYS.length, track: Object.keys(s.track || {}).filter(function (k) { return s.track[k]; }).length, trackAll: 72,
          due: due, ready: r ? { total: r.total, lo: r.lo, hi: r.hi, verdict: r.verdict[1], src: r.src } : null, mocks: ms, mfa: fa, exam: s.settings.examDate || "", goal: s.settings.dailyGoal || 30,
          real: (function () { var x = realResult(); return x ? { l: x.l, r: x.r, w: x.w, d: x.date } : null; })(), fc: s.fcAtExam ? s.fcAtExam.t : null, lv: exLv(),
          xh: (s.examHist || []).slice(-6).map(function (e) { return [e.lv, e.d, e.fc ? e.fc.t : null, e.real ? e.real.l + e.real.r + e.real.w : null]; }) };
      })(),
      streak: { n: Store.streak(), best: (s.streak && s.streak.best) || 0 },
      xpw: (function () { var o = [], ws = weekStart(t); for (var j = 7; j >= 0; j--) { var a = Store.addDays(ws, -7 * j), sum = 0; for (var k = 0; k < 7; k++) sum += s.log[Store.addDays(a, k)] || 0; o.push(sum); } return o; })(), // XP per week, this week last
      trk: (s.trk || []).slice(-8).map(function (e) { return [e.w.slice(2), e.r, e.m, e.c]; }), // [week start (yy-mm-dd), readiness, words in box 4-5, words in review]
      /* HSK 4 course words only (hsk: 4 tells the admin screen so): the lesson words, HSK 4 Core and HSK 1–3 Foundation,
         which are built into every phone, so the total is the same everywhere. HSK 5 packs (h5) and the optional extra
         packs and own words (ex) are only counted, because WORDMAP holds them only once loaded. */
      vocab: (function () {
        var m = 0, l = 0, od = 0, all = 0, h5 = 0, ex = 0, cut = Store.addDays(t, -3);
        Object.keys(WORDMAP).forEach(function (id) { if (hsk4Word(id)) all++; });
        Object.keys(s.srs).forEach(function (id) {
          var c = s.srs[id]; if (/^h5-/.test(id)) { h5++; return; } if (!hsk4Word(id)) { ex++; return; }
          if (c.box >= 4) m++; else l++; if (c.due <= cut) od++;
        });
        return { hsk: 4, all: all, mastered: m, learning: l, overdue: od, h5: h5, ex: ex };
      })(),
      wk: weekNumbers(t, 8),
      talk: (function () {
        var tl = s.talkLog || [], ws = weekStart(t), wk = [0, 0, 0, 0, 0, 0, 0, 0], sc = {}, rec = tl.filter(function (e) { return e.s != null; }).slice(-10), last = tl.length ? tl[tl.length - 1] : null;
        tl.forEach(function (e) { sc[e.id] = 1; var i = 7 - Math.floor(Store.daysBetween(weekStart(e.d), ws) / 7); if (i >= 0 && i < 8) wk[i]++; });
        return { wk: wk, avg: rec.length ? Math.round(rec.reduce(function (a, e) { return a + e.s; }, 0) / rec.length * 10) / 10 : null, tried: Object.keys(sc).length, all: (window.CB_TALK || []).length,
          lvl: last ? last.l : 4, last: last ? { id: last.id, s: last.s, d: last.d } : null };
      })(),
      pace: (function () { try { var p = planInfo(); return { done: p.done, total: p.total, exp: p.expected, status: p.status }; } catch (e) { return null; } })(),
      plan: (function () { var c = coachLast(); return c ? { w: c.w, actions: coachStatus(c).map(function (a) { return { text: a.text.slice(0, 200), skill: tipSkillName(a.skill), done: a.done }; }) } : null; })() };
  }

  /* ---------- AI weekly coach (Progress), with memory of its last advice ---------- */
  function coachBase(actions) {
    var s = Store.state, sk = {};
    actions.forEach(function (a) { var v = s.skills[a.skill]; sk[a.skill] = v ? v.r + v.w : 0; });
    return { skills: sk, cards: s.stats.cards || 0, mocks: s.mockHistory.length + (s.official || []).length };
  }
  /* What happened to each action of one piece of advice: answers since then and whether that counts as done (rule, no AI). */
  function coachStatus(c) {
    var s = Store.state, b = c.base || { skills: {} };
    return c.actions.map(function (a) {
      var v = s.skills[a.skill], n;
      if (a.skill === "mock") { n = s.mockHistory.length + (s.official || []).length - (b.mocks || 0); return { text: a.text, minutes: a.minutes, skill: a.skill, n: n, done: n >= 1 }; }
      n = a.skill === "review" || a.skill === "vocab" ? (s.stats.cards || 0) - (b.cards || 0) : (v ? v.r + v.w : 0) - ((b.skills || {})[a.skill] || 0);
      return { text: a.text, minutes: a.minutes, skill: a.skill, n: Math.max(0, n), done: n >= 10 };
    });
  }
  function coachLast() { var l = Store.state.coachLog || []; return l.length ? l[l.length - 1] : null; }
  function coachKeep(res) {
    if (!res || !res.ok || !res.result || !Array.isArray(res.result.actions)) return; // a saved answer shown again is not new advice
    var s = Store.state, l = s.coachLog || (s.coachLog = []), ws = weekStart(Store.today());
    var acts = res.result.actions.slice(0, 3).map(function (a) { return { text: String(a.text || ""), minutes: +a.minutes || 10, skill: String(a.skill || "review") }; });
    var e = { w: ws, d: Store.today(), actions: acts, base: coachBase(acts) };
    if (l.length && l[l.length - 1].w === ws) l[l.length - 1] = e; else l.push(e);
    if (l.length > 6) l.splice(0, l.length - 6);
    Store.save(); syncSoon();
  }
  function coachReport() {
    var w = Store.state.weekly || {}, cur = w.cur ? weekSummary(w.cur, Store.today()) : null, r = cur && cur.active > 0 ? cur : (w.last || cur);
    if (!r) return null;
    var isCur = r === cur, f = forecast(), sm = studySummary(), ws = weekStart(Store.today());
    var prev = (Store.state.coachLog || []).filter(function (c) { return c.w < ws; }).pop() || null; // advice from an earlier week, not this week's own
    var rep = { daysLeft: Store.daysBetween(Store.today(), Store.state.settings.examDate || "2026-11-14"), active: r.active, xp: r.xp, words: r.words, cards: Math.max(0, r.cards),
      mocks: r.mocks, forecast: f ? f.total : null, skills: r.skills.slice(0, 8).map(function (x) { return { skill: (AI.SKILL_NAMES[x.k] || x.k), acc: Math.round(x.acc * 100), n: x.n }; }),
      tags: AI.topTags(5).map(function (t) { return { tag: t.tag, n: t.n }; }),
      habit: { span: sm.span, active28: sm.active28, longestGap: sm.longestGap, skipDay: sm.skipDay, usualHour: sm.usualHour, planHour: sm.planHour, minutes: sm.minutes, goalDays: sm.goalDays }, trend: sm.trend, patterns: sm.patterns };
    if (prev) { rep.lastAdvice = coachStatus(prev).map(function (a) { return { text: a.text.slice(0, 300), skill: a.skill, minutes: a.minutes, done: a.done, n: a.n }; }); rep.lastAdviceDays = Store.daysBetween(prev.d, Store.today()); }
    return { key: r.start + "/" + (isCur ? Store.today() : r.end) + "/" + (Store.state.settings.lang || "both"), report: rep };
  }
  /* This week's plan on Home: the coach's actions with a tick once they are done. */
  function planCard() {
    var c = coachLast(); if (!c || !c.actions.length || Store.daysBetween(c.d, Store.today()) > 9) return "";
    var st = coachStatus(c), n = st.filter(function (a) { return a.done; }).length;
    return '<section class="card plan-card" id="coach-plan"><div class="sec-h"><h2>🤖 Coach\'s plan</h2><span class="muted">' + n + "/" + st.length + ' done</span></div><ul class="plan-l">' + st.map(function (a) {
      var name = AI.SKILL_NAMES[a.skill] || "Go", href = Object.prototype.hasOwnProperty.call(AI.SKILL_ROUTE, a.skill) ? AI.SKILL_ROUTE[a.skill] : "#/review";
      return '<li class="' + (a.done ? "done" : "") + '"><span class="plan-c" aria-hidden="true">' + (a.done ? "✓" : "") + '</span><span class="plan-t">' + (a.done ? '<span class="sr">Done: </span>' : "") + esc(a.text) + "</span>" +
        (a.done ? "" : '<a class="btn small" href="' + href + '">' + esc(name) + " · " + a.minutes + " min</a>") + "</li>";
    }).join("") + "</ul></section>";
  }
  /* Once a week, when there is something to say, ask the coach without being asked (one AI call). Tried at most once a day. */
  function autoCoach() {
    try {
      if (!window.AI || !AI.available()) return;
      var ws = weekStart(Store.today()), c = coachLast(), k = "cbChinese.coach.try";
      if (c && c.w === ws) return;
      if (localStorage.getItem(k) === Store.today()) return;
      var r = coachReport(); if (!r || (r.report.active < 2 && r.report.habit.active28 < 3)) return; // too little to talk about
      localStorage.setItem(k, Store.today());
      AI.weekly(document.createElement("div"), r.key, r.report, true).then(function (res) {
        if (!res || !res.ok) return; coachKeep(res);
        UI.toast("Your coach has a new plan for this week", "🤖");
        var el = document.getElementById("coach-plan");
        if (el) el.outerHTML = planCard(); else if ((location.hash || "#/") === "#/") route();
      });
    } catch (e) { /* optional */ }
  }
  function coachBox() {
    if (!window.AI || !AI.configured()) return "";
    var tags = AI.topTags(3);
    return '<section class="card ai-weekly"><div class="sec-h"><h2>🤖 AI coach</h2><span class="tag">optional</span></div><p class="sub">Turns your numbers into 3 things to do next, and checks what you did with the plan from last week. It runs by itself once a week. Only counts are sent (study days, usual hour, accuracy per skill), no personal details.</p>' +
      (tags.length ? '<p class="sub">Recurring mistakes from the paragraph coach: ' + tags.map(function (t) { return '<a href="' + t.link + '">' + esc(t.name) + " ×" + t.n + "</a>"; }).join(" · ") + "</p>" : "") +
      '<button class="btn small primary" id="wk-ai">Coach me for next week</button><div id="wk-ai-out"></div></section>';
  }
  function wireCoachBox() {
    var b = document.getElementById("wk-ai"); if (!b) return;
    b.onclick = function () {
      var r = coachReport(); if (!r) { UI.toast("Study a little first, then ask", "📊"); return; }
      b.disabled = true;
      AI.weekly(document.getElementById("wk-ai-out"), r.key, r.report, false).then(function (res) { coachKeep(res); b.disabled = false; b.textContent = "Refresh"; b.onclick = function () { b.disabled = true; AI.weekly(document.getElementById("wk-ai-out"), r.key, r.report, true).then(function (res2) { coachKeep(res2); b.disabled = false; }); }; });
    };
  }


