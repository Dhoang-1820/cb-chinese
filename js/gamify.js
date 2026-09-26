/* UI effects (toast, confetti, XP pop, modal, mascot) + gamification (XP, levels, badges, daily goal). */
(function () {
  "use strict";

  /* ---------------- UI effects ---------------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toastQ = [], toastBusy = false;

  function toast(msg, icon) {
    toastQ.push({ msg: msg, icon: icon || "" });
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    var t = document.getElementById("toast"), item = toastQ.shift();
    if (!item) { toastBusy = false; return; }
    toastBusy = true;
    t.innerHTML = (item.icon ? '<span class="t-ico">' + item.icon + "</span>" : "") + "<span>" + escHTML(item.msg) + "</span>";
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); setTimeout(nextToast, 250); }, 2400);
  }
  function escHTML(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function confetti(amount) {
    if (reduced) return;
    var cv = document.createElement("canvas"), dpr = window.devicePixelRatio || 1;
    cv.className = "confetti";
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(dpr, dpr);
    var colors = ["#ff6b6b", "#ffb84d", "#ffe066", "#4dd4a8", "#4fa8ff", "#9b6bff", "#ff6bd6"];
    var parts = [];
    for (var i = 0; i < (amount || 120); i++) {
      parts.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
        s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, col: colors[i % colors.length], round: Math.random() < 0.3 });
    }
    var start = performance.now();
    (function frame(now) {
      var t = now - start;
      c.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col;
        c.globalAlpha = Math.max(0, 1 - t / 2600);
        if (p.round) { c.beginPath(); c.arc(0, 0, p.s / 2, 0, 7); c.fill(); } else c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        c.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else cv.remove();
    })(start);
  }

  function pop(text, x, y, cls) {
    var el = document.createElement("div");
    el.className = "xp-pop " + (cls || "");
    el.textContent = text;
    el.style.left = (x == null ? innerWidth / 2 : x) + "px";
    el.style.top = (y == null ? innerHeight * 0.4 : y) + "px";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }

  function shake(el) { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

  function modal(html, onClose) {
    var wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '<button class="btn primary wide" data-close>OK</button></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("show"); });
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || e.target.closest("[data-close]")) {
        wrap.classList.remove("show");
        setTimeout(function () { wrap.remove(); if (onClose) onClose(); }, 250);
      }
    });
  }

  /* Original mascot: 薪薪, a little gold coin with a sprout. mood: happy | wow | sad | cheer */
  function mascot(mood, size) {
    mood = mood || "happy";
    var eyes = {
      happy: '<path d="M44 58q5-6 10 0M66 58q5-6 10 0" stroke="#5a3200" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
      cheer: '<path d="M44 58q5-7 10 0M66 58q5-7 10 0" stroke="#5a3200" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
      wow: '<circle cx="49" cy="57" r="4.5" fill="#5a3200"/><circle cx="71" cy="57" r="4.5" fill="#5a3200"/><circle cx="50.5" cy="55.5" r="1.4" fill="#fff"/><circle cx="72.5" cy="55.5" r="1.4" fill="#fff"/>',
      sad: '<path d="M44 57q5 4 10 0M66 57q5 4 10 0" stroke="#5a3200" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    }[mood];
    var mouth = {
      happy: '<path d="M52 70q8 8 16 0" stroke="#5a3200" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
      cheer: '<path d="M50 68q10 14 20 0z" fill="#5a3200"/><path d="M54 72q6 5 12 0" fill="#ff7a7a"/>',
      wow: '<ellipse cx="60" cy="73" rx="5" ry="6" fill="#5a3200"/>',
      sad: '<path d="M52 75q8-7 16 0" stroke="#5a3200" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    }[mood];
    return '<svg class="mascot m-' + mood + '" viewBox="0 0 120 120" width="' + (size || 64) + '" height="' + (size || 64) + '" aria-hidden="true">' +
      '<defs><radialGradient id="coinG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".55" stop-color="#ffcb3d"/><stop offset="1" stop-color="#f09a0a"/></radialGradient></defs>' +
      '<path d="M60 18c-2-8 4-14 12-14-1 8-6 12-12 14z" fill="#3ccf8e"/><path d="M60 18c1-7-4-12-10-12 0 7 4 11 10 12z" fill="#2bb67a"/>' +
      '<circle cx="60" cy="64" r="44" fill="url(#coinG)" stroke="#dc8500" stroke-width="4"/>' +
      '<circle cx="60" cy="64" r="35" fill="none" stroke="#eb9d12" stroke-width="2" stroke-dasharray="3 5"/>' +
      '<ellipse cx="41" cy="67" rx="6" ry="3.5" fill="#ff8f8f" opacity=".55"/><ellipse cx="79" cy="67" rx="6" ry="3.5" fill="#ff8f8f" opacity=".55"/>' +
      eyes + mouth + "</svg>";
  }

  window.UI = { toast: toast, confetti: confetti, pop: pop, shake: shake, modal: modal, mascot: mascot, reduced: reduced };

  /* ---------------- Levels ---------------- */
  var LEVELS = [
    { min: 0, zh: "实习生", vi: "Thực tập sinh", en: "Intern" },
    { min: 150, zh: "助理", vi: "Trợ lý", en: "Assistant" },
    { min: 400, zh: "专员", vi: "Chuyên viên", en: "Specialist" },
    { min: 800, zh: "主管", vi: "Trưởng nhóm", en: "Supervisor" },
    { min: 1400, zh: "经理", vi: "Trưởng phòng", en: "Manager" },
    { min: 2200, zh: "总监", vi: "Giám đốc bộ phận", en: "Director" },
    { min: 3200, zh: "总经理", vi: "Tổng giám đốc", en: "General Manager" },
    { min: 4500, zh: "C&B大师", vi: "Bậc thầy C&B", en: "C&B Master" }
  ];
  function level(xp) {
    var i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
    var L = LEVELS[i], N = LEVELS[i + 1];
    return { n: i + 1, zh: L.zh, vi: L.vi, en: L.en, min: L.min, next: N ? N.min : null, pct: N ? (xp - L.min) / (N.min - L.min) : 1 };
  }

  /* ---------------- Badges ---------------- */
  function srsCount() { return Object.keys(Store.state.srs).length; }
  function box5() { var s = Store.state.srs; return Object.keys(s).filter(function (k) { return s[k].box === 5; }).length; }
  function daysDone() { var d = Store.state.days; return Object.keys(d).filter(function (k) { return d[k].completed; }).length; }
  var BADGES = [
    { id: "first_step", icon: "🌱", vi: "Khởi đầu", en: "First step", dvi: "Học thẻ đầu tiên", den: "Grade your first card", test: function (s) { return s.stats.cards >= 1; } },
    { id: "words_10", icon: "📘", vi: "10 từ", en: "10 words", dvi: "10 từ trong bộ ôn tập", den: "10 words in review", test: function () { return srsCount() >= 10; } },
    { id: "words_50", icon: "📗", vi: "50 từ", en: "50 words", dvi: "50 từ trong bộ ôn tập", den: "50 words in review", test: function () { return srsCount() >= 50; } },
    { id: "words_120", icon: "📙", vi: "Nửa chặng", en: "Halfway", dvi: "120 từ trong bộ ôn tập", den: "120 words in review", test: function () { return srsCount() >= 120; } },
    { id: "words_240", icon: "🏆", vi: "Trọn bộ", en: "Full set", dvi: "Cả 240 từ", den: "All 240 words", test: function () { return srsCount() >= 240; } },
    { id: "streak_3", icon: "🔥", vi: "3 ngày liền", en: "3-day streak", dvi: "Học 3 ngày liên tiếp", den: "Study 3 days in a row", test: function (s) { return s.streak.best >= 3; } },
    { id: "streak_7", icon: "⚡", vi: "1 tuần", en: "7-day streak", dvi: "Học 7 ngày liên tiếp", den: "Study 7 days in a row", test: function (s) { return s.streak.best >= 7; } },
    { id: "streak_14", icon: "🌟", vi: "2 tuần", en: "14-day streak", dvi: "Học 14 ngày liên tiếp", den: "Study 14 days in a row", test: function (s) { return s.streak.best >= 14; } },
    { id: "streak_30", icon: "👑", vi: "30 ngày", en: "30-day streak", dvi: "Học 30 ngày liên tiếp", den: "Study 30 days in a row", test: function (s) { return s.streak.best >= 30; } },
    { id: "perfect_quiz", icon: "💯", vi: "Điểm tuyệt đối", en: "Perfect quiz", dvi: "Quiz 10/10", den: "Score 10/10 on a quiz", test: function (s) { return s.stats.perfectQuizzes >= 1; } },
    { id: "days_5", icon: "🗓️", vi: "5 ngày học", en: "5 days done", dvi: "Hoàn thành 5 ngày", den: "Complete 5 days", test: function () { return daysDone() >= 5; } },
    { id: "days_30", icon: "🎓", vi: "Tốt nghiệp", en: "Graduate", dvi: "Hoàn thành cả 30 ngày", den: "Complete all 30 days", test: function () { return daysDone() >= 30; } },
    { id: "box5_20", icon: "🧠", vi: "Nhớ lâu", en: "Long-term memory", dvi: "20 từ ở hộp 5", den: "20 words in box 5", test: function () { return box5() >= 20; } },
    { id: "builder", icon: "🧩", vi: "Kiến trúc sư câu", en: "Sentence architect", dvi: "Xếp câu 8/8", den: "Sentence Builder 8/8", test: function (s) { return (s.games.builder || {}).best >= 8; } },
    { id: "speedy", icon: "💨", vi: "Tay nhanh", en: "Speed demon", dvi: "Speed Match ≥ 60 điểm", den: "Speed Match score ≥ 60", test: function (s) { return (s.games.speed || {}).best >= 60; } },
    { id: "boss", icon: "🐉", vi: "Diệt boss", en: "Boss slayer", dvi: "Thắng một trận Boss", den: "Win a Boss Battle", test: function (s) { return s.stats.bossWins >= 1; } },
    { id: "night_owl", icon: "🦉", vi: "Cú đêm", en: "Night owl", dvi: "Học sau 22 giờ", den: "Study after 10 pm", test: function (s) { return s.stats.nightOwl >= 1; } },
    { id: "challenge_7", icon: "🎯", vi: "Thử thách x7", en: "Challenger", dvi: "Hoàn thành 7 thử thách ngày", den: "Finish 7 daily challenges", test: function (s) { return Object.keys(s.challenges).length >= 7; } }
  ];

  function checkBadges() {
    var s = Store.state, got = [];
    BADGES.forEach(function (b) {
      if (!s.badges[b.id] && b.test(s)) { s.badges[b.id] = Store.today(); got.push(b); }
    });
    if (got.length) {
      Store.save();
      got.forEach(function (b) { toast("Badge unlocked: " + b.en, b.icon); });
      Audio2.sfx.win(); confetti(90);
    }
  }

  /* ---------------- XP award ---------------- */
  function award(xp, opts) {
    opts = opts || {};
    var s = Store.state, before = level(s.xp), goal = s.settings.dailyGoal || 30;
    var todayBefore = s.log[Store.today()] || 0;
    var info = Store.touch(xp);
    if (xp > 0 && !opts.silent) pop("+" + xp + " XP", opts.x, opts.y);
    var after = level(s.xp);
    if (info.freezeUsed) toast("Streak saved with " + info.freezeUsed + " freeze" + (info.freezeUsed > 1 ? "s" : ""), "🧊");
    if (info.freezeEarned) toast("You earned a streak freeze", "🧊");
    if (todayBefore < goal && todayBefore + xp >= goal) { toast("Daily goal reached!", "🎯"); confetti(70); Audio2.sfx.win(); }
    if (after.n > before.n) {
      Audio2.sfx.win(); confetti(160);
      modal('<div class="lv-up">' + mascot("cheer", 96) + '<p class="lv-small">Level up · Lên cấp</p><h2 class="zh">' + after.zh + "</h2><p>" + after.en + " · " + after.vi + "</p></div>");
    }
    checkBadges();
    if (window.App && App.refreshChrome) App.refreshChrome();
  }

  window.Game = { LEVELS: LEVELS, BADGES: BADGES, level: level, award: award, checkBadges: checkBadges };
})();
