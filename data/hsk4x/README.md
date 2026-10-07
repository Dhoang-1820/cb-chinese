# data/hsk4x - HSK 1-4 coverage audit, gap words and extra HSK 4 word resources

Everything here is additive: no existing file was changed and nothing is loaded by the app yet.
All Chinese phrases and sentences, and all Vietnamese / English glosses written for this folder, are original.

| File | What it is |
|---|---|
| `hsk2-ref.json` | Snapshot of the reference HSK 2.0 level 1-4 word list (hanzi only, by level) |
| `audit.json` | Output of `node tools/audit_hsk4.js` |
| `manifest.js` | `window.CB_HSK4X_FILES` - the data files to load |
| `missing01.js` ... `missing05.js` | kind `missing`: 91 reference words that no lesson or deck teaches |
| `extra_collocations01.js` ... `04.js` | kind `collocations`: 163 HSK 4 words x 3 phrases |
| `extra_families.js` | kind `families`: 61 word families by shared character |
| `extra_opposites.js` | kind `opposites`: 65 antonym pairs, 130 example sentences |

Tools: `node tools/audit_hsk4.js` (report + `audit.json`), `node tools/validate_hsk4x.js` (exit 1 on any error).

## Reference word list

- Source: https://github.com/drkameleon/complete-hsk-vocabulary
- File used: `wordlists/exclusive/old/1.json` ... `4.json` ("old" = HSK 2.0), field `simplified` only
- Commit: `7ac65bf1a6387d35f1ade478906172a19311c7f9`
- Licence: MIT (Copyright (c) Yanis Zafirópulos). Only the list of headwords is taken; no meanings, pinyin or examples were copied.
- Size: 150 + 147 + 298 + 598 = 1,193 unique words (the nominal figure is 1,200).

Note on list versions: this list is the earlier HSK 2.0 edition. The app's HSK 4 Core and Foundation decks follow the 2012
revision, which renamed or replaced some entries (for example 没 -> 没有, 踢 -> 踢足球, 刮 -> 刮风, 电子 -> 电子邮件, 分之 -> 百分之,
弹 -> 弹钢琴) and dropped words such as 包括, 代表, 市场, 组织. That is why 91 reference words are "missing" while 84 deck
words are "not on the reference list". Both sets are legitimate HSK 2.0 vocabulary; the gap packs make the app cover both editions.

## Audit result

| Level | Reference words | In lessons (day01-90) | Only in decks (core / foundation) | Added by gap packs | Still missing |
|---|---|---|---|---|---|
| HSK 1 | 150 | 0 | 148 | 2 | 0 |
| HSK 2 | 147 | 0 | 141 | 6 | 0 |
| HSK 3 | 298 | 0 | 283 | 15 | 0 |
| HSK 4 | 598 | 93 | 437 | 68 | 0 |
| Total | 1,193 | 93 | 1,009 | 91 | 0 |

- The 90 lessons teach 720 words: 93 are on the reference list, 627 are not (623 tagged "Beyond HSK4" workplace vocabulary,
  and 4 tagged "HSK4": 错误, 应聘, 左右, 稳定). The full list is in `audit.json` (`lessonWordsNotOfficial`).
- Scope decision: a gap word is a reference word taught by neither the lessons nor the decks. Reference words missing from the
  lessons but already taught by a deck card (1,009) were not duplicated; they are listed in `audit.json` (`missingFromLessons`).

## Loading

Every data file appends one pack to a new global and touches nothing else:

```js
(window.CB_HSK4X = window.CB_HSK4X || []).push({ pack, kind, checked, title: { en, vi }, words | items });
```

Load `data/hsk4x/manifest.js`, then each file in `CB_HSK4X_FILES`. Group packs by `kind`. `checked` is `false` on every pack:
the pinyin was machine-assisted (pypinyin + tone sandhi rules) and reviewed by the author, not yet by a teacher.
Remember to add the files to the service-worker cache list when wiring them in.

