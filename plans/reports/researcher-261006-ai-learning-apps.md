# Research: How learning apps use AI, and what fits C&B Chinese

## Decision Summary
Build, in this order: (1) a **content audit + glossary lint** that checks every lesson and mock for correctness and consistency; (2) a **scenario role-play chat** where humans write the scene and the AI plays one character; (3) a **better review scheduler** (stability-based, no AI cost); (4) **mistake-driven practice** from your own error tags. Encouragement stays light (weekly coach plus in-app messages). Speaking check is last and needs a feasibility test on iPhone first.
Reason: the apps that earn trust keep humans in charge of content and use AI for explanation, practice partners and scheduling. Your biggest risk is not too little AI, it is wrong or inconsistent content in 90 days + 6 mocks + a 24-week track that was written by AI.

## Methodology
5 searches (Duolingo Max, speaking-tutor apps, LLM hallucination in language learning, spaced-repetition models, notifications/motivation) plus 8 page fetches. Date range: mostly 2023-2026. Search terms: see references.
Evidence quality: Duolingo statements are from Duolingo's own blog (first party). Hallucination findings are from one arXiv paper and one industry explainer. **Speak, Busuu, Hello Chinese, HelloTalk, Memrise, Lingodeer, ChinesePod, Pleco and Squirrel AI: I could not verify their AI features from fetched sources in this session, so I make no claims about them.** Gemini free-tier limits could not be fetched; check AI Studio before adding load.

## Findings
### What Duolingo says it does (verified, first party)
- **Roleplay / Video Call / Explain My Answer on GPT-4.** Humans write the scenarios and check that answers are factually correct and have the right tone; the AI plays the character. Learners get AI feedback on accuracy and complexity after the chat, and can report an error on a message; reports are used to improve the system. ([Duolingo Max](https://blog.duolingo.com/duolingo-max))
- **Spaced repetition by Half-Life Regression:** recall probability p = 2^(-delta/h), half-life h estimated per word from the learner's history and word traits. Roughly half the error of their older Leitner scheduler; A/B: +9.5% practice retention, +12% overall activity. ([How we learn how you learn](https://blog.duolingo.com/how-we-learn-how-you-learn))
- **Motivation via bandit algorithms** for notifications: compare messages only within the same kind of learner, space repeats so novelty does not wear off, and wording works differently per language (e.g. "Time for [language]" works for Chinese learners). Result: more learners complete lessons more often. ([the AI behind the meme](https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/))
- A newer paper confirms HLR can be improved while staying explainable (mixed-effects + random forest; contextual features matter most). ([PMLR](https://proceedings.mlr.press/v339/ilidio26a.html))

### Keeping AI content correct (research, moderate confidence)
- Separate generation from checking: a multi-agent checker reached kappa 0.81 vs 0.46 for a single agent. LLM judges rejected hallucinated content only about 70% of the time and showed self-preference (76.7%) and position bias (20.4%): use them as a pre-screen, then a human. ([arXiv 2508.05929](https://arxiv.org/pdf/2508.05929))
- Language-learning practice: split tasks into stages, give a minimal edit with a short justification, ground explanations in approved references, verify in a second pass, run sentinel test sets for drift, offer alternatives with "when to use" instead of one authority. ([CALL hallucination mitigation](https://geosurge.ai/corpus/gen-4149/intelligent-computer-assisted-language-learning/hallucination-mitigation-in-call.html))
- FSRS (open source, used by Anki since 23.10) models stability, difficulty and retrievability per card; claims same retention with fewer reviews. Numbers not verified here. ([FSRS](https://concepts.dsebastien.net/concept/fsrs/))

### What C&B Chinese already has
Picture-writing grader, explain-my-mistake, Ask AI, paragraph coach, weekly coach, report-and-accept fixes (two-pass check), golden test set, Leitner-style boxes, bilingual output.

## Trade-offs for a small offline PWA
| Idea | Value | Cost / risk | Fits? |
|---|---|---|---|
| Content audit + glossary lint | Very high: fixes the root risk | One-off script, uses your own key, human review of findings | Yes, do first |
| Scenario role-play chat | High: speaking/writing practice in C&B scenes | More Gemini calls; needs turn limits and an end-of-chat review | Yes, free tier OK with caps |
| Stability-based scheduler | Medium-high | Pure client code, no AI; must migrate existing boxes safely | Yes |
| Mistake-driven practice | Medium-high | AI-generated items need two-pass check before showing | Yes, small |
| Notification bandits | Low here | Needs push backend; iOS PWA push is limited; one learner gives no data to learn from | No |
| Speaking check | Medium | iPhone speech recognition unverified | Test first |

## Recommendation
### Quick Start (in order)
1. `tools/ai_audit.js`: for each day/mock/track item, call the existing two-pass verifier, write `docs/audit-report.md` (findings grouped by severity) for human review; also deterministic checks (pinyin vs a pinyin library, same Chinese term always has the same Vietnamese/English, no duplicate quiz options, answer in options).
2. Glossary: one file of fixed term translations (e.g. 薪酬, 社保, 公积金) checked across all lessons.
3. Role-play: new `roleplay` task (persona + scenario from track weeks 7-12, max 6 turns, bilingual end review, per-day cap).
4. Scheduler: replace boxes with a stability value per word; keep old data by converting box to initial stability.
5. Mistake-driven drill: weekly "weak spots" set from error tags, new items two-pass checked.

### Pitfalls to Avoid
- Do not let one model grade its own output; use two models plus a human on anything that changes lessons.
- Do not add AI calls on every tap; free-tier Gemini data may be used by Google, so send no personal data.
- Do not trust unverified claims about competitor apps.

## References
- [Duolingo Max](https://blog.duolingo.com/duolingo-max)
- [How we learn how you learn (HLR)](https://blog.duolingo.com/how-we-learn-how-you-learn)
- [Hi, it's Duo: the AI behind the meme](https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/)
- [Revisiting Half-Life Regression (PMLR)](https://proceedings.mlr.press/v339/ilidio26a.html)
- [Reliable generative AI scaffolding, arXiv 2508.05929](https://arxiv.org/pdf/2508.05929)
- [Hallucination mitigation in CALL](https://geosurge.ai/corpus/gen-4149/intelligent-computer-assisted-language-learning/hallucination-mitigation-in-call.html)
- [FSRS overview](https://concepts.dsebastien.net/concept/fsrs/)

## Unresolved
- Real AI features of Speak, Busuu, Hello Chinese, HelloTalk, Memrise, Lingodeer, ChinesePod, Pleco, Squirrel AI (not verified).
- Current Gemini free-tier limits (check AI Studio).
- Whether speech recognition (zh-CN) works in the installed iPhone PWA.
