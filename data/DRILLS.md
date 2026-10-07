# Drill content

HSK 4 practice sets. All sentences are original, written for this app.

| File | Global | Loaded by the app | Played by |
|---|---|---|---|
| `data/drills.js` | `window.CB_DRILLS` | yes | `js/games.js` (`drillQ`, `drillGame`) |
| `data/drills_extra.js` | `window.CB_DRILLS_EXTRA` | yes | `js/games.js`: Word Bank (`bank`), Arrange the Words (`wordorder`) |

Check both with `node tools/validate_drills.js` (exit code 1 on any error). `node tools/validate.js` also checks `drills.js`, with fewer rules.

## Counts

| Set | Items | Ids |
|---|---|---|
| `confuse` | 171 | `c01` – `c171` |
| `order` | 124 | `o01` – `o124` |
| `picture` | 104 (208 model sentences) | `p01` – `p104` |
| `measure` | 110 | `m01` – `m110` |
| extra `bank` | 8 groups, 40 items | `bk01` – `bk08`, items `bk01:1` … `bk08:5` |
| extra `wordorder` | 54 | `wo01` – `wo54` |

## Rules for every set

- Simplified Chinese, vocabulary within HSK 1–4 plus the workplace words the app already teaches (员工, 客户, 合同, 面试, 培训 …).
- Vietnamese with full diacritics, English alongside it. Explanations are short and say what the difference is.
- Exactly one defensible answer. If a second answer is arguable, rewrite the sentence.
- Ids are never changed, reused or renumbered: progress is stored under `dr:<set>:<id>` and problem reports use `drill:<id>`, which must match the server pattern `^(drill|mock|gq|word|grammar):[A-Za-z0-9_.-]{1,24}(:\d{1,3})?$`.
- New items are appended at the end of their array with the next number. The validator checks that ids run in order without gaps.
- One item per line, in the same key order as the items above it.

## `CB_DRILLS.confuse`: confusable words

```js
{"id": "c61", "words": ["经验", "经历"], "q": "他年轻的时候____过很多困难，所以现在什么都不怕。", "answer": "经历",
 "explain": {"vi": "…", "en": "…"}}
```

- `words`: two or three options, shown shuffled. `answer` is one of them, as text.
- `q`: one sentence with exactly one `____`.
- `explain`: the difference between the words, not a translation of the sentence.
- Pairs that mean the same in most sentences (突然/忽然, 特别/尤其, 可能/也许, 尽管/虽然, 千万/一定) only have items for the one use where they differ, so the answer in those pairs leans to one word. That is on purpose.

## `CB_DRILLS.order`: put three parts in order

```js
{"id": "o41", "parts": {"A": "…，", "B": "…，", "C": "…。"}, "answer": "BAC",
 "vi": "…", "en": "…", "clue": {"vi": "…", "en": "…"}}
```

- `answer` is the reading order, so `"BAC"` means B, then A, then C. It uses each letter once.
- The part that comes last ends with 。？ or ！; the other two end with a comma.
- `vi` / `en` translate the whole paragraph in the correct order. `clue` names the words that fix the order.
- Each paragraph is built so that only one order works: one part introduces the subject, and the others start with a connective (所以, 可是, 而且, 就, 才 …), a pronoun, or have no subject. Sentences where a clause can also be placed after the main clause (因为…, 为了…, 无论…, 尽管…) were rewritten to block that.
- Items o41–o124 are grouped by structure: 把 (o41–o48), 被 (o49–o55), 比 and other comparisons (o56–o62), complements (o63–o72), 连…都/也 (o73–o77), 是…的 (o78–o82), 不但…而且 (o83–o87), time/place/manner order (o88–o93), paired connectives such as 只要…就, 只有…才, 即使…也, 既然…就, 一…就, 越…越, 除了…以外 (o94–o111), other structures (o112–o124).

## `CB_DRILLS.picture`: write a sentence with a word