Common conventions: `zh` simplified Chinese, `py` pinyin with tone marks in the lesson style (word-spaced, sandhi written for
一 / 不, neutral tones unmarked), `vi` Vietnamese, `en` English. `ref` is the id of an existing card for the same hanzi and
`src` says where that id lives: `"lesson"` (`d01-01`, in `CB_DAYS`), `"core"` (`k001`, HSK 4 Core in `CB_CORE`),
`"foundation"` (`f001`, HSK 1-3 Foundation in `CB_CORE` sets 101-130) or `"hsk4x"` (`x4-0001`, a gap word in this folder).

### kind "missing" (`words`)

Exactly the lesson word shape, so the existing word card can render it:

```js
{ id: "x4-0025", hanzi: "包括", pinyin: "bāokuò", pos: "v.", level: "HSK4",   // level: "HSK1".."HSK4"
  vi: "bao gồm", en: "to include",
  collocations: [ { zh, py, vi, en } ],                                       // 1 per word
  example: { zh, py, vi, en },                                                // contains the word
  neutral: true }                                                             // only when a syllable is neutral tone
```

Ids `x4-0001` ... `x4-0091`, packs of 20 (the last pack has 11). Note that `level` uses `HSK1`..`HSK4` like the Foundation deck,
whereas lesson words only use `HSK4` / `Beyond HSK4`.

### kind "collocations" (`items`)

```js
{ id: "x4c-001", ref: "d01-01", src: "lesson", hanzi: "工资", pinyin: "gōngzī",
  phrases: [ { zh, py, vi, en }, { ... }, { ... } ] }                         // always 3, each contains the word
```

Show the phrases on the card whose id is `ref`. 92 items point at lesson words (`src: "lesson"`, every lesson word tagged HSK4
except 其中, 任何, 左右, 另外, 至少) and 71 at HSK 4 Core cards (`src: "core"`), because the lessons contain fewer than 150
HSK 4 words. Lesson words already have 1-2 `collocations` of their own; a few phrases may overlap, so de-duplicate on `zh`
if you merge the two lists.

### kind "families" (`items`)

```js
{ id: "x4f-01", char: "经", pinyin: "jīng",
  note: { en: "to pass through; regular, constant", vi: "trải qua; thường xuyên" },
  words: [ { hanzi: "经常", pinyin: "jīngcháng", vi, en, level: "HSK3", ref: "f509", src: "foundation" }, ... ] }
```

All members are HSK 1-4 words (2-10 per family). Member `pinyin` / `vi` / `en` are copied from the card named by `ref`, so
they always agree with what the learner sees elsewhere. Where a member is read differently from `pinyin` of the family
(重新 chóngxīn, 便宜 piányi, 应该 yīnggāi), the note says so.

### kind "opposites" (`items`)

```js
{ id: "x4o-01",
  a: { hanzi: "大", pinyin: "dà", vi, en, level: "HSK1", ref: "f0xx", src: "foundation", example: { zh, py, vi, en } },
  b: { hanzi: "小", pinyin: "xiǎo", vi, en, level: "HSK1", ref: "f0xx", src: "foundation", example: { zh, py, vi, en } } }
```

Each example contains its own word. Glosses are copied from the `ref` card, except two polyphonic words where the antonym
sense is a different reading from the card: 还 (huán, "to return", card teaches hái) and 空 (kōng, "empty", card teaches kòng).
高 appears in two pairs (高/矮 and 高/低).

## What the validator checks

Required fields for each kind; ids unique and not colliding with lesson / deck ids; every `ref` exists and is the same hanzi,
and `src` matches it; gap words are on the reference list at the stated level and not already in the app; every example and
phrase contains its word; pinyin has tone marks, no digits and only expected characters; no duplicate words, phrases,
families, pairs or sentences; family and opposite members are HSK 1-4 words; no traditional-only characters (sample list);
every data file is listed in `manifest.js`. It prints the counts per kind.

## Known limits

- Not teacher-reviewed (`checked: false`). Polyphonic characters were checked by hand for every sentence in the gap packs and
  opposites and for every collocation phrase, but a second pair of eyes is advisable.
- Pinyin choices: 血 is given as xuè (also in 流血), 精神 as jīngshén ("spirit, mind"), 刚刚 as gānggāng.
- Sentences stay within HSK 1-4 vocabulary plus a few words the lessons teach (部门, 面试) and the surnames 王 / 李.
