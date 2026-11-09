# data/hsk3 — HSK 3.0 track (planned)

Empty on purpose: see `docs/hsk3-plan.md`. Types: `types/hsk3.d.ts`. Check: `node tools/validate_hsk3.js`.

One word file per level, `words-l4.js` for example, listed in `manifest.js`:

```js
window.CB_HSK3_WORDS.push(
  { id: "h3-4-0001", hanzi: "安排", pinyin: "ānpái", level: 4, pos: "v.", vi: "sắp xếp", en: "to arrange",
    ref: "k012", src: { doc: "HSK 考试大纲 2025-11", page: 102 }, checked: false }
);
```

(The row above shows the shape only; it is not taken from the syllabus.)
