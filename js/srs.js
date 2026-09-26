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

  function grade(id, correct) {
    var c = add(id);
    if (correct) { c.box = Math.min(5, c.box + 1); c.right++; c.due = Store.addDays(Store.today(), INTERVALS[c.box]); }
    else { c.box = 1; c.wrong++; c.due = Store.today(); }
    c.last = Store.today();
    Store.save();
  }

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

  window.SRS = { INTERVALS: INTERVALS, has: has, add: add, addMany: addMany, grade: grade, dueIds: dueIds, nextDue: nextDue, boxCounts: boxCounts, get: function (id) { return S()[id]; } };
})();
