# HSK 3.0 track: plan

Status: research and data structure only. **No HSK 3.0 word lists or questions are in the app yet**, because the
official lists could not be downloaded from this session (see "Content" below). Researched 6 Nov 2026.

## What is official, and where it comes from

| Fact | Source | Confidence |
|---|---|---|
| HSK 3.0 levels 1–6 start worldwide on **13 Dec 2026**; paper registration closes 16 Nov, computer-based 3 Dec (Beijing time). | Official HSK account, announcement repost ([X / HSKTestOfficial](https://x.com/HSKTestOfficial/status/2097633616931041329)); CTI news page `chinesetest.cn/news/51336883` (cited by [StudyCLI](https://studycli.org/hsk/the-new-hsk/), not reachable from here) | High |
| The last regular HSK 2.0 levels 1–6 date of 2026 is **7 Nov 2026**. | [StudyCLI](https://studycli.org/hsk/the-new-hsk/), citing the CTI 2026 calendar | Medium (secondary) |
| Two pilot rounds ran (31 Jan and 20 Sep 2026). Section times: L1 written ~40 min; L2 ~60; L3 ~83 + speaking ~15; L4 ~85 + speaking ~20; L5 ~110 + speaking ~23; L6 ~125 + speaking ~23. Levels 3–6 must be taken **together with the matching speaking test**. Paper and computer formats. | [CTI notice](https://www.chinesetest.cn/notice) | High |
| The syllabus *中文水平考试 HSK 考试大纲* is published by 中外语言交流合作中心 (CLEC), released 2025-11, in force 2026-07. It has task, topic, vocabulary, character and grammar outlines per level (vocabulary for level 4 starts on p. 102, level 5 on p. 127). | [Official syllabus PDF](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf) (table of contents read; full lists not extracted) | High |
| Written-test question counts: L1 40, L2 60, L3 70, L4 70, L5 72, L6 82. | [StudyCLI](https://studycli.org/hsk/the-new-hsk/) | Medium — not in the CTI notice; check the official sample papers |
| Cumulative words: L1 300, L2 500, L3 1,000, L4 2,000, L5 3,600, L6 5,400. | [StudyCLI](https://studycli.org/hsk/the-new-hsk/) | Medium — must be counted from the syllabus |
| The vocabulary basis is the national standard *国际中文教育中文水平等级标准* (GF 0025—2021), 3 stages / 9 bands. | [Confucius Institute La Rochelle](https://institut-confucius.univ-larochelle.fr/2021/03/31/publication-du-standard-for-chinese-proficiency-in-international-chinese-language-education-%e3%80%8a%e5%9b%bd%e9%99%85%e4%b8%ad%e6%96%87%e6%95%99%e8%82%b2%e4%b8%ad%e6%96%87%e6%b0%b4%e5%b9%b3/) | High for the standard; whether the 2025 syllabus lists equal GF 0025 bands 1–6 word for word is **not confirmed** |

Third-party sites disagree on several points (one says HSK 3.0 "changed in July 2026", another calls 20 Sep a launch).
Only the rows marked High are safe to show learners as fact.

## What it means for this app

- The current course is HSK **2.0** level 4 (1,200 words) and an HSK 5 extension. A learner booking an HSK 4 exam
  after 13 Dec 2026 sits HSK **3.0** level 4: about 2,000 words, a new paper, and a compulsory speaking test.
- Most HSK 2.0 level 4–5 words appear somewhere in HSK 3.0 levels 1–6, at different levels. The work is mostly
  **re-levelling and gap-filling**, not starting over.
- Speaking becomes part of the exam for levels 3–6. The app's role-play and voice features are the natural base.

## Plan (after the November exam)

1. **Get the lists (needs you).** Download the syllabus PDF above on a computer and attach it, or the CTI
   "Examination Syllabus" and "Sample Questions" files linked from the [CTI notice](https://www.chinesetest.cn/notice).
   The session's network cannot reach those hosts.
2. **Import** the vocabulary, characters and grammar tables into `data/hsk3/` with a script (to write:
   `tools/hsk3/import_syllabus.py`), keeping the syllabus page number on every row so each item can be traced.
   Validate with `tools/validate_hsk3.js` (added on this branch; it checks the structure below).
3. **Map to existing words.** For every HSK 3.0 word, link the app's existing entry (`ref`) when hanzi + reading
   match, so reviews, audio and progress carry over. Report: words new to the app per level, words whose level moved.
4. **Fill gaps** (vi / en meanings, C&B example sentences) the same way the HSK 5 pack was built, with the
   two-agent check from the content audit (`tools/audit/`), then a teacher pass. Mark every generated item
   `checked: false`.
5. **Exam format and mocks.** Build mock papers only from the official sample papers' structure. Until those
   are read, the app should show only the times in the table above, not question counts.
6. **Speaking.** Add HSKK-style tasks (repeat, describe a picture, answer a question) to role-play, scored by
   the AI service with a rubric.
7. **Learner switch.** A setting "My exam: HSK 2.0 / HSK 3.0" that changes Learn, the plan and the mocks. Existing
   progress is never lost.

## Data structure

Files under `data/hsk3/`, plain scripts like the rest of `data/` (types in `types/hsk3.d.ts`, example in
`data/hsk3/README.md`):

- `manifest.js` → `window.CB_HSK3_FILES` (list of files, empty until imported) and `window.CB_HSK3_FORMAT`
  (exam format per level, each value with its source and a `verified` flag).
- `words-l1.js` … `words-l6.js` → `window.CB_HSK3_WORDS.push(...)`: `{ id, hanzi, pinyin, level, pos, vi, en,
  example?, ref?, src: { doc, page }, checked }`. Ids `h3-<level>-<nnnn>` never change once published.
- `chars.js` → characters per level (`{ char, pinyin, level, src }`).
- `grammar.js` → grammar points per level with the syllabus code (`{ id, code, level, title, pattern, examples,
  src, checked }`).

Open questions for you: which exam (2.0 on 7 Nov, or 3.0 later) the second learner will sit; whether to keep HSK 2.0
content visible after the switch.
