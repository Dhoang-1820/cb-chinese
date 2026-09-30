/* Learning tracker: mistake notebook + per-skill accuracy.
   Every graded answer calls Learn.record(key, meta, ok).
   - A wrong answer puts the item in the notebook.
   - An item leaves the notebook after 2 correct answers in a row.
   - Skill stats (right/wrong) feed the weak-area report. */
(function () {
  "use strict";
  var CLEAR_AFTER = 2;

  /* Skills, grouped by HSK 4 section. */
  var SKILLS = {
    "vocab":        { sec: "Vocabulary", icon: "📘", en: "Word meaning", vi: "Nghĩa của từ", tip: "Review the day's word list and flashcards." },
    "pinyin":       { sec: "Vocabulary", icon: "🔤", en: "Pinyin & tones", vi: "Pinyin & thanh điệu", tip: "Say each word aloud with its tone; try Pinyin Race." },
    "listen-word":  { sec: "Listening", icon: "👂", en: "Hearing words", vi: "Nghe từ", tip: "Play Listen & Pick; listen before looking at the hanzi." },
    "listen-tf":    { sec: "Listening", icon: "✔️", en: "True/false listening", vi: "Nghe đúng/sai", tip: "Watch for negatives (不, 没) and contrast words (但是, 虽然)." },
    "listen-short": { sec: "Listening", icon: "💬", en: "Short dialogues", vi: "Hội thoại ngắn", tip: "The answer is usually in the second speaker's line." },
    "listen-long":  { sec: "Listening", icon: "🎙️", en: "Longer passages", vi: "Đoạn nghe dài", tip: "Read the question first, then listen for the key phrase." },
    "listen-sentence": { sec: "Listening", icon: "🎧", en: "Sentence listening", vi: "Nghe câu", tip: "Use Listening Drill at 0.75×, then at normal speed." },
    "quiz":         { sec: "Reading", icon: "❓", en: "Lesson quiz", vi: "Quiz bài học", tip: "Re-read the lesson's dialogue and grammar notes." },
    "fill-word":    { sec: "Reading", icon: "🧩", en: "Choosing the right word", vi: "Chọn từ điền", tip: "Check which word fits both meaning and grammar (adverb vs adjective)." },
    "connectors":   { sec: "Grammar", icon: "🔗", en: "Connectors (虽然…但是…)", vi: "Liên từ (虽然…但是…)", tip: "Learn them as pairs: 虽然…但是, 只要…就, 只有…才, 不管…都, 除非…否则." },
    "passage":      { sec: "Reading", icon: "📖", en: "Reading passages", vi: "Đọc hiểu đoạn văn", tip: "Find the sentence the question points to; watch 因为/所以 clues." },
    "word-order":   { sec: "Grammar", icon: "🧱", en: "Word order", vi: "Trật tự từ", tip: "Pattern: Subject + time + place + verb + object. Try Sentence Builder." },
    "writing":      { sec: "Writing", icon: "✍️", en: "Writing sentences", vi: "Viết câu", tip: "Write short, correct sentences: Subject + 很/已经/要 + verb + object." },
    "ordering":     { sec: "Reading", icon: "🔀", en: "Sentence ordering (ABC)", vi: "Sắp xếp câu (ABC)", tip: "Find the opening sentence (no 他/这/但是 at the start), then follow connectors and pronouns." },
    "confusable":   { sec: "Vocabulary", icon: "⚖️", en: "Confusable words", vi: "Từ dễ nhầm", tip: "Learn the rule that separates each pair (e.g. 以为 = wrongly thought, 认为 = think/consider)." },
    "measure":      { sec: "Vocabulary", icon: "📏", en: "Measure words & collocations", vi: "Lượng từ & kết hợp từ", tip: "Learn nouns with their measure word and verb: 一份合同, 办手续, 提出意见." },
    "grammar":      { sec: "Grammar", icon: "📐", en: "Grammar patterns", vi: "Mẫu ngữ pháp", tip: "Open the grammar checklist, re-read the pattern, then redo its 5 questions." },
    "typing":       { sec: "Writing", icon: "⌨️", en: "Typing sentences (computer test)", vi: "Gõ câu (thi trên máy)", tip: "Type the whole sentence, then compare character by character; watch 的/得/地 and word order." },
    "handwriting":  { sec: "Writing", icon: "🖌️", en: "Handwriting (stroke order)", vi: "Viết tay (thứ tự nét)", tip: "Watch the stroke animation once, then trace without the outline." }
  };

  function S() {
    var s = Store.state;
    if (!s.mistakes) s.mistakes = {};
    if (!s.skills) s.skills = {};
    return s;
  }

  /* key: unique id of the item (e.g. "w:w0101", "q:3:2", "m:1:L2-3", "ls:<text>")
     meta: { kind, skill, ...refs } — enough to re-render the question later. */
  function record(key, meta, ok) {
    var s = S(), m = s.mistakes[key], sk = meta && meta.skill;
    if (sk) {
      var st = s.skills[sk] || (s.skills[sk] = { r: 0, w: 0 });
      if (ok) st.r++; else st.w++;
    }
    if (meta && meta.statsOnly) { Store.save(); return false; }
    if (!ok) {
      if (!m) m = s.mistakes[key] = Object.assign({ added: Store.today(), wrong: 0 }, meta);
      m.wrong++; m.streak = 0; m.last = Store.today();
    } else if (m) {
      m.streak = (m.streak || 0) + 1; m.last = Store.today();
      if (m.streak >= CLEAR_AFTER) delete s.mistakes[key];
    }
    Store.save();
    return !!s.mistakes[key];
  }

  function list(skill) {
    var s = S();
    return Object.keys(s.mistakes).filter(function (k) { return !skill || s.mistakes[k].skill === skill; })
      .map(function (k) { return Object.assign({ key: k }, s.mistakes[k]); });
  }
  function count(skill) { return list(skill).length; }

  /* Accuracy per skill, weakest first. Only skills with at least `min` answers. */
  function report(min) {
    var s = S(), out = [];
    Object.keys(s.skills).forEach(function (k) {
      var st = s.skills[k], n = st.r + st.w;
      if (!SKILLS[k] || n < (min || 1)) return;
      out.push({ skill: k, n: n, acc: st.r / n, info: SKILLS[k], open: count(k) });
    });
    return out.sort(function (a, b) { return a.acc - b.acc; });
  }

  window.Learn = { SKILLS: SKILLS, CLEAR_AFTER: CLEAR_AFTER, record: record, list: list, count: count, report: report };
})();
