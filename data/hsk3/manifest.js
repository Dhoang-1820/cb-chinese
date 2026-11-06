/* HSK 3.0 track (planned, docs/hsk3-plan.md). Not loaded by the app yet; tools/validate_hsk3.js checks it.
   CB_HSK3_FILES stays empty until the official syllabus lists are imported. */
window.CB_HSK3_FILES = [];
window.CB_HSK3_WORDS = window.CB_HSK3_WORDS || [];
window.CB_HSK3_CHARS = window.CB_HSK3_CHARS || [];
window.CB_HSK3_GRAMMAR = window.CB_HSK3_GRAMMAR || [];
(function () {
  var notice = { doc: "CTI notice: HSK 3.0 pilot, 20 Sep 2026", url: "https://www.chinesetest.cn/notice" };
  var cli = { doc: "StudyCLI summary (secondary; check the official sample papers)", url: "https://studycli.org/hsk/the-new-hsk/" };
  function lv(level, wMin, wQ, sMin, words) {
    var f = { level: level, written: { minutes: wMin, questions: wQ, verified: false, src: cli }, cumulativeWords: { n: words, verified: false, src: cli } };
    f.written.minutesVerified = true; f.written.minutesSrc = notice;  // the times are in the official notice, the counts are not
    if (sMin) f.speaking = { minutes: sMin, verified: true, src: notice };
    return f;
  }
  window.CB_HSK3_FORMAT = [lv(1, 40, 40, 0, 300), lv(2, 60, 60, 0, 500), lv(3, 83, 70, 15, 1000), lv(4, 85, 70, 20, 2000), lv(5, 110, 72, 23, 3600), lv(6, 125, 82, 23, 5400)];
})();
