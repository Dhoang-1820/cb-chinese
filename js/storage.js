/* Progress storage: localStorage, XP log, streak (with freezes), export/import */
(function () {
  "use strict";
  var KEY = "cbChinese.progress.v1";

  function pad(n) { return String(n).padStart(2, "0"); }
  function fmt(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function parse(s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return fmt(d); }
  function daysBetween(a, b) { return Math.round((Date.UTC.apply(null, b.split("-").map(function (x, i) { return i === 1 ? x - 1 : +x; })) - Date.UTC.apply(null, a.split("-").map(function (x, i) { return i === 1 ? x - 1 : +x; }))) / 864e5); }

  function defaults() {
    return {
      version: 2,
      settings: { showPinyin: true, lang: "both", theme: "auto", audioRate: 1, sfx: true, examDate: "2026-11-14", coreTarget: 30, dailyGoal: 30, installHintDismissed: false, textSize: "m", onboarded: false, remindTime: "20:00", noise: 0, mockRate: 0, sessionMode: "std" },
      srs: {},        // wordId -> { box, due, right, wrong, added, last }
      days: {},       // dayNo -> { quizBest, practice: {}, completed }
      streak: { count: 0, last: null, best: 0 },
      log: {},        // date -> XP earned that day
      xp: 0,
      freezes: 0,     // streak freezes in stock (max 2)
      badges: {},     // badgeId -> date earned
      games: {},      // gameId -> { best, plays }
      mocks: {},      // mockId -> { best, plays, lastScore, lastSections: {listening, reading, writing} }
      mistakes: {},   // key -> { kind, skill, wrong, streak, added, last, ...refs }  (see js/learn.js)
      skills: {},     // skillId -> { r: right, w: wrong }
      mockHistory: [], // [{ id, date, total, sections }]
      sessions: {},   // date -> true when Today's session was completed
      official: [],   // official past-paper results: [{ id, date, name, l, r, w }] (each section /100)
      grammar: {},    // grammar point id -> { best, passes, mastered }
      reports: [],    // "Report a problem" notes: [{ id, date, route, text, ctx }]
      weekly: {},     // { cur: snapshot at the start of this week, last: summary of last week } (see weekly report in app.js)
      custom: [],     // learner's own words: [{ id: "u…", hanzi, pinyin, vi, en, example? }]
      questChest: {}, // date -> true when that day's quest chest was opened
      track: {},      // "w<week>s<session>" -> true when a 6-month track session was finished
      challenges: {}, // date -> true when the daily challenge was completed
      stats: { cards: 0, correct: 0, perfectQuizzes: 0, bossWins: 0, nightOwl: 0, hearts: 0 }
    };
  }

  var available = true;
  var state = defaults();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) state = merge(JSON.parse(raw));
    } catch (e) {
      available = false;
      console.warn("localStorage unavailable; progress will not be saved.", e);
    }
  }
  function merge(obj) {
    var d = defaults();
    if (!obj || typeof obj !== "object") return d;
    Object.keys(d).forEach(function (k) {
      if (obj[k] == null) return;
      d[k] = (typeof d[k] === "object" && !Array.isArray(d[k])) ? Object.assign(d[k], obj[k]) : obj[k];
    });
    d.version = 2;
    clean(d);
    return d;
  }
  /* Imported files are untrusted: keep numbers numeric and drop malformed entries. */
  function n(x) { x = +x; return isFinite(x) ? x : 0; }
  function clean(d) {
    var st = d.settings, dflt = defaults().settings;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(st.examDate)) st.examDate = dflt.examDate;
    if (!/^\d{2}:\d{2}$/.test(st.remindTime)) st.remindTime = dflt.remindTime;
    if (["both", "vi", "en"].indexOf(st.lang) < 0) st.lang = dflt.lang;
    if (["auto", "light", "dark"].indexOf(st.theme) < 0) st.theme = dflt.theme;
    if (["m", "l", "xl"].indexOf(st.textSize) < 0) st.textSize = dflt.textSize;
    st.dailyGoal = [20, 30, 50, 80].indexOf(+st.dailyGoal) >= 0 ? +st.dailyGoal : dflt.dailyGoal;
    st.audioRate = [0.75, 0.9, 1, 1.15].indexOf(+st.audioRate) >= 0 ? +st.audioRate : dflt.audioRate;
    st.noise = [0, 1, 2].indexOf(+st.noise) >= 0 ? +st.noise : 0;
    st.mockRate = [0, 1, 1.15, 1.3].indexOf(+st.mockRate) >= 0 ? +st.mockRate : 0; // 0 = same as "Voice speed"
    if (["quick", "std", "long"].indexOf(st.sessionMode) < 0) st.sessionMode = dflt.sessionMode;
    st.coreTarget = Math.max(1, Math.min(365, parseInt(st.coreTarget, 10) || dflt.coreTarget));
    d.reports = (Array.isArray(d.reports) ? d.reports : []).filter(function (r) { return r && typeof r === "object" && typeof r.text === "string"; }).slice(-100).map(function (r, i) {
      return { id: (String(r.id || Date.now()).replace(/[^0-9a-z]/gi, "").slice(0, 16) || String(Date.now())) + "x" + i, date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : today(),
        route: /^#\/[\w\/-]{0,78}$/.test(String(r.route || "")) ? String(r.route) : "#/", text: String(r.text).slice(0, 500), ctx: String(r.ctx || "").slice(0, 400) };
    });
    Object.keys(d.mocks).forEach(function (k) {
      var r = d.mocks[k]; if (!r || typeof r !== "object") { delete d.mocks[k]; return; }
      r.best = n(r.best); r.plays = n(r.plays); r.lastScore = n(r.lastScore);
      if (r.lastSections) ["listening", "reading", "writing"].forEach(function (s) { r.lastSections[s] = n(r.lastSections[s]); });
    });
    d.mockHistory = (Array.isArray(d.mockHistory) ? d.mockHistory : []).filter(function (h) { return h && typeof h === "object"; }).map(function (h) {
      var sec = h.sections || {};
      return { id: n(h.id), date: /^\d{4}-\d{2}-\d{2}$/.test(h.date) ? h.date : today(), mode: h.mode === "practice" ? "practice" : "exam", strict: !!h.strict, total: n(h.total),
        sections: { listening: n(sec.listening), reading: n(sec.reading), writing: n(sec.writing) } };
    });
    d.official = (Array.isArray(d.official) ? d.official : []).filter(function (o) { return o && typeof o === "object"; }).map(function (o) {
      var c = function (x) { x = n(x); return Math.max(0, Math.min(100, Math.round(x))); };
      return { id: String(o.id || Date.now()).replace(/[^0-9a-z]/gi, "").slice(0, 16) || String(Date.now()), date: /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : today(),
        name: String(o.name || "Official paper").slice(0, 60), l: c(o.l), r: c(o.r), w: c(o.w) };
    });
    Object.keys(d.grammar).forEach(function (k) { var g = d.grammar[k]; if (!/^g\d\d$/.test(k) || !g || typeof g !== "object") delete d.grammar[k]; else { g.best = n(g.best); g.passes = n(g.passes); g.mastered = !!g.mastered; } });
    var sts = d.stats; ["cards", "correct", "perfectQuizzes", "bossWins", "nightOwl", "hearts", "ladderRun", "ladderMiss"].forEach(function (k) { if (sts[k] != null) sts[k] = n(sts[k]); });
    if (sts.ladder != null) sts.ladder = Math.max(0, Math.min(3, Math.round(n(sts.ladder)))); // stays unset until the first drill picks a start speed
    if (!d.weekly || typeof d.weekly !== "object" || Array.isArray(d.weekly)) d.weekly = {};
    ["cur", "last"].forEach(function (k) {
      var x = d.weekly[k];
      if (!x || typeof x !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(x.start)) { delete d.weekly[k]; return; }
      if (k === "cur") { var sk = {}; Object.keys(x.skills || {}).forEach(function (s) { var v = x.skills[s]; if (v && typeof v === "object") sk[s] = { r: n(v.r), w: n(v.w) }; }); x.skills = sk; x.cards = n(x.cards); x.fc = x.fc == null ? null : n(x.fc); }
      else {
        ["xp", "active", "words", "cards", "mocks"].forEach(function (f) { x[f] = n(x[f]); });
        x.end = /^\d{4}-\d{2}-\d{2}$/.test(x.end) ? x.end : x.start; x.fc0 = x.fc0 == null ? null : n(x.fc0); x.fc1 = x.fc1 == null ? null : n(x.fc1);
        x.skills = (Array.isArray(x.skills) ? x.skills : []).filter(function (y) { return y && typeof y.k === "string"; }).map(function (y) { return { k: y.k, acc: Math.max(0, Math.min(1, +y.acc || 0)), n: n(y.n) }; });
      }
    });
    Object.keys(d.skills).forEach(function (k) { var v = d.skills[k]; if (!v || typeof v !== "object") delete d.skills[k]; else { v.r = n(v.r); v.w = n(v.w); } });
    d.custom = (Array.isArray(d.custom) ? d.custom : []).filter(function (w) {
      return w && typeof w.id === "string" && /^u[0-9a-z]+$/.test(w.id) && typeof w.hanzi === "string" && /[\u3400-\u9fff]/.test(w.hanzi);
    }).map(function (w) {
      var o = { id: w.id, hanzi: String(w.hanzi).slice(0, 12), pinyin: String(w.pinyin || "").slice(0, 60), vi: String(w.vi || "").slice(0, 120), en: String(w.en || "").slice(0, 120), pos: "", level: "Mine", added: w.added };
      if (w.example && typeof w.example.zh === "string") o.example = { zh: w.example.zh.slice(0, 60), py: String(w.example.py || "").slice(0, 160), vi: String(w.example.vi || "").slice(0, 200), en: String(w.example.en || "").slice(0, 200) };
      return o;
    });
    Object.keys(d.mistakes).forEach(function (k) { var v = d.mistakes[k]; if (!v || typeof v !== "object" || typeof v.skill !== "string") delete d.mistakes[k]; });
  }
  function save() {
    if (!available) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { available = false; console.warn("Could not save progress", e); }
  }

  /* Record study activity worth `xp`. Updates the XP log and the streak.
     Returns { newDay, freezeUsed, freezeEarned } so the UI can celebrate. */
  function touch(xp) {
    var t = today(), s = state.streak, info = { newDay: false, freezeUsed: 0, freezeEarned: false };
    xp = xp || 0;
    state.log[t] = (state.log[t] || 0) + xp;
    state.xp += xp;
    if (s.last !== t) {
      info.newDay = true;
      var gap = s.last ? daysBetween(s.last, t) : 0;
      if (s.last && gap === 1) s.count++;
      else if (s.last && gap > 1 && gap - 1 <= state.freezes) { state.freezes -= gap - 1; info.freezeUsed = gap - 1; s.count++; }
      else s.count = 1;
      s.last = t;
      s.best = Math.max(s.best || 0, s.count);
      if (s.count % 7 === 0 && state.freezes < 2) { state.freezes++; info.freezeEarned = true; }
      var h = new Date().getHours();
      if (h >= 22 || h < 4) state.stats.nightOwl++;
    }
    save();
    return info;
  }

  /* Current streak, counting a gap as alive if freezes can cover it. */
  function streak() {
    var s = state.streak, t = today();
    if (!s.last) return 0;
    var gap = daysBetween(s.last, t);
    return (gap <= 1 || gap - 1 <= state.freezes) ? s.count : 0;
  }

  function day(n) {
    if (!state.days[n]) state.days[n] = { quizBest: null, practice: {}, completed: false };
    return state.days[n];
  }
  function game(id) {
    if (!state.games[id]) state.games[id] = { best: 0, plays: 0 };
    return state.games[id];
  }

  function serialize(pretty) { return JSON.stringify({ app: "cb-chinese", exported: new Date().toISOString(), progress: state }, null, pretty ? 2 : 0); }
  function exportJSON() {
    var data = serialize(true);
    var blob = new Blob([data], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cb-chinese-progress-" + today() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importJSON(text) {
    var obj = JSON.parse(text);
    var p = obj && obj.progress ? obj.progress : obj;
    if (!p || typeof p !== "object" || !("srs" in p) || !("settings" in p)) throw new Error("This file is not a C&B Chinese progress export.");
    state = merge(p);
    save();
  }
  function reset() { var keep = state.settings; state = defaults(); state.settings = keep; save(); }

  window.Store = {
    get state() { return state; },
    load: load, save: save, touch: touch, streak: streak, day: day, game: game,
    today: today, addDays: addDays, daysBetween: daysBetween,
    exportJSON: exportJSON, importJSON: importJSON, serialize: serialize, reset: reset,
    get available() { return available; }
  };
  load();
  // Ask the browser not to evict our storage (important on iOS).
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
})();
