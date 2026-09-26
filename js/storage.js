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
      settings: { showPinyin: true, lang: "both", theme: "auto", audioRate: 1, sfx: true, examDate: "2026-11-14", dailyGoal: 30, installHintDismissed: false },
      srs: {},        // wordId -> { box, due, right, wrong, added, last }
      days: {},       // dayNo -> { quizBest, practice: {}, completed }
      streak: { count: 0, last: null, best: 0 },
      log: {},        // date -> XP earned that day
      xp: 0,
      freezes: 0,     // streak freezes in stock (max 2)
      badges: {},     // badgeId -> date earned
      games: {},      // gameId -> { best, plays }
      challenges: {}, // date -> true when the daily challenge was completed
      stats: { cards: 0, correct: 0, perfectQuizzes: 0, bossWins: 0, nightOwl: 0 }
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
    return d;
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

  function exportJSON() {
    var data = JSON.stringify({ app: "cb-chinese", exported: new Date().toISOString(), progress: state }, null, 2);
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
    exportJSON: exportJSON, importJSON: importJSON, reset: reset,
    get available() { return available; }
  };
  load();
  // Ask the browser not to evict our storage (important on iOS).
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
})();
