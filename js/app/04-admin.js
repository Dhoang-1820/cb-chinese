  /* ---------- Admin: learner tracking (Me → Learner tracking). Numbers only: the server never sends answers or notes. ----------
     Reads the study summary each phone saves with its backup (see studySummary0). Older apps send less, so every block checks what it has. */
  function agoText(iso) {
    var ms = Date.now() - new Date(iso).getTime(); if (!isFinite(ms)) return tx("unknown");
    var h = Math.floor(ms / 36e5); return h < 1 ? tx("less than an hour ago") : h < 24 ? tx("{n} h ago", { n: h }) : tx("{n} d ago", { n: Math.floor(h / 24) });
  }
  var DAYRE = /^\d{4}-\d{2}-\d{2}$/;
  function lrnName(r) { var m = r.meta || {}; return m.label || tx("Learner {id}", { id: String(r.id).slice(0, 6) }); }
  function lrnKey(r) { return String(r.id).slice(0, 8); }
  function lrnDay(iso) { var d = new Date(iso); if (!isFinite(d.getTime())) return Store.today(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function lrnIdle(r) { var l = (r.meta || {}).last; return DAYRE.test(l || "") ? Math.max(0, Store.daysBetween(l, Store.today())) : null; }
  /* A skill as a readable name. Phones before this fix sent some raw ids ("fill-word", "listen-tf"), so map those here too. */
  function lrnSkill(x) { x = String(x || ""); return Learn.SKILLS[x] || Object.prototype.hasOwnProperty.call(AI.SKILL_NAMES, x) ? tipSkillName(x) : x; }
  function lrnMon(i) { return [tx("Jan"), tx("Feb"), tx("Mar"), tx("Apr"), tx("May"), tx("Jun"), tx("Jul"), tx("Aug"), tx("Sep"), tx("Oct"), tx("Nov"), tx("Dec")][i]; }
  function lrnDate(d) { return Number(d.slice(8, 10)) + " " + lrnMon(Number(d.slice(5, 7)) - 1) + " " + d.slice(0, 4); }
  /* An exam date that is missing, past or more than ~4 months away is most likely a wrong setting, and then the countdown
     and the pace numbers mean nothing. The course plan is about 3 months, hence 120 days. */
  var LRN_EXAM_FAR = 120;
  function lrnExamWarn(r) {
    var pg = r.summary && r.summary.progress; if (!pg) return null;
    var e = pg.exam || "";
    if (!DAYRE.test(e)) return tx("No exam date set, so the app uses its default · check it");
    var dl = Store.daysBetween(Store.today(), e);
    if (dl < 0) return tx("Exam date {d} has passed · set the next one", { d: lrnDate(e) });
    if (dl > LRN_EXAM_FAR) return tx("Exam date is {d} ({n} days away) · check it", { d: lrnDate(e), n: dl });
    return null;
  }
  /* Stale reviews: 30+ words waiting more than 3 days is already several skipped review days at this course's pace
     (the old 100 fired far too late); 100+ is marked urgent. */
  var LRN_OVERDUE = 30, LRN_OVERDUE_HOT = 100, LRN_REPEAT = 10;
  function lrnAlerts(r) {
    var out = [], sm = r.summary || {}, d = lrnIdle(r), st = sm.streak, vo = sm.vocab, up = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 864e5), ew = lrnExamWarn(r);
    var cl = r.client || {}, op = r.last_open ? (Date.now() - new Date(r.last_open).getTime()) / 864e5 : null, bk = { off: tx("turned off"), paused: tx("paused"), err: tx("failing") }[cl.b];
    var bkAlert = !!bk && op != null && op < 7; // the phone itself says its backup is not working: that explains old numbers
    if (bkAlert) out.push({ k: "Backup", t: tx("Backup is {state} on {name}'s phone (seen {ago}), so new progress isn't reaching you", { state: bk, name: lrnName(r), ago: agoText(r.last_open) }), hot: true });
    if (r.unread) out.push({ k: "Chat", t: r.unread === 1 ? tx("{n} new message from {name}", { n: r.unread, name: lrnName(r) }) : tx("{n} new messages from {name}", { n: r.unread, name: lrnName(r) }), hot: true });
    if (cl.v && BUILD !== "dev" && cl.v !== BUILD && op != null && op < 7) out.push({ k: "Update", t: tx("{name}'s app is an older version ({v})", { name: lrnName(r), v: String(cl.v).slice(0, 7) }), hot: false });
    if (bkAlert) { /* no "no study" guess: the numbers are old because the backup is not working */ }
    else if (d != null && d >= 3 && isFinite(up) && up >= 3 && up <= d + 1 && op != null && op < 2) out.push({ k: "No study", t: tx("Opens the app ({ago}) but nothing studied for {n} days", { ago: agoText(r.last_open), n: d }), hot: true });
    else if (d != null && d >= 3 && isFinite(up) && up >= 3 && up <= d + 1) out.push({ k: "No data", t: tx("Nothing received for {n} days · last study {d}. Either not studying, or backup is paused on the phone: ask", { n: up, d: String(r.meta.last).slice(5) }), hot: true });
    else if (d != null && d >= 3) out.push({ k: "No study", t: tx("Nothing for {n} days · last {d}", { n: d, d: String(r.meta.last).slice(5) }), hot: true });
    else if (st && st.n === 0 && st.best >= 3 && d != null && d >= 1) out.push({ k: "Streak", t: tx("Streak broken · best was {n} days", { n: num(st.best) }), hot: false });
    if (vo && num(vo.overdue) >= LRN_OVERDUE) out.push({ k: "Reviews", t: tx("{n} words waiting more than 3 days", { n: num(vo.overdue) }), hot: num(vo.overdue) >= LRN_OVERDUE_HOT });
    (sm.patterns || []).forEach(function (p) {
      if (p.kind !== "repeat" || num(p.n) < LRN_REPEAT) return; // n = misses of the same few items in 14 days; k = how many items (newer phones)
      out.push({ k: "Mistakes", t: (p.k ? (num(p.k) === 1 ? tx("{n} item keeps being missed · ", { n: num(p.k) }) : tx("{n} items keep being missed · ", { n: num(p.k) })) : tx("The same items keep being missed · ")) + tx("{n} misses in 14 days", { n: num(p.n) }), hot: false });
    });
    if (ew) out.push({ k: "Exam date", t: ew, hot: false });
    if (!bkAlert && isFinite(up) && up >= 3 && !(d != null && d >= 3 && up <= d + 1)) out.push({ k: "Backup", t: tx("Last saved {n} days ago, so these numbers may be old", { n: up }), hot: false });
    return out;
  }
  /* A ready message for each alert, in Vietnamese, with a matching button. The admin edits it or sends it as is. */
  function lrnSug(r, a) {
    var n = lrnName(r), sm = r.summary || {}, ex = sm.progress && sm.progress.exam, dl = DAYRE.test(ex || "") ? Store.daysBetween(Store.today(), ex) : null;
    var left = dl != null && dl >= 0 ? " Còn " + dl + " ngày nữa là thi HSK 4." : "";
    switch (a.k) {
      case "Backup": return { text: "Chào " + n + ", app báo phần sao lưu trên điện thoại của em đang không hoạt động. Em vào Me → Cloud backup để bật lại hoặc chọn giữ tiến độ trên máy này nhé, để tiến độ không bị mất.", href: "#/me" };
      case "No data": case "No study": return { text: "Chào " + n + ", mấy hôm nay chưa thấy em học." + left + " Hôm nay chỉ cần 5 phút thôi cũng được nhé! 加油!", href: "#/session/comeback" };
      case "Streak": return { text: n + " ơi, chuỗi ngày học bị ngắt rồi 😅 Làm một phiên ngắn hôm nay để bắt đầu lại nhé!", href: "#/session" };
      case "Reviews": return { text: "Chào " + n + ", có " + num((sm.vocab || {}).overdue) + " từ đang chờ em ôn lâu rồi. Ôn 10 phút hôm nay là nhớ lại ngay nhé!", href: "#/review" };
      case "Mistakes": return { text: n + " ơi, có vài câu em sai đi sai lại. Thử phần \"Fix repeat mistakes\" nhé: mỗi câu đúng 2 lần liền là xong.", href: "#/mistakes/repeat" };
      case "Exam date": return { text: "Chào " + n + ", em kiểm tra lại ngày thi trong app (Me → My exams) giúp mình nhé, để kế hoạch ôn thi tính đúng ngày.", href: "#/exams" };
      case "Update": return { text: "Chào " + n + ", app vừa có bản mới. Em đóng hẳn app rồi mở lại một lần để cập nhật nhé!", href: "" };
    }
    return null;
  }
  /* an alert kind (a.k is compared in code, so it stays English) as shown on screen */
  function lrnKLabel(k) {
    return { Backup: tx("Backup"), Chat: tx("Chat"), Update: tx("Update"), "No study": tx("No study"), "No data": tx("No data"), Streak: tx("Streak"), Reviews: tx("Reviews"), Mistakes: tx("Mistakes"), "Exam date": tx("Exam date") }[k] || k;
  }
  function lrnStatus(r) {
    var sm = r.summary; if (!sm) return { t: tx("No data yet"), c: "" };
    var d = lrnIdle(r), p = sm.pace;
    return (d != null && d >= 3) || (p && num(p.exp) - num(p.done) >= 2) ? { t: tx("Behind plan"), c: "lt-late" } : { t: tx("On track"), c: "lt-ok" };
  }
  function lrnDays(str, label) {
    if (!/^[01]{28}$/.test(str || "")) return "";
    return '<div class="lrn-days" role="img" aria-label="' + esc(label || tx("Study days, last 28 days, oldest first")) + ": " + str.split("").map(function (c) { return c === "1" ? tx("yes") : tx("no"); }).join(", ") + '">' +
      str.split("").map(function (c, i) { return '<i class="' + (c === "1" ? "on" : "") + (i === 27 ? " today" : "") + '"></i>'; }).join("") + "</div>";
  }
  function lrnTrend(sm) { // readiness change between the last two weekly snapshots
    var t = (sm && sm.trk) || [], a = t[t.length - 2], b = t[t.length - 1];
    return a && b && a[1] != null && b[1] != null ? num(b[1]) - num(a[1]) : null;
  }
  /* what the phone itself last said: when the app was open and how its backup is doing */
  function lrnPhone(r) {
    if (!r.last_open) return "";
    var mins = (Date.now() - new Date(r.last_open).getTime()) / 6e4, cl = r.client || {};
    var bk = { on: tx("backup on"), off: tx("backup off"), paused: tx("backup paused"), err: tx("backup failing") }[cl.b] || "";
    return '<p class="lt-meta lt-phone"><span class="lt-dot' + (mins < 3 ? " on" : "") + '" aria-hidden="true"></span>' + (mins < 3 ? "<b>" + tx("In the app now") + "</b>" : tx("App opened {ago}", { ago: esc(agoText(r.last_open)) })) + (bk ? " · " + bk : "") + "</p>";
  }
  var SUGS = {};
  /* ---------- Message everyone: one message (and optional button) to the chosen learners, now or later ---------- */
  function lrnAll(rows, host) {
    host.innerHTML = '<nav class="seg" aria-label="' + tx("Learner tracking views") + '"><a href="#/learners">' + tx("Overview") + '</a><a class="active" aria-current="page" href="#/learners/all">' + tx("Everyone") + '</a></nav>' +
      '<section class="card chat-box"><h3>📣 ' + tx("Message everyone") + '</h3><p class="sub">' + tx("Each learner gets it in her own chat, like a normal message. Use it for news, reminders and the exam-day checklist.") + '</p>' +
      '<fieldset class="lt-to"><legend>' + tx("To") + '</legend>' + rows.map(function (r, i) {
        return '<label class="lt-to-r"><input type="checkbox" data-to="' + i + '"' + (lrnTest(r) ? "" : " checked") + "> " + esc(lrnName(r)) + (lrnTest(r) ? ' <small class="muted">' + tx("(test or inactive)") + '</small>' : "") + "</label>";
      }).join("") + "</fieldset>" +
      '<label class="sr" for="ab-act">' + tx("Button to attach") + '</label><select id="ab-act" class="ac-act"><option value="">' + tx("No button") + '</option>' + CHAT_ACTS.map(function (a) { return '<option value="' + esc(a[0]) + '">🔘 ' + esc(tx(a[1])) + "</option>"; }).join("") + "</select>" + whenHTML("ab-when") +
      '<div class="chat-form"><label class="sr" for="ab-in">' + tx("Message") + '</label><textarea id="ab-in" rows="3" maxlength="1000" placeholder="' + tx("Write to everyone…") + '"></textarea><button type="button" class="btn primary" id="ab-send">' + tx("Send") + '</button></div></section>';
    wireWhen("ab-when");
    document.getElementById("ab-send").onclick = function () {
      var btn = this, v = document.getElementById("ab-in").value.trim(), a = document.getElementById("ab-act").value, at = whenISO("ab-when");
      var ids = [].filter.call(host.querySelectorAll("[data-to]"), function (c) { return c.checked; }).map(function (c) { return rows[+c.getAttribute("data-to")].id; });
      if (!v && !a) { document.getElementById("ab-in").focus(); return; }
      if (!ids.length) { UI.toast(tx("Choose at least one learner"), "👥"); return; }
      if (at === "bad") { UI.toast(tx("Pick a time in the future"), "⏰"); return; }
      btn.disabled = true;
      Content.admin("admin_broadcast", { ids: ids, body: v, action: a ? { href: a, label: CHAT_ACTS.filter(function (x) { return x[0] === a; })[0][1] } : null, at: at }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { UI.toast(AI.errMsg(r.error), "⚠️"); return; }
        var sn = r.result.sent;
        UI.toast(at ? (sn === 1 ? tx("Scheduled for {n} learner", { n: sn }) : tx("Scheduled for {n} learners", { n: sn })) : (sn === 1 ? tx("Sent to {n} learner", { n: sn }) : tx("Sent to {n} learners", { n: sn })), at ? "⏰" : "📣");
        document.getElementById("ab-in").value = ""; document.getElementById("ab-act").value = ""; document.getElementById("ab-when").value = ""; document.getElementById("ab-when-at").hidden = true;
      });
    };
  }
  /* ---------- Wins: recent achievements from each phone, one tap to cheer ---------- */
  var CHEER_KEY = "cbChinese.cheered";
  function cheered() { try { return JSON.parse(localStorage.getItem(CHEER_KEY)) || []; } catch (e) { return []; } }
  function winKey(r, e) { return lrnKey(r) + ":" + e.k + ":" + e.d + ":" + (e.id || e.n || ""); }
  function winText(e) {
    return e.k === "mock" ? (e.f ? tx("Full mock Test {id}: {s}/300", { id: num(e.id), s: num(e.s) }) : tx("Mock Test {id}: {s}/300", { id: num(e.id), s: num(e.s) })) + (num(e.s) >= 180 ? " ✓ " + tx("pass") : "") :
      e.k === "lessons" ? (num(e.n) === 1 ? tx("{n} lesson finished", { n: num(e.n) }) : tx("{n} lessons finished", { n: num(e.n) })) : e.k === "streak" ? tx("{n}-day streak 🔥", { n: num(e.n) }) : e.k === "talk" ? tx("Role-play goal met") + (e.s != null ? " · " + num(e.s) + "/10" : "") : "";
  }
  function cheerMsg(r, e) {
    var n = lrnName(r);
    return e.k === "mock" ? "👏 Giỏi lắm " + n + "! Bài thi thử Test " + num(e.id) + ": " + num(e.s) + "/300." + (num(e.s) >= 180 ? " Đã qua điểm đỗ rồi đấy!" : " Mỗi bài là một bước gần hơn tới 180!") :
      e.k === "lessons" ? "👏 Tuyệt vời " + n + ", hôm đó em xong " + num(e.n) + " bài học!" :
      e.k === "streak" ? "🔥 " + num(e.n) + " ngày liên tiếp rồi, " + n + "! Giữ vững nhé!" : "🗣️ Giỏi quá " + n + ", em đã hoàn thành hội thoại với AI!";
  }
  function lrnWins(rows) {
    var from = Store.addDays(Store.today(), -7), done = cheered(), list = [];
    rows.forEach(function (r) { ((r.summary || {}).ev || []).forEach(function (e) { if (e && e.d >= from && winText(e)) list.push({ r: r, e: e }); }); });
    list.sort(function (a, b) { return a.e.d < b.e.d ? 1 : a.e.d > b.e.d ? -1 : 0; });
    if (!list.length) return "";
    WINS = list.slice(0, 8);
    return '<h3 class="sec">' + tx("Recent wins") + '</h3><section class="card lt-wins">' + WINS.map(function (x, i) {
      var k = winKey(x.r, x.e), c = done.indexOf(k) >= 0;
      return '<div class="lt-win"><span class="lt-al-t"><b>' + esc(lrnName(x.r)) + "</b><small>" + esc(winText(x.e)) + " · " + esc(x.e.d.slice(5)) + "</small></span>" +
        (c ? '<span class="muted">' + tx("Cheered ✓") + '</span>' : '<button type="button" class="btn small primary" data-cheer="' + i + '">👏 ' + tx("Cheer") + '</button>') + "</div>";
    }).join("") + "</section>";
  }
  var WINS = [];
  function lrnTest(r) { var d = lrnIdle(r); return num((r.meta || {}).xp) < 100 && (d == null || d >= 14); }
  function lrnOverview(rows) {
    var soon = null, html = "";
    rows.forEach(function (r) {
      var e = r.summary && r.summary.progress && r.summary.progress.exam;
      if (DAYRE.test(e || "")) { var dl = Store.daysBetween(Store.today(), e); if (dl >= 0 && (!soon || dl < soon.dl)) soon = { dl: dl, d: e }; }
    });
    html += soon ? '<section class="card lt-exam"><small>' + tx("HSK exam in") + '</small><b>' + tx("{n} days", { n: soon.dl }) + "</b><span>" + esc(soon.d) + "</span></section>" : "";
    var test = rows.filter(lrnTest); rows = rows.filter(function (r) { return !lrnTest(r); }); SUGS = {};
    html += '<a class="btn big lt-all" href="#/learners/all">📣 ' + tx("Message everyone") + '</a>';
    var al = []; // one card per learner, every alert a line inside it; learners with an urgent alert first
    rows.forEach(function (r) { var a = lrnAlerts(r); if (a.length) al.push({ r: r, a: a, hot: a.some(function (x) { return x.hot; }) }); });
    al.sort(function (x, y) { return (y.hot ? 1 : 0) - (x.hot ? 1 : 0); });
    html += '<h3 class="sec">' + tx("Needs attention") + '</h3>' + (al.length ? al.map(function (x) {
      return '<section class="card lt-alg"><b class="lt-alg-n">' + esc(lrnName(x.r)) + "</b>" + x.a.map(function (a) {
        var to = a.k === "Reviews" || a.k === "Mistakes" ? "practice" : a.k === "Exam date" ? "progress" : a.k === "Chat" || a.k === "Backup" || a.k === "Update" ? "chat" : "habit";
        var sg = lrnSug(x.r, a), sk = "";
        if (sg) { sk = String(Object.keys(SUGS).length); SUGS[sk] = { key: lrnKey(x.r), text: sg.text, href: sg.href }; }
        return '<div class="lt-alrow"><a class="lt-al" href="#/learners/' + lrnKey(x.r) + "/" + to + '"><span class="lt-badge' + (a.hot ? " hot" : "") + '">' + esc(lrnKLabel(a.k)) + '</span><span class="lt-al-t"><small>' + esc(a.t) + '</small></span><span class="lt-go" aria-hidden="true">›</span></a>' +
          (sg ? '<button type="button" class="btn small lt-sug" data-sug="' + sk + '" aria-label="' + tx("Suggested message: {kind}", { kind: esc(lrnKLabel(a.k)) }) + '">💬 ' + tx("Message") + '</button>' : "") + "</div>";
      }).join("") + "</section>";
    }).join("") : '<p class="card sub">✓ ' + tx("Nothing needs attention.") + '</p>');
    html += lrnWins(rows);
    if (test.length) html += '<details class="card lt-test"><summary>' + tx("Inactive or test backups ({n})", { n: test.length }) + "</summary><p class=\"sub\">" + tx("Under 100 XP and nothing for 14+ days: usually a test device or a backup started without the restore code. Hidden from alerts.") + "</p>" +
      test.map(function (r) { return '<a class="lt-al" href="#/learners/' + lrnKey(r) + '/progress"><span class="lt-al-t"><b>' + esc(lrnName(r)) + "</b><small>" + tx("{xp} XP · last {d}", { xp: num((r.meta || {}).xp), d: esc(String((r.meta || {}).last || "–")) }) + '</small></span><span class="lt-go" aria-hidden="true">›</span></a>'; }).join("") + "</details>";
    html += '<h3 class="sec">' + tx("Learners") + '</h3>' + rows.map(function (r) {
      var sm = r.summary || {}, pg = sm.progress || {}, rd = pg.ready, st = lrnStatus(r), tr = lrnTrend(sm), idle = lrnIdle(r), pl = sm.pace;
      return '<div class="card lt-card"><a class="lt-open" href="#/learners/' + lrnKey(r) + '/progress"><div class="lt-row"><b>' + esc(lrnName(r)) + '</b><span class="lt-chip ' + st.c + '">' + esc(st.t) + "</span></div>" +
        '<div class="lt-row lt-end"><div><small>' + tx("Readiness") + '</small><div class="lt-big">' + (rd ? num(rd.total) : "–") + "<small> / 300</small></div></div>" +
        (tr != null ? '<b class="lt-d ' + (tr > 0 ? "lt-up" : tr < 0 ? "lt-dn" : "") + '"><span aria-hidden="true">' + (tr > 0 ? "▲ " : tr < 0 ? "▼ " : "") + "</span>" + tx("{d} vs last week", { d: (tr >= 0 ? "+" : "−") + Math.abs(tr) }) + "</b>" : "") + "</div>" +
        '<p class="lt-meta">' + tx("Streak") + ' <b>' + tx("{n} d", { n: num((sm.streak || {}).n != null ? sm.streak.n : (r.meta || {}).streak) }) + '</b> · ' + tx("Last study") + ' <b>' + (idle == null ? "–" : idle === 0 ? tx("today") : tx("{n} d ago", { n: idle })) + "</b> · " + tx("Lessons") + " <b>" + (pl ? num(pl.done) + "/" + num(pl.total) : num(pg.lessons) + "/" + num(pg.lessonsAll || 90)) + "</b></p>" +
        lrnDays(sm.days28, tx("Study days, last 28 days, oldest first")) + (lrnExamWarn(r) ? '<p class="lt-warn"><span aria-hidden="true">⚠ </span>' + esc(lrnExamWarn(r)) + "</p>" : "") + lrnPhone(r) + '</a><div class="lt-act"><a class="btn small' + (r.unread ? " primary" : "") + '" href="#/learners/' + lrnKey(r) + '/chat">💬 ' + tx("Chat") + (r.unread ? ' <span class="lt-unread">' + tx("{n} new", { n: r.unread }) + "</span>" : "") + "</a></div></div>";
    }).join("");
    return html;
  }
  /* a bar with an optional tick for where the learner should be today */
  function lrnBar(label, done, all, exp, unit) {
    done = num(done); all = Math.max(1, num(all));
    var gap = exp == null ? "" : num(exp) - done > 0 ? tx("{n} behind", { n: (num(exp) - done) + " " + unit }) : done - num(exp) > 0 ? tx("{n} ahead", { n: (done - num(exp)) + " " + unit }) : tx("on pace");
    return '<div class="lt-pace"><div class="lt-row"><span>' + esc(label) + "</span><span><b>" + done + "/" + all + "</b>" + (gap ? " · " + gap : "") + '</span></div><div class="lt-track"><i class="' + (exp != null && num(exp) - done > 0 ? "late" : "") + '" style="width:' + Math.min(100, done / all * 100) + '%"></i>' +
      (exp != null ? '<u style="left:calc(' + Math.min(100, num(exp) / all * 100) + '% - 1px)"></u>' : "") + "</div></div>";
  }
  function lrnProgress(r) {
    var sm = r.summary, pg = sm.progress || {}, rd = pg.ready, html = "", tr = sm.trk || [], pl = sm.pace;
    if (Array.isArray(pg.xh) && pg.xh.length) html += '<section class="card lt-real"><b>📚 ' + tx("Past exams") + '</b>' + pg.xh.slice().reverse().map(function (e) {
      return '<p class="lt-meta">HSK ' + (e[0] === 5 ? 5 : 4) + " · " + esc(lrnDate(String(e[1]))) + (e[2] != null ? " · " + tx("forecast ~{n}", { n: num(e[2]) }) : "") + (e[3] != null ? " · " + tx("real {n}/300", { n: num(e[3]) }) : " · " + tx("no result")) + "</p>"; }).join("") + "</section>";
    if (pg.real) { var rt = num(pg.real.l) + num(pg.real.r) + num(pg.real.w); html += '<section class="card lt-real"><b>🎓 ' + tx("Real HSK {lv}: {n}/300", { lv: pg.lv === 5 ? 5 : 4, n: rt }) + "</b><p class=\"lt-meta\">" + tx("L {l} · R {r} · W {w}", { l: num(pg.real.l), r: num(pg.real.r), w: num(pg.real.w) }) + (pg.fc != null ? " · " + tx("the app forecast ~{n} ({d})", { n: num(pg.fc), d: (rt - num(pg.fc) >= 0 ? "+" : "−") + Math.abs(rt - num(pg.fc)) }) : "") + "</p></section>"; }
    if (rd) {
      var pts = tr.filter(function (e) { return e[1] != null; }).map(function (e) { return { x: String(e[0]).slice(3), y: num(e[1]) }; });
      html += '<section class="card"><div class="lt-row"><b>' + tx("Readiness") + '</b><span class="lt-chip ' + (num(rd.lo) >= PASS ? "lt-ok" : num(rd.hi) < PASS ? "lt-late" : "") + '">' + esc(rd.verdict || "") + '</span></div><div class="lt-big">' + num(rd.total) + "<small> / 300 · " + tx("range {lo}–{hi}", { lo: num(rd.lo), hi: num(rd.hi) }) + "</small></div>" +
        (pts.length >= 2 ? lineChart(pts, { min: 100, max: 300, ref: PASS, refLabel: tx("pass {n}", { n: PASS }), h: 160 }) : '<p class="sub">' + tx("The weekly line starts once there are two weeks of data.") + '</p>') +
        '<p class="sub">' + (rd.src === "mock" ? tx("Estimate from mock exams. Dashed line = pass mark {n}.", { n: PASS }) : tx("Estimate from practice answers. Dashed line = pass mark {n}.", { n: PASS })) + "</p></section>";
    } else html += '<section class="card"><b>' + tx("Readiness") + '</b><p class="sub">' + tx("Not enough answers yet.") + '</p></section>';
    var ws = lrnDay(r.updated_at), xs = (sm.xpw || []).map(function (v, i, a) { return { x: Store.addDays(ws, -((new Date(ws + "T00:00:00").getDay() + 6) % 7) - 7 * (a.length - 1 - i)).slice(5), y: num(v) }; });
    html += '<section class="card"><b>' + tx("XP per week") + '</b>' + (xs.length ? '<div class="lt-big">' + xs[xs.length - 1].y + "<small> " + tx("this week") + "</small></div>" + barChart(xs, { h: 130 }) : '<p class="sub">' + tx("No data yet.") + '</p>') + "</section>";
    var wp = tr.filter(function (e) { return e[2] != null; }).map(function (e) { return { x: String(e[0]).slice(3), y: num(e[2]) }; });
    html += '<section class="card"><b>' + tx("Words that stuck") + '</b><p class="sub">' + tx("Words in the last two review boxes.") + '</p>' + (wp.length >= 2 ? '<div class="lt-big">' + wp[wp.length - 1].y + "</div>" + lineChart(wp, { min: 0, h: 140 }) : '<div class="lt-big">' + (sm.vocab ? num(sm.vocab.mastered) : "–") + '</div><p class="sub">' + tx("The weekly line starts once there are two weeks of data.") + '</p>') + "</section>";
    html += '<section class="card"><div class="lt-row"><b>' + tx("Pace to the exam") + '</b><small>' + tx("tick = where they should be today") + '</small></div>' +
      (pl ? lrnBar(tx("Lessons before the exam"), pl.done, pl.total, pl.exp, tx("lessons")) : lrnBar(tx("Lessons"), pg.lessons, pg.lessonsAll || 90, null, "")) +
      lrnBar(tx("24-week track sessions"), pg.track, pg.trackAll || 72, null, "") +
      (pg.hsk5 && (pg.hsk5.started || pg.hsk5.words) ? lrnBar(tx("HSK 5 packs started"), pg.hsk5.started, pg.hsk5.packs || 62, null, "") : "") + "</section>";
    var ms = pg.mocks || [];
    html += '<section class="card"><div class="lt-row"><b>' + tx("Mock exams") + '</b><small>' + tx("each part out of 100") + '</small></div>' + (ms.length ?
      '<table class="lt-tab"><thead><tr><th>' + tx("Date") + '</th><th>' + tx("Listen") + '</th><th>' + tx("Read") + '</th><th>' + tx("Write") + '</th><th>' + tx("Total") + '</th></tr></thead><tbody>' + ms.map(function (m) { return "<tr><td>" + esc(String(m.d).slice(5)) + (m.rep ? ' <small class="lt-rep">' + tx("repeat") + '</small>' : "") + "</td><td>" + num(m.l) + "</td><td>" + num(m.r) + "</td><td>" + num(m.w) + "</td><td><b>" + num(m.t) + "</b></td></tr>"; }).join("") + "</tbody></table>" +
      (ms.length >= 2 ? (function () {
        var a = ms[0], b = ms[ms.length - 1], d = [[tx("Listening"), num(b.l) - num(a.l)], [tx("Reading"), num(b.r) - num(a.r)], [tx("Writing"), num(b.w) - num(a.w)]];
        return '<p class="sub">' + tx("Since the first mock shown: {list}", { list: d.map(function (k) { return k[0] + " " + (k[1] >= 0 ? "+" : "−") + Math.abs(k[1]); }).join(" · ") }) + "</p>";
      })() : "") +
      // mfa comes from phones with this version; older ones only have the table
      (pg.mfa ? '<p class="sub">' + (num(pg.mfa[0]) === 1 ? tx("First-attempt average: <b>{avg}/300</b> over {n} set. Repeats (seen questions) count less in readiness.", { avg: num(pg.mfa[1]), n: num(pg.mfa[0]) }) : tx("First-attempt average: <b>{avg}/300</b> over {n} sets. Repeats (seen questions) count less in readiness.", { avg: num(pg.mfa[1]), n: num(pg.mfa[0]) })) + "</p>" : "")
      : '<p class="sub">' + tx("No mock exam taken yet.") + '</p>') + "</section>";
    return html;
  }
  function lrnPractice(r) {
    var sm = r.summary, pg = sm.progress || {}, vo = sm.vocab, tk = sm.talk, html = "";
    if (vo) {
      var all = Math.max(1, num(vo.all), num(vo.mastered) + num(vo.learning)), m = num(vo.mastered), l = num(vo.learning), h4 = vo.hsk === 4;
      // newer phones count HSK 4 course words only; older ones counted every word on the phone (HSK 5 and extra packs too)
      html += '<section class="card"><div class="lt-row"><b>' + tx("Vocabulary") + (h4 ? " · HSK 4" : "") + "</b><small>" + (h4 ? tx("{n} HSK 4 course words", { n: all }) : tx("{n} words on the phone (older app: HSK 5 and extra words included)", { n: all })) + "</small></div>" +
        '<div class="lt-stack" role="img" aria-label="' + tx("{m} mastered, {l} learning, {s} not started", { m: m, l: l, s: Math.max(0, all - m - l) }) + '"><i style="width:' + m / all * 100 + '%"></i><i class="b" style="width:' + l / all * 100 + '%"></i></div>' +
        '<p class="lt-meta">' + tx("<b>{m}</b> mastered · <b>{l}</b> learning · <b>{s}</b> not started", { m: m, l: l, s: Math.max(0, all - m - l) }) + "</p>" +
        (h4 && (num(vo.h5) || num(vo.ex)) ? '<p class="lt-meta">' + tx("Also in review, not counted above: <b>{h5}</b> HSK 5 · <b>{ex}</b> extra or own words", { h5: num(vo.h5), ex: num(vo.ex) }) + "</p>" : "") +
        '<div class="lt-boxes"><div><b>' + num(pg.due) + "</b><small>" + tx("due now") + "</small></div><div class=" + (num(vo.overdue) >= LRN_OVERDUE ? '"hot"' : '""') + "><b>" + num(vo.overdue) + "</b><small>" + tx("waiting over 3 days") + "</small></div></div>" +
        '<p class="sub">' + tx("A growing pile of old reviews means reviews are being skipped.") + '</p></section>';
    }
    if (tk) {
      var ws = lrnDay(r.updated_at), wk = (tk.wk || []).map(function (v, i, a) { return { x: Store.addDays(ws, -((new Date(ws + "T00:00:00").getDay() + 6) % 7) - 7 * (a.length - 1 - i)).slice(5), y: num(v) }; });
      var sc = null; (window.CB_TALK || []).forEach(function (x) { if (tk.last && x.id === tk.last.id) sc = x; });
      html += '<section class="card"><div class="lt-row"><b>' + tx("AI role-play") + '</b><span class="lt-chip">' + tx("Level HSK {n}", { n: num(tk.lvl) === 5 ? 5 : 4 }) + "</span></div>" +
        '<div class="lt-boxes"><div><b>' + (wk.length ? wk[wk.length - 1].y : 0) + "</b><small>" + tx("talks this week") + "</small></div><div><b>" + (tk.avg == null ? "–" : tk.avg) + "</b><small>" + tx("average score /10") + "</small></div><div><b>" + num(tk.tried) + "/" + num(tk.all || 16) + "</b><small>" + tx("scenes tried") + "</small></div></div>" +
        (wk.length ? '<p class="sub">' + tx("Talks per week") + '</p>' + barChart(wk, { h: 110 }) : "") +
        (tk.last ? '<p class="lt-meta">' + tx("Last talk:") + ' <b>' + esc(sc ? sc.t.en : tk.last.id) + "</b>" + (tk.last.s != null ? " · " + num(tk.last.s) + "/10" : "") + " · " + esc(String(tk.last.d).slice(5)) + "</p>" : '<p class="sub">' + tx("No role-play finished yet.") + '</p>') + "</section>";
    } else html += '<section class="card"><b>' + tx("AI role-play") + '</b><p class="sub">' + tx("This phone has an older app version, so there are no role-play numbers.") + '</p></section>';
    var tr = sm.trend || [];
    html += '<section class="card"><div class="lt-row"><b>' + tx("Skill accuracy") + '</b><small>' + tx("last 14 days · weakest first") + '</small></div>' + (tr.length ? tr.slice(0, 6).map(function (t) {
      var d = t.before == null ? null : num(t.acc) - num(t.before);
      return '<div class="lt-pace"><div class="lt-row"><span>' + esc(lrnSkill(t.skill)) + "</span><span><b>" + num(t.acc) + "%</b>" + (d == null ? "" : " · " + tx("{d} pts", { d: (d >= 0 ? "+" : "−") + Math.abs(d) })) + '</span></div><div class="lt-track"><i class="' + (num(t.acc) < 60 ? "late" : "") + '" style="width:' + Math.min(100, num(t.acc)) + '%"></i></div></div>';
    }).join("") : '<p class="sub">' + tx("Not enough answers in the last 14 days.") + '</p>') +
      ((sm.patterns || []).length ? '<p class="sub">' + tx("Mistake patterns:") + " " + sm.patterns.map(function (p) { return (p.kind === "skill" ? esc(lrnSkill(p.skill)) : tx("same items missed again")) + " ×" + num(p.n); }).join(" · ") + "</p>" : "") + "</section>";
    return html;
  }
  function lrnHabit(r) {
    var sm = r.summary, html = "", end = lrnDay(r.updated_at), ds = sm.days28 || "", i;
    if (sm.sp7 != null) html += '<section class="card lt-speak"><div class="lt-row"><b>' + tx("Speaking") + "</b><span>" + tx("last 7 days") + "</span></div><p>" + tx("{n} sentences said aloud (shadowing) · focus: {f}", { n: "<b>" + num(sm.sp7) + "</b>", f: esc({ exam: tx("Exam only"), mix: tx("Exam + a little speaking"), both: tx("Exam and speaking"), speak: tx("Speaking first") }[sm.spf] || sm.spf) }) + "</p></section>";
    if (Array.isArray(sm.fb) && sm.fb.length) {
      var fc = { 1: 0, 2: 0, 3: 0 }; sm.fb.forEach(function (e) { if (fc[e[1]] != null) fc[e[1]]++; });
      var lastF = sm.fb[sm.fb.length - 1];
      html += '<section class="card lt-fb"><div class="lt-row"><b>' + tx("How sessions felt") + '</b><span>' + tx("last 14 days") + '</span></div><p>😓 ' + tx("Too hard") + ' <b>' + fc[1] + "</b> · 🙂 " + tx("Just right") + " <b>" + fc[2] + "</b> · 😴 " + tx("Too easy") + " <b>" + fc[3] + "</b></p>" +
        '<p class="sub">' + tx("Last:") + " " + esc(String(lastF[0])) + " · " + (lastF[1] === 1 ? tx("too hard") : lastF[1] === 3 ? tx("too easy") : tx("just right")) + (fc[1] >= 2 && fc[1] >= fc[2] ? " · " + tx("several hard days: a shorter session (Me → Today's session length) may help.") : fc[3] >= 2 && fc[3] >= fc[2] ? " · " + tx("often too easy: suggest a longer session or a full mock.") : "") + "</p></section>";
    }
    if (/^[01]{28}$/.test(ds)) {
      var first = Store.addDays(end, -27), lead = (new Date(first + "T00:00:00").getDay() + 6) % 7, cells = "";
      for (i = 0; i < lead; i++) cells += "<i></i>";
      for (i = 0; i < 28; i++) cells += '<i class="d' + (ds.charAt(i) === "1" ? " on" : "") + (i === 27 ? " today" : "") + '">' + Number(Store.addDays(first, i).slice(8)) + "</i>";
      html += '<section class="card"><div class="lt-row"><b>' + tx("Last 28 days") + '</b><span>' + tx("<b>{n}</b> study days of {m}", { n: num(sm.active28), m: num(sm.span) }) + '</span></div><div class="lt-wd"><span>' + tx("Mon") + '</span><span>' + tx("Tue") + '</span><span>' + tx("Wed") + '</span><span>' + tx("Thu") + '</span><span>' + tx("Fri") + '</span><span>' + tx("Sat") + '</span><span>' + tx("Sun") + '</span></div>' +
        '<div class="lt-cal" role="img" aria-label="' + tx("Study days, last 28 days, oldest first") + ": " + ds.split("").map(function (c) { return c === "1" ? tx("yes") : tx("no"); }).join(", ") + '">' + cells + '</div><p class="sub">' + tx("Filled = studied · outline = missed · ring = last backup day") + '</p></section>';
    }
    var wk = (sm.week || []).map(function (v, k, a) { var dd = Store.addDays(end, -(a.length - 1 - k)); return { x: WD[(new Date(dd + "T00:00:00").getDay() + 6) % 7], y: num(v) }; });
    if (wk.some(function (x) { return x.y > 0; })) html += '<section class="card"><div class="lt-row"><b>' + tx("Minutes, last 7 days") + '</b><span>' + tx("avg <b>{n}</b> min", { n: Math.round(wk.reduce(function (a, x) { return a + x.y; }, 0) / wk.length) }) + "</span></div>" + barChart(wk, { h: 120 }) + "</section>";
    var hk = Object.keys(sm.hours || {}).sort(function (a, b) { return sm.hours[b] - sm.hours[a]; }).slice(0, 3);
    function hr(x) { return typeof x === "number" && isFinite(x) ? (x < 10 ? "0" : "") + x + ":00" : tx("not measured yet"); }
    var sn = num((sm.streak || {}).n), lg = num(sm.longestGap);
    var rows = [[tx("Usually starts at"), hr(sm.usualHour) + (isFinite(sm.planHour) ? " " + tx("(plan {t})", { t: hr(sm.planHour) }) : "")],
      [tx("Common start times"), hk.length ? hk.map(function (h) { return hr(+h); }).join(" · ") : tx("not measured yet")], [tx("Minutes on a study day"), sm.minutes == null ? tx("not measured yet") : tx("{n} min", { n: sm.minutes })],
      [tx("Longest gap"), lg === 1 ? tx("{n} day", { n: lg }) : tx("{n} days", { n: lg })], [tx("Often skips"), sm.skipDay || tx("no pattern")], [tx("Streak"), (sn === 1 ? tx("{n} day", { n: sn }) : tx("{n} days", { n: sn })) + " " + tx("(best {n})", { n: num((sm.streak || {}).best) })]];
    html += '<section class="card"><b>' + tx("Rhythm") + '</b>' + rows.map(function (x) { return '<div class="lt-kv"><span>' + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("") + "</section>";
    var pl = sm.plan;
    html += '<section class="card"><div class="lt-row"><b>' + tx("Coach plan") + (pl ? " · " + tx("week of {d}", { d: esc(pl.w) }) : "") + "</b>" + (pl ? "<span>" + tx("<b>{n}</b>/{m} done", { n: pl.actions.filter(function (a) { return a.done; }).length, m: pl.actions.length }) + "</span>" : "") + "</div>" +
      (pl && pl.actions.length ? '<ul class="plan-l">' + pl.actions.map(function (a) { return '<li class="' + (a.done ? "done" : "") + '"><span class="plan-c" aria-hidden="true">' + (a.done ? "✓" : "") + '</span><span class="plan-t">' + (a.done ? '<span class="sr">' + tx("Done:") + ' </span>' : '<span class="sr">' + tx("Open:") + ' </span>') + esc(a.text) + "</span></li>"; }).join("") + "</ul>" : '<p class="sub">' + tx("No coach plan yet.") + '</p>') + "</section>";
    return html;
  }
  /* Week tab: the week the backup was saved in (so far) next to the week before, with the change as text and an arrow,
     never colour alone. Built from summary.wk (newer phones) plus xpw, trk and talk.wk, which older phones also send. */
  function lrnDelta(a, b, unit) {
    if (a == null || b == null) return '<td class="lt-d">–</td>';
    var d = Math.round((b - a) * 10) / 10;
    return '<td class="lt-d ' + (d > 0 ? "lt-up" : d < 0 ? "lt-dn" : "") + '">' + (d > 0 ? '<span aria-hidden="true">▲ </span>+' + d + unit : d < 0 ? '<span aria-hidden="true">▼ </span>−' + Math.abs(d) + unit : "same") + "</td>";
  }
  function lrnWeek(r) {
    var sm = r.summary, wk = sm.wk && Array.isArray(sm.wk.w) ? sm.wk : null, saved = lrnDay(r.updated_at);
    var ws = wk && /^\d{2}-\d{2}-\d{2}$/.test(wk.s || "") ? "20" + wk.s : Store.addDays(saved, -((new Date(saved + "T00:00:00").getDay() + 6) % 7)), lw = Store.addDays(ws, -7);
    function two(a) { a = Array.isArray(a) ? a : []; return [a.length >= 2 ? num(a[a.length - 2]) : null, a.length ? num(a[a.length - 1]) : null]; }
    var w = wk ? [wk.w.length >= 2 ? wk.w[wk.w.length - 2] : null, wk.w.length ? wk.w[wk.w.length - 1] : null] : [null, null];
    function col(i) { return [w[0] ? num(w[0][i]) : null, w[1] ? num(w[1][i]) : null]; }
    function acc(x) { return x && num(x[2]) + num(x[3]) >= 5 ? Math.round(num(x[2]) / (num(x[2]) + num(x[3])) * 100) : null; } // 5+ answers, as on the phone
    var trk = {}; (sm.trk || []).forEach(function (e) { if (e && e[0]) trk["20" + e[0]] = e; });
    function tk(d, i) { var e = trk[d]; return e && e[i] != null ? num(e[i]) : null; }
    function stuck(d) { var a = tk(Store.addDays(d, -7), 2), b = tk(d, 2); return a != null && b != null ? b - a : null; } // change in words in box 4–5
    var rows = [["Study days", col(0), ""], ["Minutes", col(1), ""], ["XP", two(sm.xpw), ""], ["Accuracy (HSK 4 answers)", [acc(w[0]), acc(w[1])], "%"],
      ["Readiness /300", [tk(lw, 1), tk(ws, 1)], ""], ["HSK 4 words added", col(4), ""], ["Words mastered (net)", [stuck(lw), stuck(ws)], ""], ["Role-play talks", two((sm.talk || {}).wk), ""]];
    var sofar = Math.max(1, Math.min(7, Store.daysBetween(ws, saved) + 1));
    var html = '<section class="card" id="lt-week"><div class="lt-row"><b>Week by week</b><small>weeks start Monday</small></div>' +
      '<table class="lt-tab lt-wk"><thead><tr><th scope="col">Last 2 weeks</th><th scope="col">' + esc(lrnDate(lw).slice(0, -5)) + '</th><th scope="col">' + esc(lrnDate(ws).slice(0, -5)) + ' <span class="lt-so">so far</span></th><th scope="col">Change</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var v = x[1];
        return '<tr><th scope="row">' + esc(x[0]) + "</th><td>" + (v[0] == null ? "–" : v[0] + x[2]) + "</td><td><b>" + (v[1] == null ? "–" : v[1] + x[2]) + "</b></td>" + lrnDelta(v[0], v[1], x[2] === "%" ? " pts" : "") + "</tr>";
      }).join("") + "</tbody></table>" +
      '<p class="sub">The newer week has ' + sofar + (sofar === 1 ? " day" : " days") + " so far (up to the last backup), so totals can still grow." + (wk ? "" : " Study days, minutes, accuracy and words added need the newer app on this phone.") + "</p></section>";
    return html;
  }
  /* What the AI gets to draft a chat message: this learner's numbers and the last few messages (no answers, no notes). */
  function draftPayload(r) {
    var sm = r.summary || {}, pg = sm.progress || {}, ex = DAYRE.test(pg.exam || "") ? Store.daysBetween(Store.today(), pg.exam) : null, weak = (sm.trend || [])[0], ms = pg.mocks || [];
    var d28 = /^[01]{28}$/.test(sm.days28 || "") ? sm.days28.slice(-7).split("").filter(function (c) { return c === "1"; }).length : null;
    return { name: lrnName(r), daysLeft: ex, idle: lrnIdle(r), streak: sm.streak ? num(sm.streak.n) : num((r.meta || {}).streak), active7: d28, ready: pg.ready ? num(pg.ready.total) : null,
      weak: weak ? weak.skill : "", weakAcc: weak ? num(weak.acc) : null, lastMock: ms.length ? num(ms[ms.length - 1].t) : null, due: pg.due != null ? num(pg.due) : null,
      last: ACHAT.msgs.slice(-6).map(function (m) { return { from: m.sender === "learner" ? "learner" : "team", text: m.body || "", ago: Math.max(0, Math.round((Date.now() - new Date(m.created_at).getTime()) / 864e5)) }; }),
      actions: CHAT_ACTS.map(function (a) { return { href: a[0], label: a[1] }; }) };
  }
  var LRN_SECS = [["progress", "Progress"], ["practice", "Practice"], ["habit", "Habit"], ["week", "Week"], ["chat", "Chat"]];
  /* one-tap buttons the teacher can attach to a message; each opens that screen on the learner's phone */
  var CHAT_ACTS = [["#/session", "Start Today's session"], ["#/shadow", "Practise speaking (shadowing)"], ["#/session/comeback", "5-minute restart"], ["#/exam", "Open my exam plan"], ["#/mock/4/sim", "Full mock 4 in the simulator"], ["#/mock/5/sim", "Full mock 5 in the simulator"],
    ["#/mock/6/sim", "Full mock 6 in the simulator"], ["#/parts", "Practise one exam part"], ["#/parts/R1", "Reading part 1, timed"], ["#/parts/R3", "Reading part 3, timed"], ["#/parts/W1", "Writing part 1, timed"],
    ["#/parts/W2", "Writing part 2, timed"], ["#/parts/L2", "Listening part 2, timed"], ["#/mistakes/repeat", "Fix my repeat mistakes"], ["#/mistakes", "Open my mistake notebook"], ["#/review", "Review due words"], ["#/exams", "Open My exams"], ["#/me", "Check my cloud backup"]];
  var ACHAT = { timer: null, id: "", msgs: [], prefill: null };
  /* "when" choices for a message; the time is the admin phone's local time */
  function whenHTML(id) {
    var h = new Date().getHours();
    return '<label class="sr" for="' + id + '">When</label><select id="' + id + '" class="ac-act ac-when"><option value="">Send now</option>' + (h < 19 ? '<option value="t20">Tonight at 20:00</option>' : "") +
      '<option value="m7">Tomorrow at 07:00</option><option value="m12">Tomorrow at 12:00</option><option value="m20">Tomorrow at 20:00</option><option value="pick">Pick a time…</option></select>' +
      '<input type="datetime-local" id="' + id + '-at" class="ac-act" hidden aria-label="Delivery time">';
  }
  function wireWhen(id) { var w = document.getElementById(id), x = document.getElementById(id + "-at"); w.onchange = function () { x.hidden = w.value !== "pick"; }; }
  function whenISO(id) {
    var v = document.getElementById(id).value, d = new Date();
    if (!v) return null;
    if (v === "pick") { var x = document.getElementById(id + "-at").value; var t = x ? new Date(x) : null; return t && !isNaN(t) && t > new Date() ? t.toISOString() : "bad"; }
    if (v.charAt(0) === "m") d.setDate(d.getDate() + 1);
    d.setHours(+v.slice(1), 0, 0, 0);
    return d.toISOString();
  }
  function adminChat(cur, host) {
    ACHAT.id = cur.id; var myHash = location.hash, sending = false;
    host.innerHTML = '<section class="card chat-box"><p class="sub" id="ac-status">' + (lrnPhone(cur).replace(/<\/?p[^>]*>/g, "") || "This phone hasn't opened the new app version yet.") + "</p>" +
      '<div id="ac-log" class="chat-log" role="log" aria-live="polite"><p class="sub">Loading…</p></div>' +
      '<label class="sr" for="ac-act">Button to attach</label><select id="ac-act" class="ac-act"><option value="">No button</option>' + CHAT_ACTS.map(function (a) { return '<option value="' + esc(a[0]) + '">🔘 ' + esc(a[1]) + "</option>"; }).join("") + "</select>" + whenHTML("ac-when") +
      '<div class="chat-form"><label class="sr" for="ac-in">Message</label><textarea id="ac-in" rows="2" maxlength="1000" placeholder="Write to ' + esc(lrnName(cur)) + '…"></textarea><button type="button" class="btn primary" id="ac-send">Send</button></div>' +
      '<p class="sub">She sees it in the app (Home and Me → Chat), live while the app is open. </p><button type="button" class="btn small ai-btn" id="ac-draft">✨ Draft with AI</button> <small class="muted">Type a few words first to steer it (e.g. "ask about mock 5").</small></section>';
    function draw(r) {
      if (location.hash !== myHash) return;
      var log = document.getElementById("ac-log"); if (!log) return;
      if (r && r.ok) {
        ACHAT.msgs = r.result.msgs || [];
        var st = document.getElementById("ac-status"); if (st) st.innerHTML = lrnPhone({ last_open: r.result.last_open, client: r.result.client }).replace(/<\/?p[^>]*>/g, "") || "This phone hasn't opened the new app version yet.";
        if (r.result.live) chatLive(r.result.live, function () { poll(); });
      } else if (r) { log.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(r.error)) + "</div>"; return; }
      var atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60 || !log.dataset.drawn;
      log.innerHTML = chatLogHTML(ACHAT.msgs, "admin", lrnName(cur)); log.dataset.drawn = "1";
      if (atEnd) log.scrollTop = log.scrollHeight;
    }
    function poll() { if (location.hash !== myHash || document.hidden) return; Content.admin("admin_chat_get", { id: cur.id, since: 0, read: true }).then(draw); }
    poll(); clearInterval(ACHAT.timer);
    ACHAT.timer = setInterval(function () { if (location.hash !== myHash) { clearInterval(ACHAT.timer); return; } poll(); }, 10000);
    document.getElementById("ac-draft").onclick = function () {
      var b = this, inp = document.getElementById("ac-in"), pl = draftPayload(cur); pl.note = inp.value.trim().slice(0, 200);
      b.disabled = true; b.textContent = "✨ Writing…";
      Content.admin("draft", pl).then(function (r) {
        b.disabled = false; b.textContent = "✨ Draft with AI";
        if (!r.ok) { UI.toast(AI.errMsg(r.error), "⚠️"); return; }
        inp.value = r.result.text; inp.rows = 5; inp.focus();
        if (r.result.action) document.getElementById("ac-act").value = r.result.action;
        UI.toast("Draft ready · edit it, then Send", "✨");
      });
    };
    wireWhen("ac-when");
    if (ACHAT.prefill) { // a suggested message from an alert
      document.getElementById("ac-in").value = ACHAT.prefill.text; document.getElementById("ac-in").rows = 5;
      if (ACHAT.prefill.href && CHAT_ACTS.some(function (x) { return x[0] === ACHAT.prefill.href; })) document.getElementById("ac-act").value = ACHAT.prefill.href;
      ACHAT.prefill = null;
    }
    document.getElementById("ac-log").addEventListener("click", function (e) {
      var b = e.target.closest("[data-unsched]"); if (!b) return;
      b.disabled = true;
      Content.admin("admin_chat_delete", { id: cur.id, mid: +b.getAttribute("data-unsched"), since: 0 }).then(function (r) { if (r.ok) { UI.toast("Scheduled message cancelled", "🗑️"); draw(r); } else UI.toast(AI.errMsg(r.error), "⚠️"); });
    });
    document.getElementById("ac-send").onclick = function () {
      var inp = document.getElementById("ac-in"), sel = document.getElementById("ac-act"), v = inp.value.trim(), a = sel.value, btn = this, at = whenISO("ac-when");
      if (sending || (!v && !a)) { inp.focus(); return; }
      if (at === "bad") { UI.toast("Pick a time in the future", "⏰"); return; }
      var act = a ? { href: a, label: CHAT_ACTS.filter(function (x) { return x[0] === a; })[0][1] } : null;
      sending = true; btn.disabled = true;
      Content.admin("admin_chat_send", { id: cur.id, body: v, action: act, at: at, since: 0 }).then(function (r) {
        sending = false; btn.disabled = false;
        if (!r.ok) { UI.toast(AI.errMsg(r.error), "⚠️"); return; }
        if (at) UI.toast("Scheduled", "⏰");
        inp.value = ""; sel.value = ""; document.getElementById("ac-when").value = ""; document.getElementById("ac-when-at").hidden = true; var log = document.getElementById("ac-log"); if (log) log.dataset.drawn = ""; draw(r);
      });
    };
  }
  function viewLearners(key, sec) {
    var head = '<section class="card"><a class="pill" href="#/me">‹ Me</a><h2>👥 Learner tracking</h2><p class="sub">Numbers only, never answers or notes. Each phone sends them with its cloud backup.</p></section>';
    if (!window.AI || !AI.configured()) { render(head + '<p class="empty">Turn on the AI assistant first (Me → AI assistant).</p>', "me"); return; }
    if (!Content.adminCode()) {
      render(head + '<section class="card"><label for="fx-code">Reviewer code</label><input id="fx-code" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="ADMIN_CODE"><div class="actions"><button class="btn small primary" id="fx-save">Save on this phone</button></div><p class="sub" id="fx-msg"></p></section>', "me");
      document.getElementById("fx-save").onclick = function () { var v = document.getElementById("fx-code").value.trim(); if (v.length < 12) { document.getElementById("fx-msg").textContent = "At least 12 characters."; return; } Content.setAdminCode(v); viewLearners(key, sec); };
      return;
    }
    render(head + '<div id="lt-body"><p class="sub">Loading…</p></div>', "me");
    Content.admin("learners_list", {}).then(function (res) {
      var host = document.getElementById("lt-body"); if (!host) return;
      if (!res.ok) { host.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"; if (res.error === "bad_admin") { Content.setAdminCode(""); viewLearners(key, sec); } return; }
      var rows = res.result.rows || [], cur = null;
      if (!rows.length) { host.innerHTML = '<p class="empty">No phone has saved a backup yet.</p>'; return; }
      if (key === "all") { lrnAll(rows, host); return; }
      if (key === "bank" || key === "hard") { host.innerHTML = adminSeg(rows, null, key) + '<div id="ad-body"><p class="sub">Loading…</p></div>'; if (key === "bank") adminBank(sec); else adminHard(); return; }
      rows.forEach(function (r) { if (key && lrnKey(r) === key) cur = r; });
      var seg = adminSeg(rows, cur, "");
      if (!cur) {
        host.innerHTML = seg + lrnOverview(rows);
        if (res.result.live) chatLive(res.result.live, function () { if (location.hash === "#/learners") viewLearners(); }); // a learner wrote: refresh the overview
        host.onclick = function (e) {
          var sb = e.target.closest("[data-sug]"), cb = e.target.closest("[data-cheer]");
          if (sb) { var sg = SUGS[sb.getAttribute("data-sug")]; if (!sg) return; ACHAT.prefill = sg; location.hash = "#/learners/" + sg.key + "/chat"; return; }
          if (cb) {
            var w = WINS[+cb.getAttribute("data-cheer")]; if (!w) return;
            cb.disabled = true;
            Content.admin("admin_chat_send", { id: w.r.id, body: cheerMsg(w.r, w.e), since: 0 }).then(function (r) {
              if (!r.ok) { cb.disabled = false; UI.toast(AI.errMsg(r.error), "⚠️"); return; }
              var d = cheered(); d.push(winKey(w.r, w.e)); try { localStorage.setItem(CHEER_KEY, JSON.stringify(d.slice(-200))); } catch (x) { /* fine */ }
              cb.outerHTML = '<span class="muted">Cheered ✓</span>'; UI.toast("Cheer sent to " + lrnName(w.r), "👏");
            });
          }
        };
        return;
      }
      var chips = '<div class="lt-chips">' + rows.map(function (r) { return '<a class="lt-pick' + (r === cur ? " on" : "") + '" href="#/learners/' + lrnKey(r) + "/" + (sec || "progress") + '"' + (r === cur ? ' aria-current="page"' : "") + ">" + esc(lrnName(r)) + (r.unread ? ' <span class="lt-unread">' + r.unread + "</span>" : "") + "</a>"; }).join("") + "</div>";
      var tabs = '<nav class="seg seg3" aria-label="Sections">' + LRN_SECS.map(function (t) { return '<a href="#/learners/' + lrnKey(cur) + "/" + t[0] + '"' + (t[0] === (sec || "progress") ? ' class="active" aria-current="page"' : "") + ">" + t[1] + "</a>"; }).join("") + "</nav>";
      var body = sec === "chat" ? '<div id="ac-host"></div>' : !cur.summary ? '<p class="card sub">No study summary yet (this phone has an older app version).</p>' : sec === "practice" ? lrnPractice(cur) : sec === "habit" ? lrnHabit(cur) : sec === "week" ? lrnWeek(cur) : lrnProgress(cur);
      host.innerHTML = seg + chips + tabs + '<p class="sub lt-saved">' + esc(lrnName(cur)) + " · saved " + esc(agoText(cur.updated_at)) + ' · <button class="btn small" id="lt-ren">Rename</button>' + (sec === "chat" ? "" : ' <a class="btn small" id="lt-msg" href="#/learners/' + lrnKey(cur) + '/chat">💬 Chat' + (cur.unread ? " (" + cur.unread + ")" : "") + "</a>") + "</p>" + body;
      if (sec === "chat") adminChat(cur, document.getElementById("ac-host"));
      document.getElementById("lt-ren").onclick = function () {
        var v = window.prompt("Name for this learner (only you see it)", (cur.meta || {}).label || ""); if (v == null) return;
        Content.admin("learner_label", { id: cur.id, label: v.trim().slice(0, 30) }).then(function (x) { if (x.ok) viewLearners(key, sec); else UI.toast(AI.errMsg(x.error), "⚠️"); });
      };
    });
  }
  function adminSeg(rows, cur, on) {
    var a = function (href, label, act) { return '<a href="' + href + '"' + (act ? ' class="active" aria-current="page"' : "") + ">" + label + "</a>"; };
    return '<nav class="seg seg4" aria-label="Learner tracking views">' + a("#/learners", "Overview", !cur && !on) + a("#/learners/" + lrnKey(cur || rows[0]) + "/progress", "Learner", !!cur) +
      a("#/learners/bank", "Questions", on === "bank") + a("#/learners/hard", "Hardest", on === "hard") + "</nav>";
  }
  /* Question bank: AI questions wait here until approved; approved ones go to every learner (and get recorded audio in the next deploy) */
  function bankItemHTML(r) {
    var d = r.data || {}, mcHTML = function (opts, ans) { return '<ol class="bk-opts">' + (opts || []).map(function (o, i) { return "<li" + (i === ans ? ' class="ok"' : "") + '><span class="zh">' + esc(o) + "</span>" + (i === ans ? " ✓" : "") + "</li>"; }).join("") + "</ol>"; };
    var say = function (t, v) { return SAYX(t, v); }, body = "";
    if (r.kind === "listen" && r.part === "L1") body = '<p class="zh">' + say(d.text, "F") + " " + esc(d.text) + '</p><p>★ <span class="zh">' + esc(d.statement) + "</span> → <b>" + (d.answer ? "True" : "False") + "</b></p>";
    else if (r.kind === "listen") body = '<div class="bk-dlg">' + (d.dialogue || []).map(function (l) { return '<p class="zh">' + say(l.zh, l.sp === "男" ? "M" : "F") + " <b>" + esc(l.sp) + "：</b>" + esc(l.zh) + "</p>"; }).join("") + '</div><p class="zh"><b>' + esc(d.question) + "</b></p>" + mcHTML(d.options, d.answer);
    else if (r.kind === "passage") body = '<p class="zh passage">' + esc(d.passage) + "</p>" + (d.questions || []).map(function (q) { return '<p class="zh"><b>' + esc(q.q) + "</b></p>" + mcHTML(q.options, q.answer); }).join("");
    else if (r.kind === "fill") body = '<p class="zh">' + esc(d.sentence) + "</p>" + mcHTML(d.options, d.answer) + (d.src ? '<p class="sub">Made from: <span class="zh">' + esc(d.src) + "</span></p>" : "");
    else body = '<p class="zh">' + esc((d.tokens || []).join(" / ")) + '</p><p>→ <b class="zh">' + esc(d.answer) + "</b></p>" + (d.src ? '<p class="sub">Made from: <span class="zh">' + esc(d.src) + "</span></p>" : "");
    var expl = d.explain ? '<p class="sub">' + esc(d.explain) + "</p>" : (d.questions || []).map(function (q) { return q.explain ? '<p class="sub">' + esc(q.explain) + "</p>" : ""; }).join("");
    var what = r.kind === "listen" ? PART_NAME[r.part] : r.kind === "passage" ? "Reading part 3" : r.kind === "fill" ? "Fill the gap" : "Word order";
    return '<section class="card bk-item" data-bk="' + r.id + '"><div class="sec-h"><b>' + esc(what) + '</b><span class="muted">#' + r.id + " · " + esc(agoText(r.created_at)) + "</span></div>" + body + expl +
      '<div class="actions">' + (r.status !== "approved" ? '<button class="btn small primary" data-bkd="approve">✓ Approve</button>' : "") + (r.status !== "rejected" ? '<button class="btn small bad" data-bkd="reject">✗ Reject</button>' : "") +
      (r.status !== "pending" ? '<button class="btn small" data-bkd="reset">Back to waiting</button>' : "") + "</div></section>";
  }
  function adminBank(st) {
    st = ["pending", "approved", "rejected"].indexOf(st) >= 0 ? st : "pending";
    Content.admin("bank_list", { status: st }).then(function (res) {
      var host = document.getElementById("ad-body"); if (!host) return;
      if (!res.ok) { host.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error === "db_error" ? "bank_missing" : res.error)) + "</div>"; return; }
      var c = res.result.counts || {}, rows = res.result.rows || [], names = { pending: "Waiting", approved: "Approved", rejected: "Rejected" };
      host.innerHTML = '<section class="card"><h2>🧪 Question bank</h2><p class="sub">New questions the AI wrote for learners. Approve the good ones: every learner gets them before the AI is asked again, they are marked "checked by the C&amp;B team", and the next deploy records audio for the listening ones. Check that exactly one answer is right.</p>' +
        '<div class="fx-tabs">' + ["pending", "approved", "rejected"].map(function (k) { return '<a class="btn small' + (k === st ? " primary" : "") + '" href="#/learners/bank/' + k + '">' + names[k] + " (" + num(c[k]) + ")</a>"; }).join("") + "</div>" +
        (st === "pending" && rows.length > 1 ? '<div class="actions"><button class="btn small" id="bk-all">✓ Approve all ' + rows.length + " shown</button></div>" : "") + "</section>" +
        (rows.length ? rows.map(bankItemHTML).join("") : '<p class="empty">Nothing here.</p>');
      function decide(ids, act, els) {
        els.forEach(function (el) { [].forEach.call(el.querySelectorAll("button"), function (b) { b.disabled = true; }); });
        Content.admin("bank_decide", { ids: ids, decision: act }).then(function (r) {
          if (!r.ok) { UI.toast(AI.errMsg(r.error), "⚠️"); els.forEach(function (el) { [].forEach.call(el.querySelectorAll("button"), function (b) { b.disabled = false; }); }); return; }
          UI.toast(act === "approve" ? "Approved · learners get it now" : act === "reject" ? "Rejected" : "Back to waiting", "🧪"); adminBank(st); bankRefresh(true);
        });
      }
      host.onclick = function (ev) {
        var b = ev.target.closest("[data-bkd]"); if (b) { var el = b.closest("[data-bk]"); decide([+el.getAttribute("data-bk")], b.getAttribute("data-bkd"), [el]); return; }
        if (ev.target.closest("#bk-all") && confirm("Approve all " + rows.length + " questions on this page?")) decide(rows.map(function (r) { return r.id; }), "approve", [].slice.call(host.querySelectorAll("[data-bk]")));
      };
    });
  }
  /* the question behind a stats key, as text the admin can read */
  function qLabel(k) {
    var m = /^m:(\d+):(.+)$/.exec(k), x, e = (Store.state.mistakes || {})[k];
    if (m) { x = findMockItem(+m[1], m[2]); return x ? { where: "Mock " + m[1] + " · " + (PART_NAME[partKey(x.it)] || skillName(x.skill)), q: promptOf(x) } : { where: "Mock " + m[1], q: m[2] }; }
    if (/^bk:/.test(k)) { var id = +k.split(":")[1], r = bankAll().filter(function (b) { return b.id === id; })[0]; return { where: "Question bank #" + id, q: r ? (r.data.question || r.data.statement || r.data.sentence || (r.data.passage || "").slice(0, 40) + "…") : "" }; }
    if (/^w:/.test(k)) { var w = WORDMAP[k.slice(2)]; return { where: "Word", q: w ? w.hanzi + " · " + (w.en || w.vi || "") : k.slice(2) }; }
    var t = e ? mistakeText(e) : null;
    return { where: k.split(":")[0] === "dr" ? "Drill" : k.split(":")[0] === "q" ? "Lesson quiz" : k.split(":")[0] === "g" ? "Grammar" : "Practice", q: t ? t.q : k };
  }
  function adminHard() {
    Content.admin("q_stats", {}).then(function (res) {
      var host = document.getElementById("ad-body"); if (!host) return;
      if (!res.ok) { host.innerHTML = '<div class="ai-card ai-bad">⚠️ ' + esc(AI.errMsg(res.error)) + "</div>"; return; }
      var rows = res.result.rows || [];
      host.innerHTML = '<section class="card"><h2>📉 Hardest questions</h2><p class="sub">Questions learners miss most, from ' + plural(num(res.result.learners), "learner") + " (phones on the new app version). A question almost everyone misses may have a wrong key or a confusing wording: open it and report it, or teach that point in a chat message.</p></section>" +
        (rows.length ? '<section class="card"><div class="hard-list">' + rows.slice(0, 40).map(function (r) {
          var n = r.r + r.w, pc = Math.round(r.w / n * 100), L = qLabel(r.k);
          return '<div class="hard-row"><span class="hard-pc ' + (pc >= 60 ? "bad-t" : "") + '">' + pc + '%</span><span class="hard-t"><b class="zh">' + esc(String(L.q || "").slice(0, 90)) + "</b><small>" + esc(L.where) + " · " + r.w + " wrong of " + n + (r.l > 1 ? " · " + r.l + " learners" : "") + "</small></span></div>";
        }).join("") + "</div></section>" : '<p class="empty">Not enough answers yet. Numbers appear after learners open the new app version and practise.</p>');
    });
  }
  function fixCard(r) {
    var v = r.verdict || {}, set = (r.patch && r.patch.set) || [], snap = r.snapshot || {};
    var passes = (v.passes || []).map(function (p, i) { return "<li><b>" + esc(p.verdict) + "</b> · " + esc(p.model) + "<br><small>" + esc(p.reasoning) + "</small></li>"; }).join("");
    var liveObj = Content.resolve(r.ref), rowsHTML = set.map(function (x) { return fixRow(x.path, x.value, Content.getPath(liveObj || snap, x.path)); }).join("");
    var acc = FIX_TAB === "accepted";
    return '<div class="card fx" data-fx="' + r.id + '"><div class="sec-h"><b>' + esc(r.ref) + '</b><span class="muted">#' + r.id + (r.quarantine ? " · hidden" : "") + "</span></div>" +
      '<p class="sub">Note: ' + esc(r.note || "") + "</p>" + liveItemHTML(r.ref, snap) +
      (passes ? '<p class="sub">AI checks:</p><ul class="fx-pass">' + passes + "</ul>" : "") +
      '<div class="fx-rows">' + rowsHTML + "</div>" +
      (acc ? '<div class="actions"><button class="btn small bad" data-fxact="revoke">Undo this fix</button></div>' :
        '<div class="actions"><button class="btn small" data-fxadd>＋ field</button><button class="btn small primary" data-fxact="accept">Accept</button><button class="btn small bad" data-fxact="reject">Reject</button><button class="btn small" data-fxact="' + (r.quarantine ? "unhide" : "hide") + '">' + (r.quarantine ? "Show again" : "Hide item") + "</button></div>") + "</div>";
  }
  /* the reviewer must see the item as the app really has it; a report's own snapshot can be wrong or forged */
  function liveItemHTML(ref, snap) {
    var live = Content.resolve(ref), liveS = live ? JSON.stringify(live, function (k, v) { return k && k.charAt(0) === "_" ? undefined : v; }) : "";
    var same = live && liveS === JSON.stringify(snap);
    return (live ? '<p class="sub">' + (same ? "✓ The report matches the item in the app now:" : "⚠ The report does NOT match the item in the app. Trust this version:") + '</p><pre class="fx-item">' + esc(JSON.stringify(JSON.parse(liveS), null, 1).slice(0, 700)) + "</pre>" :
      '<p class="sub bad-t">⚠ This item is not loaded here, so it can\'t be compared. Report copy:</p><pre class="fx-item">' + esc(JSON.stringify(snap, null, 1).slice(0, 700)) + "</pre>");
  }
  function fixRow(path, value, old) {
    return '<div class="fx-row"><input class="fx-path" value="' + esc(path) + '" placeholder="field e.g. answer"><input class="fx-val" value="' + esc(value) + '" placeholder="new value">' + (old !== undefined ? '<small class="muted">was: ' + esc(typeof old === "object" ? JSON.stringify(old) : old) + "</small>" : "") + "</div>";
  }
  function wireFix(r) {
    var el = document.querySelector('[data-fx="' + r.id + '"]'); if (!el) return;
    var add = el.querySelector("[data-fxadd]"); if (add) add.onclick = function () { el.querySelector(".fx-rows").insertAdjacentHTML("beforeend", fixRow("", "")); };
    [].forEach.call(el.querySelectorAll("[data-fxact]"), function (b) {
      b.onclick = function () {
        var act = b.getAttribute("data-fxact"), set = [].map.call(el.querySelectorAll(".fx-row"), function (x) { return { path: x.querySelector(".fx-path").value.trim(), value: x.querySelector(".fx-val").value.trim() }; }).filter(function (x) { return x.path && x.value !== ""; });
        if (act === "accept" && !set.length) { UI.toast("Add at least one change", "✍️"); return; }
        if (act === "reject" && !confirm("Reject this report?")) return;
        if (act === "hide" && !confirm("Hide this item from quizzes until someone shows it again?")) return;
        [].forEach.call(el.querySelectorAll("button"), function (x) { x.disabled = true; });
        Content.admin("review_decide", { id: r.id, decision: act, patch: { set: set } }).then(function (res) {
          if (!res.ok) { UI.toast(AI.errMsg(res.error), "⚠️"); [].forEach.call(el.querySelectorAll("button"), function (x) { x.disabled = false; }); return; }
          UI.toast({ accept: "Fix accepted", reject: "Rejected", revoke: "Fix undone", hide: "Item hidden", unhide: "Item shown again" }[act] || "Done", "🛠");
          Content.sync(true).then(function () { Content.apply(); viewFixes(); });
        });
      };
    });
  }
  function reportsText() {
    return (Store.state.reports || []).map(function (r, i) { return (i + 1) + ". [" + r.date + "] " + r.route + "\n   " + r.text + "\n   screen: " + r.ctx; }).join("\n\n");
  }
  function viewReports() {
    var list = Store.state.reports || [];
    var html = '<section class="card"><h2>⚑ Problem reports</h2><p class="sub">Notes you saved with the ⚑ button at the top. Copy them to share or to fix content later.</p>' +
      (list.length ? '<div class="actions"><button class="btn small primary" id="rp-copy">Copy all</button><button class="btn small bad" id="rp-clear">Clear all</button></div>' : '<p class="empty">No reports yet. Tap ⚑ in the top bar on any screen.</p>') + "</section>" +
      list.slice().reverse().map(function (r) {
        return '<section class="card report-item"><div class="sec-h"><span class="muted">' + esc(r.date) + '</span><a href="' + (/^#\/[\w\/-]*$/.test(r.route) ? esc(r.route) : "#/") + '">Open screen ›</a></div><p>' + esc(r.text) +
          '</p><p class="sub rp-ctx">' + esc(r.ctx) + '</p><button class="btn small" data-rdel="' + esc(r.id) + '">Delete</button></section>';
      }).join("");
    render(html, "me");
    var cp = document.getElementById("rp-copy");
    if (cp) cp.onclick = function () {
      var t = reportsText();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { UI.toast("Copied", "📋"); }, function () { UI.toast("Copy failed", "⚠️"); });
      else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); UI.toast("Copied", "📋"); } catch (e) { UI.toast("Copy failed", "⚠️"); } ta.remove(); }
    };
    var cl = document.getElementById("rp-clear");
    if (cl) cl.onclick = function () { if (confirm("Delete all problem reports?")) { Store.state.reports = []; Store.save(); viewReports(); } };
    document.querySelectorAll("[data-rdel]").forEach(function (b) {
      b.onclick = function () { Store.state.reports = Store.state.reports.filter(function (r) { return r.id !== b.getAttribute("data-rdel"); }); Store.save(); viewReports(); };
    });
  }
  function strokeFiles() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) { Array.from(w.hanzi).forEach(function (c) { if (/[\u3400-\u9fff]/.test(c) && !seen[c]) { seen[c] = 1; out.push("vendor/hanzi/" + encodeURIComponent(c) + ".json"); } }); });
    return out;
  }
  /* Save audio + handwriting stroke data for offline use. */
  function audioStatus(cb) { try { Audio2.saved(function (st) { if (st.ok) cb(st); }); } catch (e) { /* status is optional */ } }
  function downloadAudio(btn) {
    var jobs = Audio2.allFiles().map(function (f) { return ["cb-audio", f]; })
      .concat(strokeFiles().map(function (f) { return ["cb-strokes", f]; }))
      .concat([["cb-strokes", "vendor/hanzi-writer.min.js"]]);
    var i = 0, done = 0, fail = 0, active = 0, total = jobs.length;
    btn.disabled = true;
    function next() {
      if (i >= total) {
        if (active === 0) { btn.textContent = "✓ " + done + " saved"; try { localStorage.setItem("cbChinese.audioDl", "1"); } catch (e) { /* ignore */ } UI.toast("Saved for offline" + (fail ? " (" + fail + " failed)" : ""), "⬇"); }
        return;
      }
      var job = jobs[i++]; active++;
      caches.open(job[0]).then(function (cache) {
        return cache.match(job[1]).then(function (hit) { return hit || fetch(job[1]).then(function (r) { if (!r.ok) throw 0; return cache.put(job[1], r); }); });
      }).then(function () { done++; }, function () { fail++; }).then(function () {
        active--; btn.textContent = Math.round((done + fail) / total * 100) + "%"; next();
      });
    }
    for (var k = 0; k < 4; k++) next();
  }

