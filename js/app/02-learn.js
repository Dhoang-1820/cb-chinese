  /* ---------- learn (plan) ---------- */
  /* Level switch at the top of Learn. The choice is kept in settings.level; "HSK 5" opens the HSK 5 area. */
  function levelSwitch(cur) {
    return '<div class="lvl-sw" role="group" aria-label="Level">' + [4, 5].map(function (l) {
      return '<button type="button" data-level="' + l + '" class="' + (cur === l ? "on" : "") + '" aria-pressed="' + (cur === l) + '">HSK ' + l + "</button>";
    }).join("") + "</div>";
  }
  function setLevel(l) {
    var st = Store.state.settings; st.level = l === 5 ? 5 : 4; if (st.level === 5) st.h5 = true; Store.save();
    if (location.hash === "#/learn") route(); else location.hash = "#/learn";
  }
  var H5_NOTE = '<p class="h5-note" role="note">⚑ HSK 5 content is new and not yet checked by a teacher. Use the flag button to report mistakes.</p>';
  function h5Seg(which) {
    var t = [["words", "#/learn/h5", "Words"], ["grammar", "#/grammar/h5", "Grammar"], ["practice", "#/learn/h5p", "Practice"]];
    if (!Store.state.settings.h5) { Store.state.settings.h5 = true; Store.save(); } // opened once: its words stay ready for Review and Search
    return levelSwitch(5) + '<nav class="seg">' + t.map(function (x) { return '<a class="' + (which === x[0] ? "active" : "") + '" href="' + x[1] + '">' + x[2] + "</a>"; }).join("") + "</nav>" + H5_NOTE;
  }
  function learnSeg(which, noLevel) {
    var t = [["cb", "#/learn", "Lessons"], ["core", "#/learn/core", "HSK words"], ["grammar", "#/grammar", "Grammar"], ["mine", "#/learn/mine", "My words"]];
    return (noLevel ? "" : levelSwitch(4)) + '<nav class="seg seg4">' + t.map(function (x) { return '<a class="' + (which === x[0] ? "active" : "") + '" href="' + x[1] + '">' + x[2] + "</a>"; }).join("") + "</nav>";
  }
  /* HSK word tracks: "core" = HSK 4 Core (sets 1–25), "found" = HSK 1–3 Foundation (sets 101–130, shown as F1–F30) */
  function isFound(set) { return set && set.track === "found"; }
  function trackSets(track) { return CORE.filter(function (x) { return track === "found" ? isFound(x) : !isFound(x); }); }
  function setLabel(n) { return n > 100 ? "F" + (n - 100) : String(n); }
  function trackName(track) { return track === "found" ? "HSK 1–3 Foundation" : "HSK 4 Core"; }
  function viewCoreList(track) {
    track = track === "found" ? "found" : "core";
    var sets = trackSets(track), nWords = sets.reduce(function (n, x) { return n + x.words.length; }, 0);
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search ' + WORDS.length + ' words — hanzi, pinyin, Việt, English</span></a>' + learnSeg("core") +
      '<nav class="track-tabs"><a class="' + (track === "found" ? "on" : "") + '" href="#/learn/found">HSK 1–3 · ' + trackSets("found").length + ' sets</a><a class="' + (track === "core" ? "on" : "") + '" href="#/learn/core">HSK 4 · ' + trackSets("core").length + " sets</a></nav>" +
      '<section class="card ' + (track === "found" ? "g-teal" : "g-blue") + '"><h2>' + trackName(track) + '</h2><p class="sub">' +
      (track === "found" ? nWords + " HSK 1–3 words. The HSK 4 exam expects you to know them too. Most will be easy: use <b>Quick check</b> to sort the ones you know (they come back rarely) from the ones to learn." :
        nWords + " general HSK 4 words the exam expects — the ones not already in your C&amp;B lessons. Add a set to review, then flashcards and games take it from there.") + "</p></section>" +
      '<div class="glist more-words"><a class="grow" href="#/learn/extra"><span class="g-ico">📘</span><span class="g-txt"><b>Extra HSK 4 words</b><small>91 official HSK 1–4 words that no lesson or set teaches · 5 packs</small></span><span class="g-go">▶</span></a>' +
      '<a class="grow" href="#/families"><span class="g-ico">🧬</span><span class="g-txt"><b>Word families</b><small>61 characters and the words built with them</small></span><span class="g-go">▶</span></a></div><div class="daygrid">';
    sets.forEach(function (set) {
      var n = set.words.length, inSrs = set.words.filter(function (w) { return SRS.has(w.id); }).length;
      var strong = set.words.filter(function (w) { var c = SRS.get(w.id); return c && c.box >= 4; }).length, done = inSrs === n;
      html += '<a class="daycard card' + (done ? " done" : "") + '" href="#/core/' + set.set + '"><span class="dnum">' + (done ? "✓ " : "") + "Set " + setLabel(set.set) + '</span><span class="dzh zh">' +
        esc(set.words.slice(0, 3).map(function (w) { return w.hanzi; }).join(" · ")) + '</span><span class="dbar"><i style="width:' + Math.round(inSrs / n * 100) + '%"></i></span><span class="dmeta">' +
        inSrs + "/" + n + " in review" + (strong ? " · " + strong + " strong" : "") + "</span></a>";
    });
    render(html + "</div>", "learn");
  }
  function viewCoreSet(n) {
    var set = COREMAP[n];
    if (!set) { render('<p class="empty">Set not found. <a href="#/learn/core">Back</a></p>'); return; }
    var track = isFound(set) ? "found" : "core", sets = trackSets(track), k = sets.indexOf(set), prev = sets[k - 1], next = sets[k + 1];
    var ws = set.words, notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length;
    var html = '<header class="dayhead card ' + (track === "found" ? "g-teal" : "g-blue") + '"><div class="dh-nav">' + (prev ? '<a class="pill" href="#/core/' + prev.set + '">‹ ' + setLabel(prev.set) + "</a>" : '<a class="pill" href="#/learn/' + track + '">‹ All</a>') +
      '<span class="dh-day">' + trackName(track) + "</span>" + (next ? '<a class="pill" href="#/core/' + next.set + '">' + setLabel(next.set) + " ›</a>" : "<span></span>") + "</div>" +
      "<h1>Set " + setLabel(n) + '</h1><p class="sub">' + ws.length + " words</p></header>" +
      '<div class="actions">' + (notIn ? '<a class="btn primary" href="#/check/' + n + '">⚡ Quick check ' + notIn + "</a>" : "") + '<a class="btn' + (notIn ? "" : " primary") + '" href="#/cards/k' + n + '">🃏 Flashcards</a><a class="btn" href="#/game/quick/k' + n + '">❓ Quiz</a><a class="btn" href="#/game/write/k' + n + '">✍️ Write</a>' +
      (notIn ? '<button class="btn" id="add-all">＋ Add ' + notIn + " to review</button>" : '<span class="ok-text">✓ All in review</span>') + "</div>" +
      (notIn ? '<p class="sub">Quick check: tap "I know it" or "Learn it" for each word. Known words go into review at a high box (back in about a week); the rest start from box 1.</p>' : "") +
      ws.map(wordCard).join("");
    render(html, "day");
    var add = document.getElementById("add-all");
    if (add) add.onclick = function () { SRS.addMany(ws.map(function (w) { return w.id; })); Game.award(5); UI.toast(notIn + " words added to review", "➕"); viewCoreSet(n); };
  }
  /* Quick check: sort a set's new words into "I know it" (review in ~8 days) and "Learn it" (box 1, due today). */
  function viewQuickCheck(n) {
    var set = COREMAP[n];
    if (!set) { location.replace("#/learn/core"); return; }
    var words = set.words.filter(function (w) { return !SRS.has(w.id); }), i = 0, known = 0, learn = [];
    workDone = false;
    (function draw() {
      if (i >= words.length) {
        if (words.length) Game.award(Math.min(10, words.length));
        render('<div class="card result">' + UI.mascot(known >= words.length / 2 ? "cheer" : "happy", 88) + "<h2>Set " + setLabel(n) + " sorted</h2>" +
          '<p class="big-score"><span class="good">' + known + ' known</span> · <span class="bad-t">' + learn.length + " to learn</span></p>" +
          '<p class="sub">Known words come back in about a week to make sure. ' + (learn.length ? "Study the new ones now with flashcards." : "") + "</p>" +
          '<div class="actions center">' + (learn.length ? '<a class="btn primary" href="#/review">🃏 Study ' + learn.length + " now</a>" : "") + '<a class="btn" href="#/core/' + n + '">Back to set</a></div></div>', "learn");
        return;
      }
      var w = words[i];
      render('<div class="ghead"><a class="pill" href="#/core/' + n + '">✕</a><b>⚡ Quick check · Set ' + setLabel(n) + '</b><span class="ghr">' + (i + 1) + "/" + words.length + "</span></div>" +
        '<div class="bar"><span style="width:' + (i / words.length * 100) + '%"></span></div>' +
        '<div class="card qcard qc" id="qcard"><div class="hz big">' + esc(w.hanzi) + "</div>" + SAY(w.hanzi, null, true) +
        '<p class="sub">Do you know its meaning and pinyin?</p><button class="btn wide" id="qc-show">👁 Show</button>' +
        '<div id="qc-ans" hidden>' + PY(w.pinyin) + '<div class="w-mean">' + M(w) + "</div></div>" +
        '<div class="tf-btns"><button class="btn good-btn" id="qc-yes">✓ I know it</button><button class="btn bad-btn" id="qc-no">Learn it</button></div></div>', "learn");
      document.getElementById("qc-show").onclick = function () { document.getElementById("qc-ans").hidden = false; this.hidden = true; };
      document.getElementById("qc-yes").onclick = function () {
        var c = SRS.add(w.id); c.box = 4; c.due = Store.addDays(Store.today(), 8); Store.save(); known++; markWork(); Audio2.sfx.good({ quiet: true }); i++; draw();
      };
      document.getElementById("qc-no").onclick = function () { SRS.add(w.id); Store.save(); learn.push(w); markWork(); i++; draw(); };
    })();
  }
  function learnMode() { try { return localStorage.getItem("cbChinese.learnView") === "grid" ? "grid" : "path"; } catch (e) { return "path"; } }
  function learnPartBanner(w) {
    if (w === 0) return '<section class="card part1"><h2>Part 1 · Exam core (days 1–30)</h2><p class="sub">Everything you need for HSK 4 pay-and-benefits Chinese.</p></section>';
    if (w === 6) return '<section class="card part2"><h2>Part 2 · Advanced C&amp;B (days 31–60)</h2><p class="sub">Business-level HR vocabulary beyond HSK 4. The study plan schedules it after your exam — start earlier if you are ahead.</p></section>';
    if (w === 12) return '<section class="card part2"><h2>Part 3 · Exam year (days 61–90)</h2><p class="sub">Recruitment, Vietnam vs China terms, pay analytics, hard conversations, total rewards and an HSK 4 exam-skills week.</p></section>';
    return "";
  }
  /* Path view: one round node per day on a winding path; the next lesson gets a START bubble. Nothing is locked. */
  var PATH_X = [0, 38, 62, 38, 0, -38, -62, -38];
  function learnPath(plan, st) {
    var nxt = nextDay(), html = "";
    for (var w = 0; w < Math.ceil(plan.length / 5); w++) {
      var weekDays = plan.slice(w * 5, w * 5 + 5);
      html += learnPartBanner(w);
      var doneN = weekDays.filter(function (p) { return (st.days[p.day] || {}).completed; }).length;
      html += '<div class="wk-band g' + (w % 6) + '"><span>Week ' + (w + 1) + "</span><b>" + esc(weekDays[0].en.replace(/^Review.*/, "") || weekDays[1].en) + "</b><em>" + doneN + "/" + weekDays.length + "</em></div><div class=\"path\">";
      weekDays.forEach(function (p, i) {
        var d = DAYMAP[p.day], rec = st.days[p.day] || {}, isNext = nxt && nxt.day === p.day, review = p.type === "review";
        var x = PATH_X[(w * 5 + i) % PATH_X.length];
        var ws = d ? dayWords(d) : [], inSrs = ws.filter(function (y) { return SRS.has(y.id); }).length;
        var pct = !d ? 0 : rec.completed ? 1 : review ? (rec.quizBest || 0) / 10 : inSrs / Math.max(1, ws.length);
        var cls = "pnode" + (rec.completed ? " done" : "") + (isNext ? " next" : "") + (review ? " review" : "") + (d ? "" : " soon");
        var ico = rec.completed ? "✓" : review ? "🎁" : isNext ? "★" : String(p.day);
        html += '<div class="pn" style="--x:' + x + 'px">' + (isNext ? '<span class="pstart">START</span>' : "") +
          (d ? '<a class="' + cls + '" href="#/day/' + p.day + '" style="--pct:' + Math.round(pct * 100) + '" aria-label="Day ' + p.day + ": " + esc(p.en) + (rec.completed ? (rec.cu ? ", done as a short catch-up lesson" : ", done") : "") + '"><i>' + ico + "</i></a>" : '<span class="' + cls + '"><i>' + p.day + "</i></span>") +
          '<span class="plab zh">' + esc(p.zh) + "</span></div>";
      });
      html += "</div>";
    }
    return html;
  }
  function learnGrid(plan, st) {
    var html = "";
    for (var w = 0; w < Math.ceil(plan.length / 5); w++) {
      var weekDays = plan.slice(w * 5, w * 5 + 5);
      html += learnPartBanner(w).replace(/^<section class="card part1">.*?<\/section>$/, "");
      html += '<h2 class="week-h"><span class="wk g' + (w % 6) + '">Week ' + (w + 1) + "</span></h2><div class=\"daygrid\">";
      weekDays.forEach(function (p) {
        var d = DAYMAP[p.day], rec = st.days[p.day] || {};
        var inner, meta;
        if (d) {
          var ws = dayWords(d), inSrs = ws.filter(function (x) { return SRS.has(x.id); }).length;
          var pct = p.type === "review" ? (rec.quizBest || 0) / 10 : inSrs / Math.max(1, ws.length);
          meta = (p.type === "review" ? "Review" : inSrs + "/" + ws.length + " words") + (rec.quizBest != null ? " · " + rec.quizBest + "/10" : "") + (rec.completed && rec.cu ? " · catch-up" : "");
          inner = '<span class="dnum">' + (rec.completed ? "✓ " : "") + "Day " + p.day + '</span><span class="dzh zh">' + esc(p.zh) + '</span><span class="dmean">' + M(p) + '</span><span class="dbar"><i style="width:' + Math.round(pct * 100) + '%"></i></span><span class="dmeta">' + meta + "</span>";
          html += '<a class="daycard card' + (p.type === "review" ? " review" : "") + (rec.completed ? " done" : "") + '" href="#/day/' + p.day + '">' + inner + "</a>";
        } else {
          html += '<div class="daycard card locked"><span class="dnum">Day ' + p.day + '</span><span class="dzh zh">' + esc(p.zh) + '</span><span class="dmeta">Coming soon</span></div>';
        }
      });
      html += "</div>";
    }
    return html;
  }
  /* ---------- word packs: HSK 5 words and the extra HSK 4 words share these screens ---------- */
  function packGrid(kind) {
    return '<div class="daygrid">' + packList(kind).map(function (pk) {
      var n = pk.words.length, inSrs = pk.words.filter(function (w) { return SRS.has(w.id); }).length, rec = packRec(kind, pk.pack), done = packDone(kind, pk.pack);
      return '<a class="daycard card' + (done ? " done" : "") + '" href="#/pack/' + kind + "/" + pk.pack + '"><span class="dnum">' + (done ? "✓ " : "") + "Pack " + pk.pack + '</span><span class="dzh zh">' +
        esc(pk.words.slice(0, 3).map(function (w) { return w.hanzi; }).join(" · ")) + '</span><span class="dbar"><i style="width:' + Math.round(inSrs / n * 100) + '%"></i></span><span class="dmeta">' +
        inSrs + "/" + n + " in review" + (rec ? " · quiz " + rec.b + "/10" : "") + "</span></a>";
    }).join("") + "</div>";
  }
  function packStats(kind) {
    var l = packList(kind), words = 0, inSrs = 0, started = 0, done = 0;
    l.forEach(function (pk) {
      var k = pk.words.filter(function (w) { return SRS.has(w.id); }).length;
      words += pk.words.length; inSrs += k; if (k || packRec(kind, pk.pack)) started++; if (packDone(kind, pk.pack)) done++;
    });
    return { packs: l.length, words: words, inSrs: inSrs, started: started, done: done };
  }
  function viewH5Words() {
    var st = packStats("h5");
    render(h5Seg("words") + '<section class="card g-blue"><h2>📗 HSK 5 words</h2><p class="sub">' + st.words + " words in " + st.packs + " packs: the HSK 5 list without the words you already have. Add a pack to review, then take its quiz.</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(st.inSrs / Math.max(1, st.words) * 100) + '%"></span></div><p class="xp-t">' + st.inSrs + " / " + st.words + " in review · " + st.done + " / " + st.packs + " packs finished</p></section>" + packGrid("h5"), "learn");
  }
  function viewExtraList() {
    var st = packStats("x4");
    render('<a class="back" href="#/learn/core">‹ HSK words</a><section class="card g-teal"><h2>📘 Extra HSK 4 words</h2><p class="sub">' + st.words + " official HSK 1–4 words that no lesson or set teaches yet, in " + st.packs + " packs.</p>" +
      '<div class="xpbar"><span style="width:' + Math.round(st.inSrs / Math.max(1, st.words) * 100) + '%"></span></div><p class="xp-t">' + st.inSrs + " / " + st.words + " in review · " + st.done + " / " + st.packs + " packs finished</p></section>" +
      '<p class="h5-note" role="note">⚑ These packs are new and not yet checked by a teacher. Use the flag button to report mistakes.</p>' + packGrid("x4"), "learn");
  }
  function viewPack(kind, n) {
    kind = kind === "h5" ? "h5" : "x4";
    var pk = packGet(kind, n), home = packHome(kind);
    if (!pk) { render('<p class="empty">Pack not found. <a href="' + home + '">Back</a></p>', "learn"); return; }
    var prev = packGet(kind, n - 1), next = packGet(kind, n + 1), ws = pk.words, notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length, rec = packRec(kind, n), arg = "p-" + kind + "-" + n;
    var html = '<header class="dayhead card ' + (kind === "h5" ? "g-blue" : "g-teal") + '"><div class="dh-nav">' + (prev ? '<a class="pill" href="#/pack/' + kind + "/" + prev.pack + '">‹ ' + prev.pack + "</a>" : '<a class="pill" href="' + home + '">‹ All</a>') +
      '<span class="dh-day">' + packName(kind) + "</span>" + (next ? '<a class="pill" href="#/pack/' + kind + "/" + next.pack + '">' + next.pack + " ›</a>" : "<span></span>") + "</div>" +
      "<h1>Pack " + n + '</h1><p class="sub">' + ws.length + " words" + (rec ? " · quiz best " + rec.b + "/10" : "") + "</p></header>" +
      '<div class="actions"><a class="btn primary" href="#/cards/' + arg + '">🃏 Flashcards</a><a class="btn" href="#/game/quick/' + arg + '" id="pack-quiz">❓ Quiz</a>' +
      (notIn ? '<button class="btn" id="add-all">＋ Add ' + notIn + " to review</button>" : '<span class="ok-text">✓ All in review</span>') + "</div>" +
      (pk.checked ? "" : '<p class="h5-note" role="note">⚑ ' + (kind === "h5" ? "HSK 5 content is new and not yet checked by a teacher." : "This pack is new and not yet checked by a teacher.") + " Use the flag button on a word to report mistakes.</p>") +
      ws.map(function (w) { return wordCard(w, { flag: true, soft: true }); }).join("");
    render(html, "day");
    var add = document.getElementById("add-all");
    if (add) add.onclick = function () {
      SRS.addMany(ws.map(function (w) { return w.id; })); if (kind === "x4") x4Want = true;
      Game.award(5); UI.toast(notIn + " words added to review", "➕"); viewPack(kind, n); refreshChrome();
    };
  }

  /* Word families: a character and the HSK 1-4 words built with it. Tap a word for its card. */
  function viewFamilies() {
    var F = x4Index().fam;
    render('<a class="back" href="#/learn/core">‹ HSK words</a><section class="card g-violet"><h2>🧬 Word families</h2><p class="sub">' + F.length + " characters and the HSK 1–4 words built with them. Open a character to see its family. Tap a word for its card.</p></section>" +
      '<p class="h5-note" role="note">⚑ This list is new and not yet checked by a teacher. Use the flag button at the top to report mistakes.</p>' +
      F.map(function (f) {
        return '<details class="fam card"><summary><span class="hz">' + esc(f.char) + '</span><span class="fam-t">' + PY(f.pinyin) + "<small>" + M(f.note) + '</small></span><span class="tag">' + f.words.length + " words</span></summary>" +
          '<div class="wlist">' + f.words.map(function (w) {
            return '<div class="wl-row"><div>' + wordBtn(w.ref, w.hanzi) + " " + PY(w.pinyin) + '<div class="dim">' + M(w) + "</div></div>" + levelBadge(w.level) + "</div>";
          }).join("") + "</div></details>";
      }).join(""), "learn");
  }
  /* HSK 5 practice: the four drill games on the HSK 5 sets; best scores are kept apart from HSK 4 (games.confuse5, ...) */
  function viewH5Practice() {
    var D = window.CB_HSK5_DRILLS || {}, s = Store.state;
    render(h5Seg("practice") + '<section class="card g-coral"><h2>🎯 HSK 5 practice</h2><p class="sub">The same four games, with HSK 5 questions. Scores here are kept apart from your HSK 4 scores.</p></section><div class="glist">' +
      ["confuse", "order", "picture", "measure"].map(function (id) {
        var g = Games.LIST.filter(function (x) { return x.id === id; })[0], st = s.games[id + "5"] || {};
        return '<a class="grow" href="#/game/' + id + '/h5"><span class="g-ico">' + g.icon + '</span><span class="g-txt"><b>' + g.name + "</b><small>" + (D[id] || []).length + " questions · " + esc(Games.H5_DESC[id]) + "</small></span>" +
          (st.plays ? '<span class="g-best">Best ' + st.best + "</span>" : '<span class="g-go">▶</span>') + "</a>";
      }).join("") + "</div>", "learn");
  }
  /* Learn: the lesson to do now, the next three, then everything else one tap away (all lessons, word lists, more courses). */
  function viewLearnNow() {
    var st = Store.state, nd = nextDay(), cut = coreCut(), done = DAYS.filter(function (d) { return (st.days[d.day] || {}).completed; }).length;
    var next = DAYS.filter(function (d) { return d.day > nd.day && !(st.days[d.day] || {}).completed; }).slice(0, 3);
    var allDone = DAYS.every(function (d) { return (st.days[d.day] || {}).completed; });
    var html = '<a class="searchbar card" href="#/search">🔎 <span>Search ' + WORDS.length + ' words — hanzi, pinyin, Việt, English</span></a>' + learnSeg("cb", true) +
      '<section class="card learn-now g-violet"><small>' + (allDone ? "ALL LESSONS DONE · REVISIT" : "NOW · DAY " + nd.day + (examLeft() != null && examLeft() >= 0 ? " OF " + cut + " BEFORE THE EXAM" : " OF " + DAYS.length)) + '</small><b class="zh">' + esc(nd.title.zh) + "</b><em>" + M(nd.title) + "</em>" +
      '<span class="ln-bar" role="img" aria-label="' + done + " of " + cut + ' lessons done"><i style="width:' + Math.min(100, Math.round(done / Math.max(1, cut) * 100)) + '%"></i></span>' +
      '<a class="tm-go" id="learn-go" href="#/day/' + nd.day + '">▶ ' + ((st.days[nd.day] || {}).best ? "Continue lesson" : "Start lesson") + "</a></section>" +
      (next.length ? '<section class="card ln-next"><h3 class="sec">Coming next</h3>' + next.map(function (d) {
        return '<a class="ln-row" href="#/day/' + d.day + '"><span class="ln-n">' + d.day + '</span><span class="ln-t"><b class="zh">' + esc(d.title.zh) + "</b><small>" + M(d.title) + '</small></span><span class="lc-go" aria-hidden="true">›</span></a>';
      }).join("") + "</section>" : "") +
      wqRow() +
      '<a class="trackrow toolrow" href="#/learn/all"><span class="t-ico">🗂️</span><span class="tr-t"><small>' + done + " done · about " + cut + " fit before your exam</small><b>All " + DAYS.length + ' lessons</b></span><span class="tr-go">›</span></a>' +
      '<details class="more learn-more"><summary><span>More courses: HSK 5 · C&amp;B Pro track</span></summary>' +
      '<a class="trackrow toolrow" href="#/track"><span class="t-ico">🎓</span><span class="tr-t"><small>6-month track · writing templates, role-plays</small><b>C&amp;B Professional Chinese</b></span><span class="tr-go">›</span></a>' +
      '<a class="trackrow toolrow" href="#/learn/h5" data-level="5"><span class="t-ico">📗</span><span class="tr-t"><small>Next level · word packs and practice</small><b>HSK 5</b></span><span class="tr-go">›</span></a></details>';
    render(html, "learn");
  }
  function viewLearn(sub) {
    if (sub === "core" || sub === "found") return viewCoreList(sub);
    if (sub === "mine") return viewMine();
    if (sub === "h5" || (!sub && Store.state.settings.level === 5)) return viewH5Words();
    if (sub === "h5p") return viewH5Practice();
    if (sub === "extra") return viewExtraList();
    var st = Store.state, plan = window.CB_PLAN || [], mode = learnMode();
    if (sub !== "all") return viewLearnNow();
    var html = '<a class="pill" href="#/learn">‹ Learn</a>' +
      '<div class="vtoggle" role="group" aria-label="Lesson view"><button type="button" data-lv="path" class="' + (mode === "path" ? "on" : "") + '" aria-pressed="' + (mode === "path") + '">Path</button><button type="button" data-lv="grid" class="' + (mode === "grid" ? "on" : "") + '" aria-pressed="' + (mode === "grid") + '">Grid</button></div>';
    html += mode === "path" ? learnPath(plan, st) : learnGrid(plan, st);
    render(html, "learn");
    [].forEach.call(document.querySelectorAll("[data-lv]"), function (b) { b.onclick = function () { try { localStorage.setItem("cbChinese.learnView", b.getAttribute("data-lv")); } catch (e) { /* ignore */ } viewLearn("all"); }; });
    var nx = document.querySelector(".pnode.next");
    if (nx && mode === "path") setTimeout(function () { try { nx.scrollIntoView({ block: "center", behavior: UI.reduced ? "auto" : "smooth" }); } catch (e) { /* ignore */ } }, 120);
  }

  /* ---------- day ---------- */
  function viewDay(n, tab) {
    var d = DAYMAP[n];
    if (!d) { render('<p class="empty">Day not available. <a href="#/learn">Back</a></p>'); return; }
    var rk = d.reading ? d.reading.kind : d._rk; // _rk/_g: flags from the light index before full data loads
    var tabs = [["words", "Words"], ["reading", rk === "passage" ? "Reading" : "Dialogue"]];
    if (d.grammar || d._g) tabs.push(["grammar", "Grammar"]);
    tabs.push(["practice", "Practice"], ["quiz", "Quiz"]);
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = "words";
    var html = '<header class="dayhead card g-w' + (Math.floor((n - 1) / 5) % 6) + '">' +
      '<div class="dh-nav">' + (DAYMAP[n - 1] ? '<a class="pill" href="#/day/' + (n - 1) + '">‹ ' + (n - 1) + "</a>" : "<span></span>") +
      '<span class="dh-day">Day ' + n + (d.type === "review" ? " · Review" : "") + "</span>" +
      (DAYMAP[n + 1] ? '<a class="pill" href="#/day/' + (n + 1) + '">' + (n + 1) + " ›</a>" : "<span></span>") + "</div>" +
      '<h1 class="zh">' + esc(d.title.zh) + '</h1><p class="sub">' + M(d.title) + "</p></header>" +
      '<nav class="seg" role="tablist">' + tabs.map(function (t) {
        return '<a role="tab" class="' + (t[0] === tab ? "active" : "") + '" href="#/day/' + n + "/" + t[0] + '">' + t[1] + "</a>";
      }).join("") + "</nav><section id=\"tabbody\"></section>";
    render(html, "day");
    var body = document.getElementById("tabbody");
    ({ words: tabWords, reading: tabReading, grammar: tabGrammar, practice: tabPractice, quiz: tabQuiz })[tab](d, body);
    var act = document.querySelector(".seg .active"); if (act && act.scrollIntoView) act.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function exHTML(w, soft) {
    return w.example ? '<div class="w-ex"><div class="ex-zh"><span class="zh">' + esc(w.example.zh) + "</span>" + (soft ? SAYX : SAY)(w.example.zh) + "</div>" + PY(w.example.py) + '<div class="tr">' + M(w.example) + "</div></div>" : "";
  }
  /* Play button that is left out when the audio exists in general but this text has no clip (packs without sentence audio). */
  function SAYX(t, voice, big) { return !Audio2.available() || Audio2.has(t, voice) || Audio2.canSpeak() ? SAY(t, voice, big) : ""; } // the phone's voice covers text with no recording
  /* o.flag: add a "report a problem" link for this word · o.soft: leave out play buttons that have no recording */
  function wordCard(w, o) {
    o = o || {};
    var say = o.soft ? SAYX : SAY;
    return '<article class="word card" id="w-' + esc(w.id) + '">' +
      '<div class="w-top"><div><div class="hz">' + esc(w.hanzi) + "</div>" + PY(w.pinyin) + "</div>" + say(w.hanzi, null, true) + "</div>" +
      '<div class="w-mean">' + M(w) + "</div>" +
      '<div class="tags"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + boxBadge(w.id) + "</div>" +
      (w.note ? '<div class="w-note">💡 ' + M(w.note) + "</div>" : "") +
      '<div class="colls">' + (w.collocations || []).map(function (c) {
        return '<div class="coll"><div><span class="zh">' + esc(c.zh) + "</span> " + PY(c.py) + '<div class="dim">' + M(c) + "</div></div>" + say(c.zh) + "</div>";
      }).join("") + "</div>" +
      exHTML(w, o.soft) + '<div class="w-x" data-wx="' + esc(w.id) + '">' + wordExtras(w) + "</div>" +
      (o.flag ? '<button type="button" class="linklike w-flag" data-flag="word:' + esc(w.id) + '" data-flag-label="' + esc(w.hanzi + " · " + w.pinyin) + '">⚑ Report a problem</button>' : "") + "</article>";
  }
  function tabWords(d, body) {
    var ws = dayWords(d), notIn = ws.filter(function (w) { return !SRS.has(w.id); }).length;
    var html = '<div class="actions day-actions"><a class="btn primary" href="#/cards/' + d.day + '">🃏 Flashcards (' + ws.length + ")</a>" +
      '<a class="btn" href="#/game/write/' + d.day + '">✍️ Write</a>' +
      (notIn ? '<button class="btn" id="add-all">＋ Add to review</button>' : '<span class="ok-text">✓ All in review</span>') + "</div>";
    if (d.type === "review") {
      html += '<p class="sub">Words from days ' + esc((d.reviewOf || []).join(", ")) + ".</p>" +
        '<a class="cta card g-boss" href="#/game/boss/' + d.day + '"><span class="cta-l"><small>Review boss</small><b>🐉 Boss Battle</b><em>Beat the boss with these words</em></span><span class="cta-go">⚔️</span></a>' +
        '<div class="wlist card">' + ws.map(function (w) {
          return '<div class="wl-row"><div><span class="zh">' + esc(w.hanzi) + "</span> " + PY(w.pinyin) + '<div class="dim">' + M(w) + "</div></div>" + SAY(w.hanzi) + "</div>";
        }).join("") + "</div>";
    } else html += ws.map(wordCard).join("");
    body.innerHTML = html;
    var add = document.getElementById("add-all");
    if (add) add.onclick = function () { SRS.addMany(ws.map(function (w) { return w.id; })); UI.toast("Added to review — due today", "✅"); route(); };
  }

  function tabReading(d, body) {
    var r = d.reading;
    var first = r.lines[0] && r.lines[0].speaker;
    var html = '<div class="card reading-head"><h2 class="zh">' + esc(r.title.zh) + '</h2><p class="sub">' + M(r.title) + "</p>" +
      (r.scene ? '<p class="scene">' + M(r.scene) + "</p>" : "") +
      '<div class="actions"><button class="btn primary" id="play-all">▶ Play all</button><button class="btn" id="tog-tr" aria-pressed="false">Show translation</button></div></div>' +
      '<div class="chat" id="lines">' + r.lines.map(function (l) {
        var voice = l.speaker ? Audio2.voiceFor(l.speaker) : "F";
        if (!l.speaker) return '<div class="para card"><div class="zh"><span class="zh-t">' + linkWords(l.zh) + "</span>" + SAY(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + "</div></div>";
        var side = l.speaker === first ? "left" : "right";
        return '<div class="msg ' + side + '"><div class="ava ' + (voice === "M" ? "m" : "f") + '">' + esc(l.speaker.charAt(0)) + '</div><div class="bubble"><div class="spk">' + esc(l.speaker) + "</div>" +
          '<div class="zh">' + linkWords(l.zh) + "</div>" + PY(l.py) + '<div class="tr">' + M(l) + '</div><div class="b-say">' + SAY(l.zh, voice) + "</div></div></div>";
      }).join("") + "</div>";
    if (r.notes && r.notes.length) html += '<div class="card"><h3>Notes</h3>' + r.notes.map(function (n) {
      return '<div class="coll"><div><span class="zh">' + esc(n.zh) + "</span> " + PY(n.py) + '<div class="dim">' + M(n) + "</div></div>" + SAY(n.zh) + "</div>";
    }).join("") + "</div>";
    body.innerHTML = html;
    var lines = document.getElementById("lines");
    document.getElementById("tog-tr").onclick = function () {
      var on = lines.classList.toggle("show-tr");
      this.textContent = on ? "Hide translation" : "Show translation";
      this.setAttribute("aria-pressed", on);
    };
    document.getElementById("play-all").onclick = function () {
      Audio2.playAll(r.lines.map(function (l) { return { text: l.zh, voice: l.speaker ? Audio2.voiceFor(l.speaker) : "F" }; }));
    };
  }

  function tabGrammar(d, body) {
    var g = d.grammar;
    body.innerHTML = '<div class="card grammar"><div class="g-point"><span class="zh">' + esc(g.point) + "</span>" + PY(g.py) + "</div>" +
      '<p class="g-mean">' + M(g.meaning) + "</p>" +
      '<pre class="structure zh">' + esc(g.structure) + "</pre>" +
      '<p class="g-exp">' + M(g.explain) + "</p></div>" +
      '<h3 class="sec">Examples</h3>' + g.examples.map(function (e, i) {
        return '<div class="card ex"><span class="ex-n">' + (i + 1) + '</span><div class="ex-zh"><span class="zh">' + esc(e.zh) + "</span>" + SAY(e.zh) + "</div>" + PY(e.py) + '<div class="tr">' + M(e) + "</div></div>";
      }).join("");
  }

  /* ---------- practice ---------- */
  function tabPractice(d, body) {
    var ex = d.exercises || {};
    body.innerHTML =
      '<section class="card pr"><h2>🧩 Matching</h2><p class="sub">Tap a word, then its meaning.</p><div id="match"></div></section>' +
      (ex.fill && ex.fill.length ? '<section class="card pr"><h2>✍️ Fill in the blank</h2><p class="sub">Tap a blank, then a word from the bank.</p><div id="fill"></div></section>' : "") +
      (ex.translate && ex.translate.length ? '<section class="card pr"><h2>🌏 Translate</h2><p class="sub">Write it in Chinese, then compare.</p><div id="trans"></div></section>' : "");
    setupMatching(document.getElementById("match"), dayWords(d), d);
    if (ex.fill && ex.fill.length) setupFill(document.getElementById("fill"), ex.fill, d);
    if (ex.translate && ex.translate.length) setupTranslate(document.getElementById("trans"), ex.translate);
  }
  /* Matching: up to 5 pairs on the board plus one decoy meaning from another lesson.
     After each correct match the pair leaves, the next word from the day slides in, and both columns
     reshuffle — so there are always at least two choices and no answer can be found by elimination. */
  function setupMatching(el, words, d) {
    var BOARD = 5, queue, board, decoy, total, matched, sel, awarded = !!Store.day(d.day).practice.match; // XP only the first time
    function pickDecoy() {
      var ids = {}; words.forEach(function (w) { ids[w.id] = 1; });
      var pool = WORDS.filter(function (w) { return !ids[w.id] && w.vi && w.en && !w._mine; });
      return pool[Math.floor(Math.random() * pool.length)] || null;
    }
    function start() {
      queue = shuffle(words); total = queue.length; matched = 0; sel = null;
      board = queue.splice(0, Math.min(BOARD, queue.length)); decoy = pickDecoy();
      draw();
    }
    function draw(fresh) {
      sel = null; // a tap during the reshuffle pause must not leave an invisible selection
      var L = shuffle(board), R = shuffle(board.concat(decoy ? [decoy] : []));
      el.innerHTML = '<div class="match"><div class="mcol" data-side="L">' +
        L.map(function (w) { return '<button class="mbtn zh' + (fresh && w.id === fresh ? " pop-in" : "") + '" data-id="' + esc(w.id) + '">' + esc(w.hanzi) + "</button>"; }).join("") +
        '</div><div class="mcol" data-side="R">' +
        R.map(function (w) { return '<button class="mbtn" data-id="' + esc(w.id) + '">' + M(w) + "</button>"; }).join("") +
        '</div></div><div class="mfoot"><span id="mstat">' + matched + "/" + total + '</span><span class="muted">1 meaning is a decoy</span><button class="btn small" id="mreset">↻ New set</button></div>';
      el.querySelector("#mreset").onclick = start;
    }
    el.onclick = function (e) {
      var b = e.target.closest(".mbtn");
      if (!b || b.disabled) return;
      var side = b.parentNode.getAttribute("data-side");
      if (!sel || sel.side === side) {
        if (sel) sel.el.classList.remove("sel");
        sel = { el: b, side: side }; b.classList.add("sel"); Audio2.sfx.tap(); return;
      }
      var id = b.getAttribute("data-id");
      if (sel.el.getAttribute("data-id") === id) {
        [sel.el, b].forEach(function (x) { x.classList.remove("sel"); x.classList.add("done"); x.disabled = true; });
        matched++; Audio2.sfx.good(); sel = null;
        el.querySelector("#mstat").textContent = matched + "/" + total;
        var nw = queue.shift();
        board = board.filter(function (w) { return w.id !== id; });
        if (nw) board.push(nw);
        if (matched === total) {
          Store.day(d.day).practice.match = true;
          if (!awarded) { awarded = true; Game.award(5, rect(el)); } else Store.save();
          UI.confetti(50);
          setTimeout(function () { if (el.isConnected) { el.querySelector(".match").innerHTML = '<p class="ok-text center">✓ All ' + total + " words matched</p>"; } }, 450);
        } else setTimeout(function () { if (el.isConnected) draw(nw && nw.id); }, 350); // brief ✓, then reshuffle
      } else {
        var a = sel.el; a.classList.add("bad"); b.classList.add("bad"); Audio2.sfx.bad(); sel = null;
        setTimeout(function () { a.classList.remove("bad", "sel"); b.classList.remove("bad"); }, 450);
      }
    };
    start();
  }
  function setupFill(el, items, d) {
    var answers = items.map(function (it) { return it.answer; });
    var pool = dayWords(d).map(function (w) { return w.hanzi; }).filter(function (h) { return answers.indexOf(h) < 0; });
    var bank = shuffle(answers.concat(shuffle(pool).slice(0, Math.max(0, 10 - answers.length))));
    var active = 0, checked = false;
    el.innerHTML = '<ol class="fill">' + items.map(function (it, i) {
      var parts = it.zh.split("___");
      return '<li><div class="zh fill-s">' + esc(parts[0]) + '<button class="blank zh" data-i="' + i + '" aria-label="Blank ' + (i + 1) + '">　</button>' + esc(parts.slice(1).join("___")) + "</div>" +
        '<div class="tr">' + M(it) + '</div><div class="fb" id="fb' + i + '"></div></li>';
    }).join("") + '</ol><div class="bank sticky-bank">' + bank.map(function (b) { return '<button class="chip zh" type="button">' + esc(b) + "</button>"; }).join("") + "</div>" +
      '<div class="actions"><button class="btn primary" id="fcheck">Check</button><button class="btn" id="freset">Clear</button><span id="fscore" class="score"></span></div>';
    var blanks = el.querySelectorAll(".blank");
    function focus(i) { active = i; blanks.forEach(function (b, k) { b.classList.toggle("focus", k === i); }); }
    focus(0);
    blanks.forEach(function (b, i) { b.onclick = function () { if (b.dataset.v) { b.dataset.v = ""; b.textContent = "　"; b.classList.remove("ok", "no"); } focus(i); }; });
    el.querySelector(".bank").onclick = function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      var b = blanks[active]; b.dataset.v = c.textContent; b.textContent = c.textContent; b.classList.remove("ok", "no"); Audio2.sfx.tap();
      for (var k = 1; k <= blanks.length; k++) { var j = (active + k) % blanks.length; if (!blanks[j].dataset.v) { focus(j); return; } }
    };
    el.querySelector("#fcheck").onclick = function (ev) {
      var score = 0;
      blanks.forEach(function (b) {
        var i = +b.getAttribute("data-i"), ok = (b.dataset.v || "") === items[i].answer;
        b.classList.toggle("ok", ok); b.classList.toggle("no", !ok);
        document.getElementById("fb" + i).innerHTML = ok ? '<span class="good">✓ Correct</span>' : '<span class="bad-t">✗ Answer: <span class="zh">' + esc(items[i].answer) + "</span></span>";
        if (ok) score++;
      });
      el.querySelector("#fscore").textContent = score + "/" + items.length;
      if (score === items.length) Audio2.sfx.good({ quiet: true }); else Audio2.sfx.bad();
      var rec = Store.day(d.day).practice; rec.fill = Math.max(rec.fill || 0, score);
      if (!checked) { checked = true; Game.award(score, rect(ev.target)); } else Store.save();
    };
    el.querySelector("#freset").onclick = function () {
      blanks.forEach(function (b) { b.dataset.v = ""; b.textContent = "　"; b.classList.remove("ok", "no"); });
      el.querySelectorAll(".fb").forEach(function (f) { f.innerHTML = ""; });
      el.querySelector("#fscore").textContent = ""; focus(0);
    };
  }
  function setupTranslate(el, items) {
    var seen = {};
    el.innerHTML = '<ol class="trans">' + items.map(function (it, i) {
      return '<li><div class="prompt">' + M(it) + "</div>" +
        '<textarea class="zh" rows="2" placeholder="用中文写…" aria-label="Your translation ' + (i + 1) + '"></textarea>' +
        '<button class="btn small" data-show="' + i + '">Show answer</button>' +
        '<div class="model" id="model' + i + '" hidden><div class="ex-zh"><span class="zh">' + esc(it.zh) + "</span>" + SAY(it.zh) + "</div>" + PY(it.py) + "</div></li>";
    }).join("") + "</ol>";
    el.onclick = function (e) {
      var b = e.target.closest("[data-show]"); if (!b) return;
      var i = b.getAttribute("data-show"), m = document.getElementById("model" + i);
      m.hidden = !m.hidden; b.textContent = m.hidden ? "Show answer" : "Hide answer";
      if (!m.hidden && !seen[i]) { seen[i] = 1; Game.award(1, rect(b)); }
    };
  }

  /* ---------- day quiz: one question at a time ---------- */
  function optHTML(o) { return typeof o === "string" ? '<span class="zh">' + esc(o) + "</span>" : M(o); }
  function tabQuiz(d, body) {
    var qs = (d.quiz || []).map(function (q) { return { q: q, order: shuffle(q.options.map(function (_, k) { return k; })), chosen: null }; });
    var i = 0, score = 0, combo = 0, rec = Store.day(d.day);
    function draw() {
      if (i >= qs.length) return finish();
      var x = qs[i];
      body.innerHTML = '<div class="quizbox"><div class="qtop"><a class="qclose" href="#/day/' + d.day + '" aria-label="Close quiz">✕</a><span>Question ' + (i + 1) + "/" + qs.length + '</span><span>' + (combo >= 3 ? '<b class="combo">🔥 x' + combo + '</b> ' : "") + '⭐ ' + score + '</span></div><div class="bar"><span style="width:' + (i / qs.length * 100) + '%"></span></div>' +
        '<div class="card qcard" id="qcard"><p class="q zh">' + esc(x.q.q) + '</p><div class="opts">' +
        x.order.map(function (k, n) { return '<button class="opt" data-k="' + k + '"><span class="opt-n">' + "ABCD"[n] + "</span>" + optHTML(x.q.options[k]) + "</button>"; }).join("") +
        '</div><div id="qfb"></div></div></div>';
      body.querySelector(".opts").onclick = function (e) {
        var b = e.target.closest(".opt"); if (!b || x.chosen != null) return;
        x.chosen = +b.getAttribute("data-k");
        var ok = x.chosen === x.q.answer;
        Learn.record("q:" + d.day + ":" + (d.quiz || []).indexOf(x.q), { kind: "quiz", skill: "quiz", day: d.day, idx: (d.quiz || []).indexOf(x.q) }, ok);
        if (ok) { score++; combo++; Audio2.sfx.good(); } else { combo = 0; Audio2.sfx.bad(); UI.shake(document.getElementById("qcard")); }
        body.querySelectorAll(".opt").forEach(function (o) {
          var k = +o.getAttribute("data-k"); o.disabled = true;
          if (k === x.q.answer) o.classList.add("right"); else if (o === b) o.classList.add("wrong");
        });
        document.getElementById("qfb").innerHTML = '<div class="qexp ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ Correct! " : "✗ Answer: " + optHTML(x.q.options[x.q.answer]) + ". ") + (x.q.explain ? M(x.q.explain) : "") + "</div>" +
          '<button class="btn primary wide" id="qnext">' + (i + 1 < qs.length ? "Next ›" : "See results") + "</button>";
        if (!ok && window.AI) AI.attachExplain(document.getElementById("qfb"));
        document.getElementById("qnext").onclick = function () { i++; draw(); };
      };
    }
    function finish() {
      var first = rec.quizBest == null;
      rec.quizBest = Math.max(rec.quizBest || 0, score);
      if (score >= 7) { if (!rec.completed) rec.completedOn = Store.today(); rec.completed = true; delete rec.cu; } // the full quiz makes a catch-up lesson a full one
      if (score === qs.length) Store.state.stats.perfectQuizzes++;
      var xp = score * 2 + (score === qs.length ? 10 : 0);
      var mood = score === qs.length ? "cheer" : score >= 7 ? "happy" : "sad";
      body.innerHTML = '<div class="card result">' + (score >= 7 ? UI.anim("cat-love", 150, UI.mascot(mood, 96)) : UI.mascot(mood, 96)) + '<h2>' + score + " / " + qs.length + "</h2><p>" +
        (score >= 7 ? "Day " + d.day + " completed ✓" : "Get 7 or more to complete the day") + "</p>" +
        '<div class="actions center"><button class="btn primary" id="qretry">↻ Try again</button><a class="btn" href="#/learn">Back to plan</a></div></div>' +
        '<h3 class="sec">Answer key</h3><div class="card akey">' + qs.map(function (x, n) {
          var ok = x.chosen === x.q.answer;
          return '<div class="ak-row ' + (ok ? "ok" : "no") + '"><span class="ak-n">' + (n + 1) + '</span><div><div class="zh">' + esc(x.q.q) + '</div><div>' + (ok ? "✓ " : "✗ ") + optHTML(x.q.options[x.q.answer]) + "</div></div></div>";
        }).join("") + "</div>";
      if (score >= 7) UI.confetti(score === qs.length ? 150 : 80);
      window.scrollTo(0, 0);
      Game.award(xp);
      document.getElementById("qretry").onclick = function () { tabQuiz(d, body); window.scrollTo(0, 0); };
      void first;
    }
    setKeys(function (e) {
      if (typing(e)) return;
      if (/^[1-4]$/.test(e.key)) { var b = body.querySelectorAll(".opt")[+e.key - 1]; if (b && !b.disabled) b.click(); }
      else if (e.key === "Enter") { var n = document.getElementById("qnext"); if (n) n.click(); }
    });
    draw();
  }

  /* ---------- flashcards (3D flip + swipe) ---------- */
  function viewCards(arg) {
    var words, title, back;
    if (arg === "all") { words = WORDS; title = "All words"; back = "#/learn"; }
    else if (arg === "mine") { words = (Store.state.custom || []).map(function (w) { return WORDMAP[w.id]; }).filter(Boolean); title = "My words"; back = "#/learn/mine"; if (!words.length) { location.replace("#/learn/mine"); return; } }
    else if (packFromArg(arg)) {
      var pa = packFromArg(arg);
      if (!pa.pack) { render('<p class="empty">Pack not found.</p>'); return; }
      words = pa.pack.words; title = packName(pa.kind) + " · Pack " + pa.n; back = "#/pack/" + pa.kind + "/" + pa.n;
    }
    else if (/^k\d+$/.test(arg || "")) {
      var cs = COREMAP[parseInt(arg.slice(1), 10)];
      if (!cs) { render('<p class="empty">Set not found.</p>'); return; }
      words = cs.words; title = trackName(isFound(cs) ? "found" : "core") + " · Set " + setLabel(cs.set); back = "#/core/" + cs.set;
    }
    else {
      var d = DAYMAP[parseInt(arg, 10)];
      if (!d) { render('<p class="empty">Day not found.</p>'); return; }
      words = dayWords(d); title = "Day " + d.day + " · " + d.title.zh; back = "#/day/" + d.day + "/words";
    }
    runDeck({ title: title, words: words, mode: "learn", back: back });
  }
  function runDeck(opts) {
    var queue = shuffle(opts.words), pos = 0, flipped = false, right = 0, wrong = 0, missed = [], requeued = {}, busy = false, deckHash = location.hash;
    if (!opts.onDone) workDone = false; // a fresh deck (not a session step) starts clean
    function draw() {
      if (pos >= queue.length) return finish();
      var w = queue[pos]; flipped = false; busy = false;
      render('<div class="deck"><div class="deck-top"><a class="pill" href="' + opts.back + '">✕</a><span class="zh">' + esc(opts.title) + "</span><span>" + (pos + 1) + "/" + queue.length + "</span></div>" +
        '<div class="bar"><span style="width:' + Math.round(pos / queue.length * 100) + '%"></span></div>' +
        '<div class="stage"><div class="fcard" id="card"><div class="face front"><div class="hz big">' + esc(w.hanzi) + "</div>" + SAY(w.hanzi, null, true) +
        (requeued[w.id] ? '<p class="dim">practice again</p>' : '<p class="hint">Tap to flip</p>') + "</div>" +
        '<div class="face back"><div class="hz mid">' + esc(w.hanzi) + '</div><div class="big-py">' + esc(w.pinyin) + '</div><div class="w-mean">' + M(w) + "</div>" +
        '<div class="tags center"><span class="tag">' + esc(w.pos) + "</span>" + levelBadge(w.level) + "</div>" +
        exHTML(w) +
        '</div></div><div class="swipe-l">Again</div><div class="swipe-r">Got it</div></div>' +
        '<div class="deck-btns" id="dbtns"><button class="btn primary wide" id="flip">Show answer</button></div>' +
        '<p class="hint center">After flipping: swipe → got it · ← again</p></div>', "deckview");
      var card = document.getElementById("card");
      card.addEventListener("click", function (e) { if (!e.target.closest(".say") && !card.dataset.dragged) flip(); card.dataset.dragged = ""; });
      document.getElementById("flip").onclick = flip;
      attachSwipe(card);
    }
    function flip() {
      if (flipped) return;
      flipped = true; Audio2.sfx.tap();
      document.getElementById("card").classList.add("flipped");
      document.getElementById("dbtns").innerHTML =
        '<button class="btn bad wide" id="again">✗ Again</button><button class="btn good wide" id="gotit">✓ Got it</button>';
      document.getElementById("again").onclick = function () { grade(false); };
      document.getElementById("gotit").onclick = function () { grade(true); };
    }
    function attachSwipe(card) {
      var sx = 0, dx = 0, dragging = false, stage = card.parentNode;
      card.addEventListener("pointerdown", function (e) { if (!flipped || busy) return; dragging = true; sx = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
      card.addEventListener("pointermove", function (e) {
        if (!dragging) return; dx = e.clientX - sx;
        if (Math.abs(dx) > 6) card.dataset.dragged = "1";
        card.style.transform = "translateX(" + dx + "px) rotate(" + dx / 18 + "deg) rotateY(180deg)";
        stage.classList.toggle("go-r", dx > 60); stage.classList.toggle("go-l", dx < -60);
      });
      function end() {
        if (!dragging) return; dragging = false; card.style.transition = "";
        stage.classList.remove("go-r", "go-l");
        if (dx > 90) grade(true); else if (dx < -90) grade(false); else card.style.transform = "";
      }
      card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
    }
    function grade(ok) {
      if (busy) return; busy = true;
      var w = queue[pos], card = document.getElementById("card");
      var s = Store.state;
      markWork();
      if (ok) { var cr = card && card.getBoundingClientRect(); if (cr) UI.hearts(cr.left + cr.width / 2, cr.top + cr.height / 2, 6); }
      if (!requeued[w.id]) {
        SRS.grade(w.id, ok);
        s.stats.cards++; if (ok) { s.stats.correct++; right++; } else { wrong++; missed.push(w); }
        Game.award(ok ? 2 : 1, { silent: true });
      }
      if (!ok && opts.mode === "review" && !requeued[w.id]) { requeued[w.id] = true; queue.push(w); }
      if (ok) Audio2.sfx.good({ quiet: true }); else Audio2.sfx.bad(); // hearts already launched from the card above
      if (card) { card.style.transition = "transform .3s ease, opacity .3s"; card.style.transform = "translateX(" + (ok ? 120 : -120) + "vw) rotate(" + (ok ? 20 : -20) + "deg) rotateY(180deg)"; card.style.opacity = "0"; }
      UI.pop(ok ? "+2 XP" : "+1 XP", null, innerHeight * 0.3, ok ? "good" : "");
      setTimeout(function () { if (location.hash !== deckHash) return; pos++; draw(); }, UI.reduced ? 0 : 260); // don't redraw over a page the learner moved to
    }
    function finish() {
      setKeys(null);
      if (opts.onDone) return opts.onDone({ right: right, wrong: wrong });
      var mood = wrong === 0 ? "cheer" : right >= wrong ? "happy" : "wow";
      render('<div class="card result">' + UI.mascot(mood, 96) + "<h2>Session complete</h2>" +
        '<p class="big-score"><span class="good">' + right + ' ✓</span> · <span class="bad-t">' + wrong + " ✗</span></p>" +
        (opts.mode === "review" ? '<p class="sub">Missed cards went back to box 1. Correct cards moved up a box.</p>' : '<p class="sub">These words are now in your review deck.</p>') +
        '<div class="actions center">' + (missed.length ? '<button class="btn primary" id="again-missed">Study ' + missed.length + " missed</button>" : "") +
        '<a class="btn" href="' + opts.back + '">Done</a></div></div>');
      if (wrong === 0 && right > 0) UI.confetti(100);
      var am = document.getElementById("again-missed");
      if (am) am.onclick = function () { runDeck({ title: opts.title + " · missed", words: missed, mode: "learn", back: opts.back }); };
    }
    setKeys(function (e) {
      if (typing(e)) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!flipped) flip(); }
      else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) grade(false);
      else if (flipped && (e.key === "2" || e.key === "ArrowRight")) grade(true);
    });
    draw();
  }

  /* ---------- review ---------- */
  function mistakesCard() {
    return mistakesCardInner() + '<a class="cta card g-teal" href="#/listen-mode"><span class="cta-l"><small>Hands-free</small><b>🎧 Listen mode</b><em>Words and examples play by themselves</em></span><span class="cta-go">▶</span></a>';
  }
  function mistakesCardInner() {
    var n = Learn.count();
    return n ? '<a class="cta card g-coral" href="#/mistakes"><span class="cta-l"><small>Mistake notebook</small><b>📒 ' + n + ' to fix</b><em>Weak areas &amp; targeted drills</em></span><span class="cta-go">▶</span></a>' :
      '<a class="cta card" href="#/mistakes"><span class="cta-l"><small>Mistake notebook</small><b>📒 No open mistakes</b><em>See your weak-area report</em></span><span class="cta-go">▶</span></a>';
  }
  function viewReview() {
    var ids = SRS.dueIds(WORDMAP), bc = SRS.boxCounts(), total = 0;
    Object.keys(bc).forEach(function (k) { total += bc[k]; });
    var max = Math.max(1, bc[1], bc[2], bc[3], bc[4], bc[5]);
    var boxes = '<div class="card boxes">' + [1, 2, 3, 4, 5].map(function (b) {
      return '<div class="box"><div class="bcol"><i class="b' + b + '" style="height:' + Math.max(6, bc[b] / max * 100) + '%"></i></div><b>' + bc[b] + '</b><span>Box ' + b + "</span><small>" + SRS.INTERVALS[b] + "d</small></div>";
    }).join("") + "</div>";
    if (!ids.length) {
      var nd = SRS.nextDue();
      render('<div class="card result">' + (total ? UI.mascot("think", 88) : UI.anim("cat-sleep", 150, UI.mascot("sleepy", 88))) + "<h2>" + (total ? "All caught up!" : "Nothing to review yet") + "</h2>" +
        '<p class="sub">' + (total ? (nd ? "Next review: " + esc(nd) : "") : "Study a day's flashcards to fill your deck.") + "</p></div>" + boxes + mistakesCard() +
        '<div class="actions center"><a class="btn primary" href="#/games">🎮 Play a game</a><a class="btn" href="#/learn">📚 Learn</a></div>', "review");
      return;
    }
    render('<div class="card result">' + UI.mascot("happy", 88) + "<h2>" + ids.length + " word" + (ids.length > 1 ? "s" : "") + " due</h2>" +
      '<p class="sub">✓ moves a card up a box · ✗ brings it back today · hard words return sooner</p><button class="btn primary wide" id="start">Start review</button></div>' + boxes + mistakesCard(), "review");
    document.getElementById("start").onclick = function () {
      runDeck({ title: "Review", words: ids.map(function (id) { return WORDMAP[id]; }), mode: "review", back: "#/review" });
    };
  }

  /* ---------- search ---------- */
  function viewSearch() {
    render('<input id="q" class="search" type="search" inputmode="search" placeholder="gongzi · lương · salary · 工资" value="' + esc(searchQuery) + '" autocomplete="off" autocapitalize="off" spellcheck="false"><div id="results"></div>', "search");
    var q = document.getElementById("q");
    q.oninput = function () { searchQuery = q.value; results(); };
    document.getElementById("results").onclick = function (e) { var a = e.target.closest("[data-jump]"); if (a) pendingJump = a.getAttribute("data-jump"); };
    if (!("ontouchstart" in window)) q.focus();
    results();
    function results() {
      var raw = searchQuery.trim(), out = document.getElementById("results");
      if (!raw) { out.innerHTML = '<p class="sub center">' + WORDS.length + ' words · pinyin works with or without tones</p><p class="center"><a class="btn small" href="#/families">🧬 Word families</a></p>'; return; }
      var nq = norm(raw);
      var hits = WORDS.filter(function (w) {
        if (w.hanzi.indexOf(raw) >= 0) return true;
        if ((w.collocations || []).some(function (c) { return c.zh.indexOf(raw) >= 0; })) return true;
        return [w.pinyin, w.vi, w.en].some(function (f) { return norm(f).indexOf(nq) >= 0; });
      });
      out.innerHTML = hits.length ? '<div class="card wlist">' + hits.slice(0, 100).map(function (w) {
        return '<div class="wl-row"><a href="' + wordHome(w) + '" data-jump="' + esc(w.id) + '"><span class="zh">' + esc(w.hanzi) + "</span> " + PY(w.pinyin) +
          '<div class="dim">' + M(w) + " · " + wordPlace(w) + "</div></a>" + SAY(w.hanzi) + "</div>";
      }).join("") + "</div>" : '<p class="empty">No results.</p>';
    }
  }

