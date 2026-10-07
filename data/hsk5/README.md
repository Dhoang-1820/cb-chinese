# HSK 5 word packs

`words01.js` ... `words62.js`: the HSK 2.0 level-5 vocabulary that the app does not teach yet,
**1,231 words in 62 packs** (61 packs of 20, the last pack has 11). Data only: nothing in the app loads
these files yet.

All content is machine-written and **not yet checked by a human** (`checked: false` on every pack).

## Schema

Each file appends one pack to a global:

```js
(window.CB_HSK5 = window.CB_HSK5 || []).push({
  "pack": 1,                        // 1..62, same as the file number
  "checked": false,                 // set to true once a human has reviewed the pack
  "title": {"en": "HSK 5 · Pack 1", "vi": "HSK 5 · Gói 1"},
  "range": "哎 – 保存",              // first and last word of the pack
  "words": [
    {"id": "h5-0001",               // h5-0001 .. h5-1231, never collides with lesson (dNN-NN) or core (kNNN) ids
     "hanzi": "哎", "pinyin": "āi",
     "pos": "int.",                 // lesson format; several joined with "/", e.g. "v./n."
     "level": "HSK5",
     "vi": "này; ôi (ngạc nhiên, nhắc nhở)",
     "en": "hey; oh (surprise or reminder)",
     "example": {"zh": "...", "py": "...", "vi": "...", "en": "..."}}
  ]
});
```

The word object has the same fields as a lesson word (`data/dayNN.js`), without `collocations`.
Note for whoever wires this in: `tools/validate.js` only accepts the levels `HSK4` and `Beyond HSK4`,
so `level: "HSK5"` needs to be added there when these words join the main build.
Words are in the order of the source list (alphabetical by pinyin); packs have no themes.

## Word list: source and licence

- List: *HSK Official With Definitions 2012 L5.txt* from <https://github.com/glxxyz/hskhsk.com>
  (`data/lists/`), commit `8a6f229c699e2fd7ac8708156c55c3afb2be7e1f` (2021-05-04), **MIT licence**
  (Copyright (c) 2020 Alan Davies). It has exactly 1,300 words, the official size of HSK 2.0 level 5.
  Only the word and its pinyin were taken from it (not the definitions).
- Cross-check: <https://github.com/drkameleon/complete-hsk-vocabulary>, commit
  `7ac65bf1a6387d35f1ade478906172a19311c7f9`, MIT licence, `wordlists/exclusive/old/5.json` (1,298 words).
- 69 of the 1,300 words are already in the app (daily lessons or the HSK 4 core decks) and were removed,
  leaving 1,231: 把握 办理 报到 比例 标点 部门 差距 承受 词汇 辞职 待遇 单位 登记 发票 分配 改进 改善 概括 公平
  沟通 固定 归纳 汇率 集体 纪律 假设 艰苦 简历 结论 课程 灵活 浏览 录音 矛盾 目标 培训 赔偿 趋势 人才 人员 时差
  手续 数据 宿舍 谈判 坦率 统一 透明 退休 稳定 无奈 系统 细节 效率 信号 宣布 学历 遗憾 因素 预订 诊断 证据 制度
  治疗 主持 专家 咨询 资格 遵守.
- Pinyin of other words inside example sentences comes from CC-CEDICT as shipped in
  `vendor/dict/cedict.v1.js` (CC BY-SA 4.0) and from pypinyin 0.55.0 (MIT) for single characters.

## How the files are generated

Everything is reproducible from `tools/hsk5/`:

| file | what it is |
|---|---|
| `wordlist.tsv` | the 1,231 words with the pinyin of the source list, in source order |
| `entries/batch01.txt` ... `batch13.txt` | the hand-written data table, one word per line: `hanzi\|pos\|en\|vi\|example (words separated by spaces)\|example en\|example vi` |
| `build_hsk5.py` | reads both and writes `data/hsk5/wordsNN.js` (needs `pip install pypinyin`) |
| `overrides.py`, `pinyin_util.py` | readings for neutral-tone and polyphonic words; pinyin helpers |
| `reviewed.txt` | polyphonic tokens whose reading was looked at and accepted |
| `hsk1-5.txt`, `app-words.txt` | HSK 1-5 word list and a snapshot of the app's own vocabulary, used only for the "is this example within HSK 1-5?" report |

```
python3 tools/hsk5/build_hsk5.py            # rebuild all packs
python3 tools/hsk5/build_hsk5.py --review   # also list unreviewed polyphonic tokens and words outside HSK 1-5
node tools/validate_hsk5.js                 # must print "OK: no errors."
```

- **Headword pinyin**: from the source list, written as one word as in the lessons, with the apostrophe
  taken from CEDICT (`qīn'ài`). Where the list gives two readings or differs from normal usage the HSK
  reading was chosen by hand (table `HEAD` in `build_hsk5.py`): 便 biàn, 划 huá, 片 piàn, 抢 qiǎng, 切 qiē,
  数 shǔ, 吐 tù, 系 xì, 涨 zhǎng, 挣 zhèng, 嗯 èn, 佩服 pèifú, 痛快 tòngkuài, 秘书 mìshū, 老婆 lǎopo ...
  Headwords beginning with 一 / 不 carry tone sandhi (yíbèizi, búduàn), as the lessons do (yícìxìng, búguò).
- **English / Vietnamese / part of speech**: written for this app, the common HSK meaning in a few words;
  English follows the CEDICT sense, Vietnamese matches the English.
- **Example sentences**: one original sentence per word, written for this app (not copied from any
  textbook, past paper or website), 8-17 characters, many in an office / HR context.
- **Example pinyin**: generated word by word from the segmented sentence: headword reading, else the
  override tables, else CEDICT, else pypinyin; then 一 / 不 tone sandhi, neutral tones for common words,
  capitalised proper nouns, and the lesson conventions (`zhège`, `yí gè`, `hěn duō`, `dì-yī`, verb-suffix
  `le` attached, sentence-final `le` separate). A reading can be forced inline: `得{děi}`, `过{guo}`.

## What was checked

By `tools/validate_hsk5.js` (all pass): required fields; ids unique, sequential and distinct from lesson
ids; no hanzi twice; no word that is in `data/day*.js` (words also in the core decks would be a warning:
none); pinyin has tone marks, no digits, no stray characters; part of speech from a fixed set; the example
contains the word, has only Chinese characters and Chinese punctuation, 8-20 characters, ends with 。？！,
is not repeated; example pinyin is capitalised, punctuated and has no more tone marks than characters;
Vietnamese has diacritics; pack numbering and pack size.

By the generator: every example token is an HSK 1-5 word, an app word, or made of HSK 1-5 characters
(heuristic); every multi-reading token was listed and its reading looked at.

## What was NOT checked

- No native speaker or teacher has read the meanings, the Vietnamese or the sentences.
- Example pinyin is generated; readings of polyphonic characters (得 地 还 长 重 行 为 着 了 种 只 ...) were
  spot-checked in samples, not sentence by sentence. Neutral tones follow the override table and may be
  inconsistent for less common words (CEDICT often gives the full tone).
- Word spacing in pinyin follows the segmentation written in `entries/`; verb + complement + `le` comes
  out as `xué dàole`, which may differ from a hand-written lesson line.
- The "within HSK 1-5" check is a heuristic on characters, so an occasional compound outside the lists
  may be present.
- The part of speech is a best judgement, not taken from an official list.
