# Content audit report (November 2026)

Scope: every item still marked `checked: false` or written after the teacher-checked core: HSK 4 grammar (70 points) and
practice drills, the Word Bank and Arrange-the-Words games, days 61–90, mocks 5–8, the 24-week Pro track, HSK 5 words,
grammar and drills, and the extra HSK 4 packs. Nothing was added; only errors were corrected.

## Result in one paragraph

2,323 questions were re-solved blind and 1,682 word entries and 1,503 translated lines were reviewed. After fixes, the
blind solvers agree with the app's answer key on 2,320 of 2,323 questions; the other 3 were checked against their
passages and the app is right (the solver did not see the passage). **106 entries were corrected** (10 high, 31 medium,
65 low severity, counted per item), including 5 exam items that had two correct answers. 6 doubts are left for a human
(below). No answer key was found to point at a wrong option.

## How it was checked (no self-grading)

1. `tools/audit/dump.js` flattens all content in scope; `blind.json` is the same questions with keys and explanations removed.
2. Deterministic checks, `tools/audit/lint.js`:
   - pinyin against the **pinyin-pro** library (every syllable must be a valid reading of its character; context readings that differ from the library's pick are listed),
   - duplicate options, out-of-range keys, ABC orders that are not permutations, word-order answers that do not use exactly the tiles, example sentences that do not contain their word,
   - glossary lint: `data/glossary.json` (51 C&B terms, agreed vi/en wording) against every word entry and every translated line.
3. 13 solver agents solved all questions **without the keys**. 16 reviewer agents checked words and lines; 1 agent judged each pinyin-library disagreement.
4. Every disagreement or flag went to a **different** agent: an adjudicator (with the source and keys) for questions, three verifiers for word/line fixes. Each could reject the first agent; they rejected 30 question flags and 15 proposed fixes, and amended 10.
5. Fixes were applied with `tools/audit/apply.js` (HSK 5 words through `tools/hsk5/entries` + `build_hsk5.py`, so the generator stays the source of truth). Then dump, lint and the key comparison were re-run: options 0, usage 0, glossary 0 findings.

Re-run any time: `npm i --no-save pinyin-pro && node tools/audit/dump.js /tmp/a && node tools/audit/lint.js /tmp/a`.

## Exam items that had two correct answers (high, fixed)

- **drills c36** 之所以……是由于 is also correct (and the explanation said it wasn't): prompt changed so only 因为 fits.
- **drills c71** 表达感谢 is natural too: new prompt where only 表示 fits.
- **mock 5 R2-7** CBA was also a natural order: 另外 added to part B so only CAB works.
- **mock 5 W1-7, W1-8, mock 6 W1-4** a second correct sentence: added to `alt`, so both are marked right.

Other high fixes: 为 read *wèi* instead of *wéi* in "X为Y" contract lines (track w3), 调薪 *diàoxīn* → *tiáoxīn* (3 lines),
休息日 tone, 绩效 *jīxiào* → *jìxiào*, 时间长 *zhǎng* → *cháng*.

## Left for you (uncertain, not changed)

| # | Severity | Item | Doubt |
|---|---|---|---|
| 1 | medium | HSK 5 嗯 (h5-0643) | App says *èn* (from the source list, set deliberately in `build_hsk5.py`). Dictionaries give *ǹg* / *ńg*. Change `HEAD` and the single-char table if you agree. |
| 2 | low | HSK 5 下载 (h5-0964) | App says *xiàzǎi* (official list); 现代汉语词典 gives *xiàzài*. Both are heard. |
| 3 | low | day 67 reading 10, 当月 | *dāngyuè* vs *dàngyuè* ("that same month"); dictionaries differ. |
| 4 | low | families 活泼 | *huópo* (spoken) vs *huópō* (dictionary). |
| 5 | low | mock 5 L3-2 | The woman in the dialogue was named 林浩 (the app's male character); renamed 黄玲. Audio is TTS, so nothing to re-record, but check you like the name. |
| 6 | info | 154 polyphone notes | pinyin-pro picks a different reading in 154 places; an agent judged all of them and found only the 8 errors fixed above. The list is reproducible with lint.js if a teacher wants to spot-check. |

Not errors, noted only: several picture-writing samples use the general measure word 个 where 面 / 扇 / 班 is more
idiomatic (p58, p60, p92); m21–m40 in the measure drill test verb–object pairs, not measure words (label only).

## All corrections

### Answer keys and question wording (adjudicated)

| Item | Severity | What was wrong / what changed |
|---|---|---|
| drills4:confuse:c36 | high | 之所以……是由于…… is also standard written Chinese, so both options are correct and the explain is false. Use a postposed cause clause, where only 因为 is possible. |
| drills4:confuse:c71 | high | 对大家的努力表达感谢 is natural, so 表达 is a second correct answer. Use a gesture context where only 表示 fits. |
| mock5:R2-7 | high | CBA ('…到了以后先给我打个电话，路上注意安全') is a fully natural farewell, so two orders are correct. Add 另外 to B so it must follow another instruction (A). |
| mock5:W1-7 | high | 不但便宜而且好吃 is equally correct; add it to alt. |
| mock5:W1-8 | high | Sentence-final 了 (改到明天了) is equally correct; add it to alt. |
| drills4:confuse:c158 | medium | 发生了很大的改变 is common native usage, so 改变 is also accepted by many speakers. Use 天气变化, where 改变 does not fit. |
| day68:quiz:2 | medium | 'Once the contract expires, notify early whether to renew' is self-contradictory (notice must come before expiry). Change the result clause; 一旦 stays the only fit. |
| day70:quiz:5 | medium | Same contradictory sentence as day68:quiz:2; apply the same wording. |
| day72:fill:1 | medium | 复核 (in this day's word bank) also fits '要先___，再下结论'. Add an object that only 核实 takes. |
| day72:fill:4 | medium | 差距 (in the bank pool) fits '实际和计划之间有一点___' just as well. Use a calculation-error context where only 偏差 fits. |
| day77:fill:0 | medium | 诊断 takes an illness as its object; '医生诊断他需要住院' is unnatural. |
| mock6:W1-4 | medium | 哥哥比我踢足球踢得好 is also grammatical with these tokens; add it to alt. |
| grammar:g32:3 | low | 请问 reads as 'excuse me, may I ask'; the key sentence should say 'please go and ask HR'. |
| drills5:picture:h5p047 | low | 画出来 is unidiomatic for marking a date; 圈出来 is the natural verb. |
| day81:fill:3 | low | '订单还不算回款' is awkward: 回款 is the money, not a status of the order. '还没有回款' is natural. |
| day81:quiz:2 | low | Same awkward '还不算回款'; use '还没有'. |
| mock5:L3-2 | low | 林浩 is the app's recurring male character (referred to with 他 elsewhere), but here he is voiced and asked about as 女. Use the recurring female name 黄玲. If any pre-rendered audio exists for this line, regenerate it. |

### Words, sentences, pinyin and translations (verified)

| Entry | File | Severity | Fields | Why |
|---|---|---|---|---|
| track:w7:s1:phrase:2 | track_w07-12.js | high | py | 调薪 is tiáoxīn |
| track:w10:s2:turn:3:c0 | track_w07-12.js | high | py, vi | 调薪 is tiáoxīn |
| track:w12:s2:turn:2:c2 | track_w07-12.js | high | py | 调薪 is tiáoxīn |
| track:w16:s2:card:2 | track_w13-18.js | high | card.cn.py, card.ex.py | 息 is not second tone; xiūxīrì matches the app's xiūxī elsewhere |
| track:w17:s1:card:4 | track_w13-18.js | high | card.cn.py, card.ex.py | 绩 is jì in Mainland standard |
| day62:grammar:0 | day62.js | medium | en | 'let alone' needs a negative context; fix is correct English |
| day62:translate:2 | day62.js | medium | en | 'let alone' after a positive clause is wrong; fix keeps 就 'even' and 现在 |
| day62:grammar:1 | day62.js | medium | zh, py | 何况面试呢 lacks a verb, so the fix is valid, but this is the 何况 example in the 何况 grammar point (day62) and must keep 何况; 更别说 would remove the target pattern |
| day73:reading:2 | day73.js | medium | zh, py, vi | 幅度 cannot take 上涨得慢; 低于物价涨幅 is the right collocation |
| day76:reading:12 | day76.js | medium | zh, py, vi, en | 就算…也 has no subject and is illogical here; day76's grammar point is 一旦, so dropping 就算 is fine |
| track:w3:s1:text:3 | track_w01-06.js | medium | py | 为 meaning 'to be' is read wéi |
| track:w3:s1:text:4 | track_w01-06.js | medium | py | 为 meaning 'to be' is read wéi |
| track:w3:s3:sample:2 | track_w01-06.js | medium | py | 为 meaning 'to be' is read wéi |
| track:w19:s3:line:10 | track_w19-24.js | medium | zh, py, vi | 热门岗位之间 = among hot posts; en means hot vs others |
| track:w20:s2:line:9 | track_w19-24.js | medium | vi | 公正 = impartial; 'liêm chính' means incorruptible |
| track:w20:s3:line:0 | track_w19-24.js | medium | vi | 'Đồng công đồng thù' is not Vietnamese usage; fix is clear |
| track:w20:s3:line:1 | track_w19-24.js | medium | vi | Same calque |
| hsk4x:collocations:1:22 | hsk4x/missing01.js | medium | extra.phrases[1].zh, extra.phrases[1].py, extra.phrases[1].vi, extra.phrases[1].en | 增加经验 unnatural (积累经验); 增加收入 is standard |
| d76-05 | day76.js | medium | collocations[0].zh, collocations[0].py, collocations[0].vi | 立案案件 is redundant noun phrase; 予以立案 parallels 不予立案 |
| d77-01 | day77.js | medium | example.zh, example.py, example.vi, example.en | 诊断 needs a condition as object; fix is natural |
| d86-09 | day86.js | medium | pinyin, example.py, collocations[0].py, collocations[1].py, collocations[0].vi | 篇幅 is piānfú in standard dictionaries. |
| track:w23:s1:word:17 | track_w19-24.js | medium | example.zh, example.py, example.vi, example.en | A month is not a peak value; 在十二月达到峰值 is natural. |
| h5-0301 | hsk5/words16.js | medium | example.vi | "cá biệt vài" is unnatural; "một vài" is fine. |
| h5-0346 | hsk5/words18.js | medium | example.zh, example.py | 广泛听取意见 is the natural collocation. |
| h5-0643 | hsk5/words33.js | medium | pinyin, example.py | 嗯 (agreement) is ǹg in Xiandai Hanyu Cidian; èn is non-standard. |
| h5-0696 | hsk5/words35.js | medium | example.zh, example.py | 签名字 is awkward; 签上您的名字 is natural. |
| h5-0701 | hsk5/words36.js | medium | example.zh, example.py | 强调 needs the noun 重要性. |
| h5-1022 | hsk5/words52.js | medium | example.vi | "đồng nghiệp cũ" means former colleagues; 老同事 here = senior colleagues. |
| h5-1223 | hsk5/words62.js | medium | example.vi | "gồm ... tạo thành" is ungrammatical; "do ... tạo thành" is correct. |
| grammar5:h5g30:ex0 | hsk5/grammar.js | low | en | 衣服 is generic, so 'dress' is too specific (vi has 'áo'); fix is accurate |
| day77:reading:11 | day77.js | low | vi | 'hơn trước' misreads 先 as 'than before'; fix is correct |
| day78:reading:1 | day78.js | low | vi | 'nghiêm túc đối xử' with no object is unnatural; 'xử lý' fits 认真对待 here |
| day66:reading:0 | day66.js | low | en | Fix restores 我 and uses the natural past tense for a reported question |
| day79:reading:5 | day79.js | low | vi | In an HR context 个人表现 means work performance; 'hiệu suất' matches the en |
| day82:grammar:1 | day82.js | low | vi | 'báo danh' means registering; a new hire who 报到 is 'đến nhận việc' |
| day83:reading:6 | day83.js | low | vi | 'sáu tháng đệm' is unnatural; 'thời gian đệm sáu tháng' is right |
| track:w4:s3:sample:3 | track_w01-06.js | low | en | The problem is real, but 'certificate of employment end' is unnatural English |
| track:w10:s2:turn:1 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w10:s2:turn:1:c1 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s1:phrase:2 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s1:phrase:6 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:0:c1 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:1:c1 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:2 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:3 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:3:c1 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:4 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w11:s2:turn:4:c2 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w12:s2:turn:1:c2 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w12:s2:turn:4 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w12:s2:turn:4:c0 | track_w07-12.js | low | py | Pinyin needs an apostrophe before a syllable starting with a/e/o; only that changes |
| track:w7:s1:phrase:3 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w7:s2:turn:2:c1 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w7:s2:turn:2:c2 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w9:s2:turn:1:c0 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w11:s2:turn:3:c0 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w12:s1:phrase:6 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w12:s2:turn:1:c1 | track_w07-12.js | low | vi | 'tổng bộ' is unnatural for a company HQ; 'trụ sở chính' is standard and matches the course's other uses |
| track:w10:s2:turn:3 | track_w07-12.js | low | vi | 缴费基数 is the contribution salary base (mức lương đóng BHXH); 'mức đóng' suggests the amount paid |
| track:w10:s2:turn:3:c1 | track_w07-12.js | low | vi | Same term 社保基数; base, not amount |
| track:w11:s1:phrase:0 | track_w07-12.js | low | en | English imperative misreads the speaker's thanks; fix is natural |
| track:w15:s3:card:4 | track_w13-18.js | low | card.ex.en | 离职 covers any departure; 'resignation certificate' too narrow |
| track:w7:s1:phrase:1 | track_w07-12.js | low | vi | 'Biểu hiện công việc' is a calque; 'kết quả làm việc' is natural |
| track:w17:s3:card:4 | track_w13-18.js | low | card.ex.zh, card.ex.py | Current 差额…补发工资 is muddled, but dropping 工资 removes the card's target term 补发工资 from its own example; keep the term |
| track:w19:s2:line:2 | track_w19-24.js | low | en | 'Hit by market demand' is illogical; 'affected by' is correct |
| track:w20:s3:line:7 | track_w19-24.js | low | en | 减少 = reduce, not avoid |
| track:w21:s3:line:6 | track_w19-24.js | low | en | 工资发放 is wage payment generally, not pay dates |
| track:w22:s3:line:5 | track_w19-24.js | low | en | Current grammar makes the explanation the thing carried out; fix is clear |
| hsk4x:collocations:2:33 | hsk4x/missing02.js | low | extra.phrases[2].zh, extra.phrases[2].py, extra.phrases[2].vi, extra.phrases[2].en | 节约钱 is unidiomatic (省钱); 节约用电 parallels 节约用水 |
| hsk4x:collocations:3:34 | hsk4x/missing03.js | low | extra.phrases[0].en | 'a successful experience' means an event that went well; 成功的经验 = lessons from success |
| hsk4x:collocations:4:16 | hsk4x/missing04.js | low | extra.phrases[1].zh, extra.phrases[1].py | 缺少人 unnatural; 缺少人手 standard |
| d71-05 | day71.js | low | en | "growth margin" suggests profit margin; 增幅 is size/rate of increase. |
| d87-10 | day87.js | low | example.en | 完整 = in full; "accurately" is added meaning. |
| track:w19:s1:word:4 | track_w19-24.js | low | example.vi, example.en | 一成 is exactly 10%. |
| track:w19:s1:word:14 | track_w19-24.js | low | example.vi | English says turnover; "biến động nhân sự" is the Vietnamese HR term, "luân chuyển" means internal rotation. |
| track:w22:s1:word:0 | track_w19-24.js | low | vi | "quy chế" is the standard term; example.vi already uses it. |
| h5-0103 | hsk5/words06.js | low | example.en | Agreement error "This is ... results". |
| h5-0286 | hsk5/words15.js | low | example.vi | "dứt khoát" is wrong for adverbial 干脆, but the proposed "thì thôi chúng ta để mai" runs on; add comma and tidy. |
| h5-0249 | hsk5/words13.js | low | example.en | "over three times" can read as "more than three times". |
| h5-0455 | hsk5/words23.js | low | vi, example.vi | tọa đàm = panel discussion, not lecture. |
| h5-0618 | hsk5/words31.js | low | vi, example.vi | Gloss omitted 古迹. |
| h5-0536 | hsk5/words27.js | low | example.zh, example.py, example.vi | 走四辆车 is awkward, but 同时开四辆车 can read as one person driving four cars; 同时通过 is clear and HSK-level. |
| h5-0757 | hsk5/words38.js | low | example.en | "system" hides the headword 软件; "a new piece of ... software" is clumsy for 一套, "software package" matches better. |
| h5-0751 | hsk5/words38.js | low | vi | 日期 = date; "thời hạn" means deadline. |
| h5-0846 | hsk5/words43.js | low | example.zh, example.py | 把水甩干 is unnatural; 把手上的水甩掉 is correct. |
| h5-0864 | hsk5/words44.js | low | example.zh, example.py | 上班的时间 is ambiguous (working hours); en/vi say commute. |
| h5-0991 | hsk5/words50.js | low | example.en | Original English is illogical. |
| h5-1163 | hsk5/words59.js | low | example.en | 表格 = table/form; vi says "bảng biểu". |
| x4-0010 | hsk4x/extra_collocations02.js | low | en | pos n.: 电子 as noun means electron. |
