#!/usr/bin/env node
/* Content audit, step 1: flattens every question and word in the audit scope into plain JSON.
   Usage: node tools/audit/dump.js OUT_DIR
   Writes:
     OUT_DIR/items.json   every question with its answer key (key normalised to text where possible)
     OUT_DIR/blind.json   the same questions WITHOUT keys or explanations (what a solver agent sees)
     OUT_DIR/words.json   every word entry (hanzi, pinyin, vi, en, example) for pinyin and translation checks
     OUT_DIR/lines.json   dialogue / passage / model-text lines (zh, py, vi, en) for translation checks
   Scope (content marked checked:false or written after the teacher-checked core): HSK 4 grammar and drills,
   the two extra games (Word Bank, Arrange the Words), days 61-90, mocks 5-8, the 24-week track, HSK 5 words,
   grammar and drills, and the extra HSK 4 packs (data/hsk4x). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), DATA = path.join(ROOT, "data");
const OUT = process.argv[2]; if (!OUT) { console.error("usage: dump.js OUT_DIR"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sb = { window: {} }; vm.createContext(sb);
const run = f => vm.runInContext(fs.readFileSync(f, "utf8"), sb, { filename: f });
const js = dir => fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort().map(f => path.join(dir, f));
js(DATA).forEach(run); js(path.join(DATA, "hsk5")).forEach(run); js(path.join(DATA, "hsk4x")).forEach(run);
const W = sb.window;

const items = [], words = [], lines = [];
const txt = o => o == null ? "" : typeof o === "string" ? o : (o.zh || [o.vi, o.en].filter(Boolean).join(" / "));
const optText = o => typeof o === "string" ? o : [o.vi, o.en].filter(Boolean).join(" / ");
/* add a multiple-choice item; key is an index */
function mc(id, file, kind, prompt, options, keyIdx, extra) {
  items.push(Object.assign({ id, file, kind, format: "choice", prompt, options: options.map(optText), key: keyIdx,
    keyText: optText(options[keyIdx]) }, extra || {}));
}
function line(id, file, l) { if (l && l.zh) lines.push({ id, file, zh: l.zh, py: l.py || "", vi: l.vi || "", en: l.en || "", speaker: l.speaker }); }
function word(id, file, w, src) {
  words.push({ id, file, src, hanzi: w.hanzi, pinyin: w.pinyin, pos: w.pos || "", vi: w.vi || "", en: w.en || "",
    example: w.example || w.ex || null, collocations: w.collocations || null });
}

/* HSK 4 grammar */
(W.CB_GRAMMAR || []).forEach(g => {
  g.quiz.forEach((q, i) => mc(`grammar:${g.id}:${i}`, "data/grammar.js", "grammar4", q.q, q.options, q.answer,
    { context: `${g.title.zh} — ${g.pattern}`, explain: q.explain && q.explain.en }));
  g.examples.forEach((e, i) => line(`grammar:${g.id}:ex${i}`, "data/grammar.js", e));
});
/* HSK 4 drills and the HSK 5 drills share a shape */
function drills(D, file, tag) {
  (D.confuse || []).forEach(c => mc(`${tag}:confuse:${c.id}`, file, tag + "-confuse", c.q, c.words, c.words.indexOf(c.answer),
    { explain: c.explain && c.explain.en }));
  (D.order || []).forEach(o => items.push({ id: `${tag}:order:${o.id}`, file, kind: tag + "-order", format: "abc",
    parts: o.parts, key: o.answer, en: o.en, vi: o.vi }));
  (D.measure || []).forEach(m => mc(`${tag}:measure:${m.id}`, file, tag + "-measure", m.q, m.options, m.answer,
    { explain: m.explain && m.explain.en }));
  (D.picture || []).forEach(p => items.push({ id: `${tag}:picture:${p.id}`, file, kind: tag + "-picture", format: "sample",
    word: p.word, scene: p.scene && p.scene.en, samples: (p.samples || []).map(s => typeof s === "string" ? { zh: s } : s) }));
}
drills(W.CB_DRILLS || {}, "data/drills.js", "drills4");
drills(W.CB_HSK5_DRILLS || {}, "data/hsk5/drills.js", "drills5");
/* extra games */
const X = W.CB_DRILLS_EXTRA || {};
(X.bank || []).forEach(b => b.items.forEach(it => mc(`bank:${b.id}:${it.n}`, "data/drills_extra.js", "bank", it.q, b.bank, it.answer,
  { en: it.en, note: "Word Bank: each of the six words is used at most once across the group's five gaps" })));
