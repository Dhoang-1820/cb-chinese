/* Leitner spaced repetition: 5 boxes.
   Correct -> move up one box; wrong -> back to box 1 (due again today).
   Box intervals (days until next review): 1, 2, 4, 8, 16. */
(function () {
  "use strict";
  var INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

  function S() { return Store.state.srs; }

  function has(id) { return !!S()[id]; }

  function add(id) {
    if (!S()[id]) S()[id] = { box: 1, due: Store.today(), right: 0, wrong: 0, added: Store.today(), last: null };
    return S()[id];
  }

  function addMany(ids) { ids.forEach(add); Store.save(); }

  /* Smarter scheduling (still 5 boxes, so old progress keeps working):
     - Hard words (2+ lapses) get half the normal interval.
     - Personal stability: a word you get right almost every time (90%+, 4+ answers) waits 25% longer;
       one you often miss (under 60% right) waits 40% less.
     - A word reviewed later than planned and still answered right earns 20% more, since you remembered it for longer.
     - Exam cap: nothing is scheduled past two days before your exam, so every word gets one last look. */
  function interval(c) {
    var d = INTERVALS[c.box], n = (c.right || 0) + (c.wrong || 0), acc = n ? (c.right || 0) / n : 1;
    if ((c.lapses || 0) >= 2) d = d / 2;
    if (n >= 4 && acc >= 0.9) d *= 1.25;
    else if (n >= 4 && acc < 0.6) d *= 0.6;
    if (c.late) d *= 1.2;
    d = Math.max(1, Math.round(d));
    var ex = Store.state.settings && Store.state.settings.examDate;
    if (ex) {
      var left = Store.daysBetween(Store.today(), ex) - 2;
      if (left >= 1) d = Math.min(d, left);
    }
    return d;
  }
  function grade(id, correct) {
    var c = add(id);
    c.late = !!(c.due && c.due < Store.today() && Store.daysBetween(c.due, Store.today()) >= 2);
    if (correct) { c.box = Math.min(5, c.box + 1); c.right++; c.due = Store.addDays(Store.today(), interval(c)); }
    else { c.box = c.box >= 4 ? 2 : 1; c.wrong++; c.lapses = (c.lapses || 0) + 1; c.due = Store.today(); }
    c.last = Store.today();
    Store.save();
  }
  /* A mistake outside flashcards (games, quizzes): bring the word back today, keep its box. */
  function lapse(id) {
    var c = S()[id]; if (!c) return;
    c.lapses = (c.lapses || 0) + 1; c.due = Store.today();
    Store.save();
  }
  function hard(id) { var c = S()[id]; return !!c && (c.lapses || 0) >= 2; }

  function dueIds(validIds) {
    var t = Store.today(), out = [];
    Object.keys(S()).forEach(function (id) {
      if (validIds && !validIds[id]) return;
      if (S()[id].due <= t) out.push(id);
    });
    return out;
  }

  function nextDue() {
    var t = Store.today(), min = null;
    Object.keys(S()).forEach(function (id) {
      var d = S()[id].due;
      if (d > t && (!min || d < min)) min = d;
    });
    return min;
  }

  function boxCounts() {
    var c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    Object.keys(S()).forEach(function (id) { c[S()[id].box]++; });
    return c;
  }

  window.SRS = { INTERVALS: INTERVALS, has: has, add: add, addMany: addMany, grade: grade, lapse: lapse, hard: hard, interval: interval, dueIds: dueIds, nextDue: nextDue, boxCounts: boxCounts, get: function (id) { return S()[id]; } };
})();
