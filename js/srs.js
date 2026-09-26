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

  /* Smarter scheduling:
     - Hard words (2+ lapses) get half the normal interval, so they come back sooner.
     - A slip on a well-known word (box 4–5) drops it to box 2, not all the way to box 1. */
  function interval(c) {
    var d = INTERVALS[c.box];
    if ((c.lapses || 0) >= 2) d = Math.max(1, Math.round(d / 2));
    return d;
  }
  function grade(id, correct) {
    var c = add(id);
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
