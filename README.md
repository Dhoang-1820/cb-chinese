# C&B Chinese · HSK 4 (iPhone-first)

60-day Compensation & Benefits Chinese course (480 words, plus 1,093 HSK 1–4 words) as a colourful, installable web app.
Built for **iPhone 14 + Chrome**, works offline after the first visit.

## Deploy free on GitHub Pages (≈5 min)
1. Create a new GitHub repo (public), upload this whole folder (keep `.github/`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Push / re-run **Actions → Deploy**. The workflow:
   - validates the content (`tools/validate.js`),
   - generates all audio with **edge-tts** (free Microsoft neural voices: Xiaoxiao ♀, Yunxi ♂),
   - re-encodes new audio once to 32 kbps mono MP3 with ffmpeg (~⅓ smaller; tracked in `audio/.shrunk`),
   - builds the site with `tools/build.js` (esbuild): one minified app bundle, a light start-up data file, lesson details and mock exams loaded lazily, hashed file names,
   - publishes to `https://<user>.github.io/<repo>/`,
   - runs **Lighthouse CI** on the live site (informational; scores and a report link are in the "lighthouse" job log).
   Audio is cached between runs; only changed sentences are regenerated.

## Install on iPhone (Chrome)
Open the site → **Share (⬆) → Add to Home Screen**. Then in the app: **Me → Download audio + stroke data** to study fully offline.
Tip: iOS may clear data of sites unused for weeks — use **Me → Export** now and then.

## Features
- **Learn**: 60 days in two parts. Part 1 (days 1–30, review days 5/10/15/20/25/30) is planned to finish before your exam. Part 2 (days 31–60, "Beyond HSK 4" advanced C&B; review days 35/40/45/50/55/60) is paced over the 6 weeks after the exam, and you can start it earlier. Each day has — words (vi + en), chat-style dialogue with audio, grammar, practice (matching with 5 pairs at a time, a decoy meaning and reshuffling after every match; tap-to-fill; translation), 10-question quiz.
- **Review**: flashcards with swipe (→ know / ← again), Leitner SRS (1/2/4/8/16 days). Smarter scheduling: words with 2+ lapses come back at half the interval; a slip on a box 4–5 word drops it to box 2; mistakes in games bring a word back today.
- **Today's session**: one tap on Home runs in order — due reviews, new words, mistakes, typed sentences, listening sentences — then a summary (+10 XP once a day). Choose the length in Me → Today's session length: Quick (~7 min), Standard (~15 min) or Long (~30 min). **2-minute rescue**: after 18:00, if your streak is running and you haven't studied, Home offers five cards and a short listening step to keep the streak alive (it doesn't count as Today's session).
- **Your 3 focus actions** (Home, and after every mock): your weakest skill, the weakest skill from a different exam section, and the next exam-prep step (a mock exam when one is due, otherwise due reviews, mistakes, grammar or the session).
- **Hands-free listen mode** (Review tab): each word plays twice, then its example, and moves on by itself; keeps the screen awake; headphone/lock-screen controls.
- **My words** (Learn → My words): add your own work vocabulary; it joins flashcards, review, games and search (no recording for own words).
- **Study reminder** (Me): a daily calendar event until the exam — .ics for iPhone Calendar or a Google Calendar link.
- **Cloud backup** (Me): private GitHub Gist backup/restore with a fine-grained token (Gists read/write). The token stays on the device; automatic backup pauses after connecting to an existing backup until you restore or back up explicitly.
- **Comfort**: first-run guide (Me → App guide), "Leave now?" prompt mid-activity, text size setting, loading placeholders.
- **HSK 4 Core**: 505 general HSK 2.0 level-4 words (the rest of the official list is already in the C&B lessons), in 25 sets of ~20 — each with vi/en meanings, an original example sentence, audio, flashcards, set quiz and stroke writing. Word list: official HSK 2.0 syllabus; meanings and examples written for this app.
- **HSK 1–3 Foundation** (Learn → HSK words → Foundation): 588 HSK 1–3 words in 30 sets (shown as F1–F30) with the same flashcards, quiz and writing as the Core sets. **Quick check** (#/check/N) lets you mark sets you already know (goes to review box 4, due in 8 days) and learn only the rest (box 1).
- **Type the Sentence**: practice for the computer-based HSK writing section — type full sentences with the iPhone pinyin keyboard, see a character-by-character diff, plus free sentences with a given word.
- **Exam simulator** (mock intro → 🎯): exam mode plus the pressure of the real thing — a pre-flight screen, no pause, leaving (including swipe-back) ends the attempt, the tab bar is hidden, and each recording plays once. Results are tagged "Exam simulator".
- **Listening conditions** (Me → Settings): optional background noise (light café / busy room) while recordings play in the Listening Drill and mock listening, and a mock listening speed (same as voice speed, 1×, 1.15×, 1.3×).
- **Admin** (Me → Content review, needs ADMIN_CODE): proposed fixes, learners with a cloud backup (now with an HSK 5 line), and a **Service** block: AI calls today against the daily cap, the last 14 days, phones with a backup against the limit, how many did not save for 3+ days, and content reports waiting (server task `admin_stats`; with an older server the block is not shown).
- **Report a problem**: the ⚑ button in the top bar saves a note with the screen's route and a snippet of what was on screen; review, copy or delete them in Me → Problem reports.
- **Mock exams**: 4 original tests in the real HSK 4 format. Mocks 1–3 are shortened (~30 min); mock 4 is full length (listening 45, reading 40, writing 15 questions, ~95 min, with sentence-ordering and dialogue items). Practice mode (instant feedback) or exam mode (timed per section). Scored /300, pass 180. Links to Study4 and official sample papers.
- **HSK 4 grammar checklist** (Learn → Grammar): 70 grammar points, 350 questions (把/被, 连…都, 不管…都, complements, 是…的, comparisons…), with a filter (text, To do, Mastered) — pattern, vi/en explanation, 2 examples with audio, 5 practice questions each. Mastered at 5/5, or 4/5 twice; wrong answers go to the mistake notebook.
- **Official practice log + score forecast** (Me → Official practice): log section scores from official HSK 2.0 papers (e.g. the book 《HSK真题集 四级》). The forecast blends official papers (weighted most) with recent in-app mocks and shows an estimate, a likely range, pass verdict and the weakest section — on Home, Progress and the log page.
- **Mistake notebook**: wrong answers from quizzes, games, drills and mock exams are collected automatically; each clears after 2 right answers in a row. Targeted drills per skill.
- **Weak-area report**: accuracy per skill (13 skills: word meaning, pinyin, listening types, connectors, word order, reading passages, handwriting…), with tips and a "Practice" button. Shown after each mock exam too.
- **Games**: Sentence Builder, Listen & Pick, Speed Match (60 s), Pinyin Race (90 s), Boss Battle (review days), Quick Quiz, Type the Sentence, Listening Drill (reveal after listening; **speed ladder**: 4 understood in a row raises the speed 0.9× → 1× → 1.15× → 1.3×, 2 misses lower it), Stroke Writing (stroke-order animation + tracing). Daily challenge +15 XP.
- **Exam-format drills** (Games): **Confusable words** (171), **Sentence order** (124, the ABC ordering format), **Picture writing** (104 prompts with automatic checks — uses the word, length, punctuation — then model sentences to self-grade), **Measure words** (110), **Word Bank** (8 groups of six words and five gaps, reading part 1) and **Arrange the Words** (54 sentences, writing part 1; other correct orders are accepted). Wrong answers go to the mistake notebook.
- **HSK 5** (Learn → the **HSK 4 | HSK 5** switch at the top; the choice is remembered): **Words** — 1,231 words in 62 packs (the HSK 2.0 level-5 list without the words the app already teaches), each pack with word cards, flashcards, a 10-question quiz and "Add to review" (the same review deck, search, Reader and hands-free listening as every other word); **Grammar** — 42 points, 210 questions; **Practice** — the four drill games on HSK 5 sets (confusable 96, sentence order 110, picture writing 52, measure words 50), with scores kept apart from HSK 4. HSK 5 content is new and **not yet checked by a teacher** (the app says so; every card and question has a report link). There is no HSK 5 mock exam. HSK 5 XP counts for the streak and the daily goal, but HSK 5 answers are tracked as their own skills and never change the HSK 4 readiness estimate, forecast, plan, tips or weekly report. The data (about 250 KB compressed) is downloaded the first time HSK 5 is opened and then works offline.
- **Extra HSK 4 words** (Learn → HSK words): 91 official HSK 1–4 words that no lesson or set teaches, in 5 packs; **Common phrases** (163 words × 3) and **opposites** (65 pairs) appear on the word cards and in the word sheet; **Word families** (61 characters) has its own screen, also linked from Search. Loaded on demand (about 60 KB compressed), not yet checked by a teacher.
- **Study plan**: today's checklist on Home, ahead/on-track/behind status, pace needed per track and a week-by-week plan to the exam date, plus a Part 2 timeline. **Final 2 weeks mode**: the last 14 days switch to mock exams (including full-length mock 4), mistakes, your weakest skill and the next grammar point. If the exam date has passed, the plan moves on to Part 2.
- **Weekly report** (Home teaser, Progress): active days, XP, new words, cards reviewed, mocks, forecast change and the weakest skill for the week, with last week kept for comparison (Monday to Sunday).
- **Progress charts**: mock scores vs the 180 pass line, section trends, words in review, daily XP.
- **Tap any word** in a dialogue or reading passage for pinyin, meaning, audio and "Add to review".
- **Motivation**: XP & 8 levels, streak + streak freezes (1 per 7 days, max 2), 19 badges, daily XP goal ring, 12-week heatmap, HSK exam countdown.
- **Optional AI assistant** (off until you set it up): *Get AI feedback* on picture-writing sentences (score /5, corrections, model sentence) *Explain with AI* after a wrong answer, *Ask AI* on any tapped word (preset or your own question), the **Paragraph Coach** game (write 2–4 sentences, get corrections and recurring-mistake tracking) and a weekly **AI coach** on Progress that turns your numbers into 3 actions. Answers are in English and Vietnamese. **Content feedback loop:** ⚑ reports on a drill, grammar quiz, mock question or word are checked twice by the AI; agreed fixes appear in **Me → Content review** where a person accepts, edits or rejects them (see SETUP.md). It runs through one shared free Supabase Edge Function that holds the Gemini key, so users enter nothing — see [supabase/SETUP.md](supabase/SETUP.md). The app works fully offline without it.
- Search, pinyin toggle, vi/en/both, dark mode, sound effects, voice speed, export/import JSON.

## Run locally
```bash
python3 -m http.server 8000      # open http://localhost:8000
# optional: local audio
pip install edge-tts
node tools/collect_texts.js && python3 tools/gen_audio.py
```
Opening `index.html` directly (file://) also works, minus offline caching.

Test the production build locally:
```bash
npm i --no-save esbuild && node tools/build.js _site && python3 -m http.server 8000 -d _site
```

## Structure
```
index.html  sw.js  manifest.webmanifest  icons/
css/style.css
js/storage.js  srs.js  audio.js  gamify.js  learn.js  ai.js  content.js  games.js  app.js
supabase/  setup.sql, SETUP.md, functions/ai/index.ts (Edge Function)
data/day01.js … day90.js, manifest.js, core01–25.js, found.js (HSK 1–3), core-manifest.js, grammar.js, drills.js, drills_extra.js, mock1–6.js, mock-manifest.js, track_w*.js
data/hsk5/   words01–62.js, grammar.js, drills.js (+ README.md, GRAMMAR.md, DRILLS.md)   loaded on demand, one built file
data/hsk4x/  missing01–05.js, extra_collocations01–04.js, extra_families.js, extra_opposites.js, manifest.js   loaded on demand, one built file
fonts/ Nunito subsets (SIL OFL 1.1, from @fontsource-variable/nunito) · icons/icon-64.png for the top bar
vendor/hanzi-writer.min.js (MIT) + vendor/hanzi/*.json stroke data (Arphic PL — see vendor/README.md)
vendor/dict/cedict.v1.js     Reader dictionary, trimmed from CC-CEDICT (CC BY-SA 4.0 — see vendor/README.md); optional download in the app
audio/manifest.js (+ mp3s generated in CI)
tools/validate.js (runs validate_grammar / _drills / _hsk5 / _hsk5_drills / _hsk4x too)  collect_texts.js  gen_audio.py  build.js
tools/ai_function_test.mjs  sw_packs_test.mjs  hsk_watch*.mjs  ai_golden.js + ai_golden_cases.json  hsk5/ (HSK 5 word generator)
lighthouserc.json
.github/workflows/deploy.yml
```

## Editing content
Edit `data/dayNN.js`, `data/mockN.js`, `data/drills.js`, `data/grammar.js` or a file in `data/hsk5/` / `data/hsk4x/`, then `node tools/validate.js` (must show "No errors"; it also runs the validators of the newer content). Push → audio updates automatically.
Ids are never renumbered: they are progress keys (`h5-0001`, `h5g01`, `h5c001`, `x4-0001`, `wo01`, `bk01`). HSK 5 words stay 20 to a pack in id order.

## Audio
`tools/collect_texts.js` lists what gets a recording (it prints the counts). For the HSK 4 course that is everything with a play button: 8,114 clips, 215 of them new with the larger grammar list and picture-writing set.
The optional packs are recorded by cost: HSK 5 headwords (1,151 new clips), HSK 5 grammar examples (84), HSK 5 picture-writing models (104) and the 91 extra HSK 4 words with phrase and example (211) — 1,550 clips.
Left out for now: HSK 5 example sentences (1,223), the extra "common phrases" (413) and the opposites' examples (127); `node tools/collect_texts.js --all` adds them. Where a text has no clip the app leaves the play button out.
Clips of the optional packs are marked `"opt": true` and never fail the build in `tools/gen_audio.py`.
Adding words with new characters? Copy their stroke files from the `hanzi-writer-data` npm package into `vendor/hanzi/`.

## Notes
- edge-tts is an unofficial free API; if it ever breaks, the app still works (audio buttons show a notice).
- iOS doesn't support vibration, so there are no haptics.

## Days 61–90, mocks 5–6 and the 6-month track
- **Part 3 · Exam year (days 61–90):** recruitment, Vietnam vs China terms, pay analytics, hard conversations, total rewards, HSK 4 skills week. Same format as days 1–60.
- **Mock exams 5 and 6:** two more full-length HSK 4 (2.0) mocks.
- **Learn → 🎓 C&B Professional Chinese:** 24 weeks x 3 sessions, mixed in and never locked: writing templates, role-plays, Vietnam vs China cards, HSK 5 reading. Data: `data/track_w*.js`; with AI on, writing and role-play replies can be checked.
- `docs/legal-review.md` lists every legal or policy statement for a Vietnamese reviewer.

## Tests

`tests/run.sh` runs everything: the content validators, the HSK page-watch tests, the AI service tests (a fake Gemini, so no
key is needed), the service-worker pack tests and browser tests on a simulated iPhone 14 against a built copy of the site. The deploy workflow runs it and stops the deploy on a failure.

```
npm install --no-save esbuild
pip install playwright && python -m playwright install chromium
tests/run.sh              # everything, about 10 minutes
tests/run.sh reader a11y  # only these browser-test groups
```

Needs Node 22.18 or newer. Browser-test groups are listed at the bottom of `tests/e2e.py`.