```js
{"id": "p41", "emoji": "💌🎉🧑‍💼", "scene": {"vi": "…", "en": "…"}, "word": "邀请",
 "samples": [{"zh": "…。", "py": "…", "vi": "…", "en": "…"}, {…}]}
```

- There are no photos. The game shows `emoji` and `word`, the learner types a sentence, and then the game shows `scene` and the `samples` as model answers.
- `emoji`: two or three emoji, no text. `word`: an HSK 4 word, used once in the whole set.
- Every sample contains `word` and ends with 。？ or ！.
- `py`: tone marks, never numbers; first letter capital; words written together (`Gōngsī yāoqǐng`); names capital (`Xiǎo Lǐ`, `Chángchéng`); neutral tone without a mark (`de`, `le`, `xièxie`, `dìfang`); 一 and 不 written as spoken (`yí gè`, `yì zhāng`, `bú shì`, `búyào`); `le` and `de` stand alone, `zhe` and `guo` join the verb (`guàzhe`); `V bu V` for potential forms (`tīng bu dǒng`).

## `CB_DRILLS.measure`: measure words and collocations

```js
{"id": "m41", "q": "一____出租车", "options": ["辆", "条", "张", "本"], "answer": 0,
 "explain": {"vi": "…", "en": "…"}}
```

- `options`: four different words. `answer` is the **index** (0–3) of the right one.
- `q`: a phrase or short sentence with exactly one `____`.
- m01–m20 and m41–m110 are measure words; m21–m40 are verb + noun collocations.
- When a noun takes more than one measure word (一张/一份报纸, 一只/一条狗, 一部/一台手机), only one of them is among the options.

## `CB_DRILLS_EXTRA`

Two HSK 4 question types the drills did not have, now played as the games **Word Bank** and **Arrange the Words**
(skills `fill-word` and `word-order`). What was needed to wire them in, for reference:

1. add `<script src="data/drills_extra.js">` (or lazy-load it) and add the file to the service-worker cache list;
2. write the two games in `js/games.js`;
3. register the ids in `js/content.js` (the `add("drill:" + id, …)` block), so that hiding and problem reports work: `drill:wo01` for word order, `drill:bk01:1` for a word-bank item;
4. choose the skill each set counts towards (`DRILL_SKILL`).

### `bank`: reading part 1, 选词填空

```js
{"id": "bk01", "bank": ["竟然", "积累", "礼貌", "提醒", "到底", "温度"], "items": [
  {"n": 1, "q": "他工作了十年，____了丰富的经验。", "answer": 1, "vi": "…", "en": "…"},
  …
]}
```

- One group is one exam-style block: six words, five sentences. Each word answers at most one sentence and one word is left over (in the real exam that word is used by the printed example).
- `answer` is the **index** into `bank`. `n` runs 1–5 and is the last part of the report id (`drill:bk01:1`).
- `vi` / `en` translate the completed sentence.
- Show the whole bank for every sentence of the group. The game can show the five sentences together, as in the exam, or one at a time.

### `wordorder`: writing part 1, 完成句子

```js
{"id": "wo05", "tokens": ["连", "他自己", "都", "不相信", "这个消息"], "answer": "连他自己都不相信这个消息",
 "alt": ["这个消息连他自己都不相信"], "vi": "…", "en": "…", "point": {"vi": "…", "en": "…"}}
```

- `tokens` are stored **in the correct order**, like `writing.p1` in the mock exams. The game must shuffle them before showing them.
- `answer` is the tokens joined, with no punctuation. `alt` (optional) lists every other order that is also correct; accept `answer` or any `alt`.
- `point` names the grammar pattern, for the feedback line.
- Tokens are cut so that swapping two noun phrases does not give a second correct sentence (for example `我给` / `客户` and not `我` / `给` / `客户`).

## Adding items

1. Append to the end of the array; take the next id.
2. Check the answer again by reading the finished sentence with every option in the gap. For `order`, try the first two parts the other way round.
3. Run `node tools/validate_drills.js` and `node tools/validate.js`.
4. Update the counts table above.