(X.wordorder || []).forEach(w => items.push({ id: `wordorder:${w.id}`, file: "data/drills_extra.js", kind: "wordorder", format: "tokens",
  tokens: w.tokens, key: w.answer, alt: w.alt || [], en: w.en }));
/* HSK 5 grammar */
(W.CB_HSK5_GRAMMAR || []).forEach(g => {
  g.quiz.forEach((q, i) => mc(`grammar5:${g.id}:${i}`, "data/hsk5/grammar.js", "grammar5", q.q, q.options, q.answer,
    { context: `${g.title.zh} — ${g.pattern}`, explain: q.explain && q.explain.en }));
  g.examples.forEach((e, i) => line(`grammar5:${g.id}:ex${i}`, "data/hsk5/grammar.js", e));
});
/* days 61-90 */
(W.CB_DAYS || []).filter(d => d.day >= 61).forEach(d => {
  const f = `data/day${String(d.day).padStart(2, "0")}.js`, t = `day${d.day}`;
  (d.words || []).forEach(w => word(w.id, f, w, t));
  ((d.reading && d.reading.lines) || []).forEach((l, i) => line(`${t}:reading:${i}`, f, l));
  ((d.grammar && d.grammar.examples) || []).forEach((l, i) => line(`${t}:grammar:${i}`, f, l));
  ((d.exercises && d.exercises.fill) || []).forEach((x, i) => items.push({ id: `${t}:fill:${i}`, file: f, kind: "dayfill", format: "gap",
    prompt: x.zh, key: x.answer, en: x.en, bank: (d.words || []).map(w => w.hanzi) }));
  ((d.exercises && d.exercises.translate) || []).forEach((x, i) => line(`${t}:translate:${i}`, f, x));
  (d.quiz || []).forEach((q, i) => mc(`${t}:quiz:${i}`, f, "dayquiz", q.q, q.options, q.answer));
});
/* mocks 5-8 */
(W.CB_MOCK || []).filter(m => m.id >= 5).forEach(m => {
  const f = `data/mock${m.id}.js`, t = `mock${m.id}`;
  const say = x => x.audio ? x.audio.text : (x.dialogue || []).map(d => (d.voice === "F" ? "女：" : "男：") + d.text).join("\n");
  ["p1", "p2", "p3"].forEach(p => (m.listening[p] || []).forEach(q => {
    if (typeof q.answer === "boolean") items.push({ id: `${t}:${q.id}`, file: f, kind: "mock-listen-tf", format: "tf",
      prompt: say(q), statement: q.statement, key: q.answer });
    else if (q.questions) q.questions.forEach(s => mc(`${t}:${s.id}`, f, "mock-listen", say(q) + "\n问：" + s.q, s.options, s.answer));
    else mc(`${t}:${q.id}`, f, "mock-listen", say(q) + "\n问：" + q.question, q.options, q.answer);
  }));
  ["p1", "p2", "p3"].forEach(p => (m.reading[p] || []).forEach(q => {
    if (q.parts) items.push({ id: `${t}:${q.id}`, file: f, kind: "mock-order", format: "abc", parts: q.parts, key: q.answer });
    else if (q.questions) q.questions.forEach(s => mc(`${t}:${s.id}`, f, "mock-read", q.passage + "\n问：" + s.q, s.options, s.answer));
    else if (q.sentence) mc(`${t}:${q.id}`, f, "mock-gap", q.sentence, q.options, q.answer);
    else if (q.q) mc(`${t}:${q.id}`, f, "mock-read", (q.passage ? q.passage + "\n问：" : "") + q.q, q.options, q.answer);
  }));
  (m.writing.p1 || []).forEach(q => items.push({ id: `${t}:${q.id}`, file: f, kind: "mock-tokens", format: "tokens", tokens: q.tokens, key: q.answer, alt: q.alt || [] }));
  (m.writing.p2 || []).forEach(q => items.push({ id: `${t}:${q.id}`, file: f, kind: "mock-picture", format: "sample", word: q.word, samples: [{ zh: q.sample }] }));
});
/* 24-week track */
(W.CB_TRACK || []).forEach(w => {
  const f = w.week <= 6 ? "data/track_w01-06.js" : w.week <= 12 ? "data/track_w07-12.js" : w.week <= 18 ? "data/track_w13-18.js" : "data/track_w19-24.js";
  w.sessions.forEach((s, si) => {
    const t = `track:w${w.week}:s${si + 1}`;
    (s.text || []).forEach((l, i) => line(`${t}:text:${i}`, f, l));
    (s.sample || []).forEach((l, i) => line(`${t}:sample:${i}`, f, l));
    (s.lines || []).forEach((l, i) => line(`${t}:line:${i}`, f, l));
    (s.phrases || []).forEach((l, i) => line(`${t}:phrase:${i}`, f, l));
    (s.items || []).forEach((x, i) => {
      if (x.options) mc(`${t}:item:${i}`, f, "track-fill", x.zh, x.options, x.options.indexOf(x.answer), { en: x.en });
      else if (x.zh) line(`${t}:item:${i}`, f, x);
    });
    (s.turns || []).forEach((tn, i) => {
      line(`${t}:turn:${i}`, f, tn.other);
      (tn.choices || []).forEach((c, ci) => line(`${t}:turn:${i}:c${ci}`, f, c.t));
      const good = (tn.choices || []).map((c, ci) => c.good || c.ok || c.best ? ci : -1).filter(x => x >= 0);
      if (tn.choices && tn.choices.length) items.push({ id: `${t}:turn:${i}`, file: f, kind: "track-turn", format: "best-reply",
        prompt: tn.other && tn.other.zh, context: s.scenario && s.scenario.en, options: tn.choices.map(c => c.t && c.t.zh),
        key: good, raw: tn.choices.map(c => Object.keys(c).filter(k => k !== "t").reduce((o, k) => (o[k] = c[k], o), {})) });
    });
    (s.words || []).forEach((x, i) => word(`${t}:word:${i}`, f, x, "track"));
    (s.cards || []).forEach((c, i) => lines.push({ id: `${t}:card:${i}`, file: f, card: c }));
    (s.questions || []).forEach((q, i) => mc(`${t}:q:${i}`, f, "track-read",
      (s.lines || []).map(l => l.zh).join("") + "\n问：" + (q.q && (q.q.zh || q.q)), q.options, q.answer));
  });
});
/* HSK 5 words and the extra HSK 4 packs */
(W.CB_HSK5 || []).forEach(p => p.words.forEach(w => word(w.id, `data/hsk5/words${String(p.pack).padStart(2, "0")}.js`, w, "hsk5")));
(W.CB_HSK4X || []).forEach(p => (p.items || p.words || []).forEach((x, i) => {
  const f = "data/hsk4x/" + ((W.CB_HSK4X_FILES || [])[W.CB_HSK4X.indexOf(p)] || `pack${p.pack}`);
  if (x.pinyin && x.hanzi && (x.vi || x.example)) word(x.id || `${p.kind}${p.pack}:${i}`, f, x, "hsk4x-" + p.kind);
  else lines.push({ id: `hsk4x:${p.kind}:${p.pack}:${i}`, file: f, extra: x });
}));

const blind = items.map(x => { const o = Object.assign({}, x); ["key", "keyText", "explain", "alt", "raw"].forEach(k => delete o[k]); return o; });
fs.writeFileSync(path.join(OUT, "items.json"), JSON.stringify(items, null, 1));
fs.writeFileSync(path.join(OUT, "blind.json"), JSON.stringify(blind, null, 1));
fs.writeFileSync(path.join(OUT, "words.json"), JSON.stringify(words, null, 1));
fs.writeFileSync(path.join(OUT, "lines.json"), JSON.stringify(lines, null, 1));
const count = {}; items.forEach(x => count[x.kind] = (count[x.kind] || 0) + 1);
console.log(`items ${items.length}`, JSON.stringify(count));
console.log(`words ${words.length}, lines ${lines.length}`);
