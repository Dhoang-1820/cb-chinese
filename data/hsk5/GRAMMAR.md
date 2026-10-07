# Grammar checklists: HSK 4 (expanded) and HSK 5 (new)

| Level | File | Global | Ids | Points | Questions |
|---|---|---|---|---|---|
| HSK 4 | `data/grammar.js` | `window.CB_GRAMMAR` | `g01`..`g70` | 70 (25 old + 45 new) | 350 |
| HSK 5 | `data/hsk5/grammar.js` | `window.CB_HSK5_GRAMMAR` | `h5g01`..`h5g42` | 42 | 210 |

`data/hsk5/grammar.js` also sets `window.CB_HSK5_GRAMMAR_META = { level: 5, checked: false }`.
Check everything with `node tools/validate_grammar.js` (exit code 1 on any error).

## Schema (identical for both levels)

```js
{
  "id": "g26",                                  // HSK 4: /^g\d\d$/   HSK 5: /^h5g\d\d$/
  "title":   { "zh": "…", "vi": "…", "en": "…" },
  "pattern": "不是 + A，而是 + B",                // formula; alternatives are separated by " | "
  "explain": { "vi": "…", "en": "…" },          // when to use it + one mistake Vietnamese learners make
  "examples": [                                 // exactly 2
    { "zh": "…", "py": "…", "vi": "…", "en": "…" }
  ],
  "quiz": [                                     // exactly 5
    { "q": "…____…", "options": ["…","…","…","…"], "answer": 1,   // 0-based index into options
      "explain": { "vi": "…", "en": "…" } }
  ]
}
```

- A question is either a fill-in with one `____` blank, a "下面哪个句子是正确的？" pick-the-sentence
  question, or a short meaning question ending in `：` / `？`.
- No extra keys per point (the validator rejects them); the `checked` flag lives in `CB_HSK5_GRAMMAR_META`.
- Pinyin follows the existing style: tone marks, tone sandhi written for 不 / 一 (`bú shì`, `yí ge`, `yì zhāng`),
  neutral tones unmarked (`gàosu`, `qǐlai`), particles written separately (`le`, `de`, `zhe`, `guo`).
- Examples are 8-22 Chinese characters. HSK 4 points aim at HSK 1-4 vocabulary, HSK 5 points at HSK 1-5.

## Id scheme

- HSK 4 keeps `g01`..`g99`. The 25 original points are untouched (the only change to their lines is the comma
  after `g25`); new points are appended as `g26`..`g70`. 29 ids remain free.
- HSK 5 uses `h5g01`..`h5g42` so it can never collide with HSK 4 progress keys.
- Ids must stay consecutive and in file order (validator rule); append, never renumber, because ids are
  progress keys in `Store.state.grammar` and part of content refs `grammar:<id>` and `gq:<id>:<n>`.

## What the integrator had to change (done; kept for reference)

All seven points below are wired in: ids matching `/^(g|h5g)\d\d$/` are kept, HSK 5 grammar loads with the HSK 5 pack
(`data/hsk5.<hash>.js`), the screens take a level (`#/grammar/h5`), `js/content.js` indexes both lists, and the HSK 4 list
has a filter.

1. **`js/storage.js` line ~105**: the migration deletes every `grammar` key that fails `/^g\d\d$/`, so HSK 5
   progress would be wiped on load. Extend it to `/^(g|h5g)\d\d$/` (or keep HSK 5 progress in its own map).
2. **Loading**: `data/hsk5/grammar.js` is not referenced anywhere yet. Add it to `index.html` (or the lazy
   loader that pulls `data/grammar.js`) and to the precache list in `sw.js` (`MOCKS` contains
   `"data/grammar.js"`), and bump the cache version.
3. **`js/app.js`**: every grammar screen reads `window.CB_GRAMMAR` directly (lines ~2530, 2579, 3451-3497:
   `GRAMMAP()`, the list, the detail page, prev/next, "next step" suggestions). Either concatenate the HSK 5
   array when the HSK 5 track is active, or add a level switch. Routes `#/grammar/<id>` take any id.
4. **`js/content.js`**: the index (lines ~19, 42-44) only walks `CB_GRAMMAR`; add `CB_HSK5_GRAMMAR` so
   reports and the mistake notebook can resolve `grammar:h5g..` and `gq:h5g..:n`. The ref regex
   `[^:]+` already accepts the new ids.
5. **Counts in text**: `README.md` line 39 says "25 grammar points"; it is now 70 (HSK 4) + 42 (HSK 5).
   No count is hard-coded in `tools/validate.js` (it prints `Grammar points: 70 (350 questions)` and passes).
   The HSK 4 list is now long (70 rows): the grammar list screen may want grouping or a filter.
6. **Mastery / dashboard**: anything that shows "x / N grammar points mastered" now has N = 70; users who
   had mastered all 25 are no longer at 100 %.
7. Optionally wire `node tools/validate_grammar.js` into the same place `tools/validate.js` runs.

## What was NOT human-checked

Everything new was written and self-reviewed by an AI model in one session; no teacher or native speaker has
read it. Treat as `checked: false`:

- **HSK 5 (`h5g01`..`h5g42`)**: all 42 points, 84 examples, 210 questions.
- **HSK 4 new (`g26`..`g70`)**: all 45 points, 90 examples, 225 questions. `data/grammar.js` has no flag
  for this (the shape has no room and the old 25 points were not to be touched); this note is the record.

What was checked mechanically: shape, ids, counts, answer index range, option uniqueness, pinyin character
set, tone marks, digits, example length (`tools/validate_grammar.js`); every example's pinyin was compared
syllable by syllable with pypinyin and the differences (tone sandhi, neutral tones, polyphones such as
长 cháng, 为 wéi, 地 de, 着 zháo in 用不着, 假 jià, 似的 shìde) were reviewed by hand; every question was
re-read against its keyed answer after generation.

Known soft spots for a reviewer:

- **Vocabulary level**: checked only roughly (character-level against the app's HSK 1-4 lists). A few HSK 4
  points teach words that the HSK 2.0 list places at level 5 because the brief asked for them:
  曾经 (g50), 朝 (g37). Meta-language in questions (主语, 动词, 宾语, 形容词, 重叠) is above level.
- **Near-synonym questions** rely on the textbook distinction and deliberately leave the other synonym out
  of the options where both would be acceptable (根据/按照, 通过/经过, 本来/原来, 陆续/纷纷, 依然/仍然…).
  Items most worth a native check: g64 q1 (以为 vs 认为), g24-style word-order items where the wrong
  options put an adverb before the subject (h5g24 q2 固然, g54 q1 却), g44 (差点儿 / 差点儿没).
- **Vietnamese** explanations and translations were not reviewed by a native speaker.
- Answer positions are roughly balanced but not shuffled (new items: A 103 / B 122 / C 104 / D 106).
