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
- **Report a problem**: the ⚑ button in the top bar saves a note with the screen's route and a snippet of what was on screen; review, copy or delete them in Me → Problem reports.
- **Mock exams**: 4 original tests in the real HSK 4 format. Mocks 1–3 are shortened (~30 min); mock 4 is full length (listening 45, reading 40, writing 15 questions, ~95 min, with sentence-ordering and dialogue items). Practice mode (instant feedback) or exam mode (timed per section). Scored /300, pass 180. Links to Study4 and official sample papers.
- **HSK 4 grammar checklist** (Learn → Grammar): 25 grammar points (把/被, 连…都, 不管…都, complements, 是…的, comparisons…) — pattern, vi/en explanation, 2 examples with audio, 5 practice questions each. Mastered at 5/5, or 4/5 twice; wrong answers go to the mistake notebook.
- **Official practice log + score forecast** (Me → Official practice): log section scores from official HSK 2.0 papers (e.g. the book 《HSK真题集 四级》). The forecast blends official papers (weighted most) with recent in-app mocks and shows an estimate, a likely range, pass verdict and the weakest section — on Home, Progress and the log page.
- **Mistake notebook**: wrong answers from quizzes, games, drills and mock exams are collected automatically; each clears after 2 right answers in a row. Targeted drills per skill.
- **Weak-area report**: accuracy per skill (13 skills: word meaning, pinyin, listening types, connectors, word order, reading passages, handwriting…), with tips and a "Practice" button. Shown after each mock exam too.
- **Games**: Sentence Builder, Listen & Pick, Speed Match (60 s), Pinyin Race (90 s), Boss Battle (review days), Quick Quiz, Type the Sentence, Listening Drill (reveal after listening; **speed ladder**: 4 understood in a row raises the speed 0.9× → 1× → 1.15× → 1.3×, 2 misses lower it), Stroke Writing (stroke-order animation + tracing). Daily challenge +15 XP.
- **Exam-format drills** (Learn → Games): **Confusable words** (60), **Sentence order** (40, the ABC ordering format), **Picture writing** (40 prompts with automatic checks — uses the word, length, punctuation — then model sentences to self-grade) and **Measure words** (40). Wrong answers go to the mistake notebook.
- **Study plan**: today's checklist on Home, ahead/on-track/behind status, pace needed per track and a week-by-week plan to the exam date, plus a Part 2 timeline. **Final 2 weeks mode**: the last 14 days switch to mock exams (including full-length mock 4), mistakes, your weakest skill and the next grammar point. If the exam date has passed, the plan moves on to Part 2.
- **Weekly report** (Home teaser, Progress): active days, XP, new words, cards reviewed, mocks, forecast change and the weakest skill for the week, with last week kept for comparison (Monday to Sunday).
- **Progress charts**: mock scores vs the 180 pass line, section trends, words in review, daily XP.
- **Tap any word** in a dialogue or reading passage for pinyin, meaning, audio and "Add to review".
- **Motivation**: XP & 8 levels, streak + streak freezes (1 per 7 days, max 2), 19 badges, daily XP goal ring, 12-week heatmap, HSK exam countdown.
- **Optional AI assistant** (off until you set it up): *Get AI feedback* on picture-writing sentences (score /5, corrections, model sentence) *Explain with AI* after a wrong answer, *Ask AI* on any tapped word (preset or your own question), the **Paragraph Coach** game (write 2–4 sentences, get corrections and recurring-mistake tracking) and a weekly **AI coach** on Progress that turns your numbers into 3 actions. Answers are in English and Vietnamese. It runs through one shared free Supabase Edge Function that holds the Gemini key, so users enter nothing — see [supabase/SETUP.md](supabase/SETUP.md). The app works fully offline without it.
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
js/storage.js  srs.js  audio.js  gamify.js  learn.js  ai.js  games.js  app.js
supabase/  setup.sql, SETUP.md, functions/ai/index.ts (Edge Function)
data/day01.js … day60.js, manifest.js, core01–25.js, found.js (HSK 1–3), core-manifest.js, grammar.js, drills.js, mock1–4.js, mock-manifest.js
fonts/ Nunito subsets (SIL OFL 1.1, from @fontsource-variable/nunito) · icons/icon-64.png for the top bar
vendor/hanzi-writer.min.js (MIT) + vendor/hanzi/*.json stroke data (Arphic PL — see vendor/README.md)
audio/manifest.js (+ mp3s generated in CI)
tools/validate.js  collect_texts.js  gen_audio.py  build.js  ai_function_test.mjs  ai_golden.js + ai_golden_cases.json
lighthouserc.json
.github/workflows/deploy.yml
```

## Editing content
Edit `data/dayNN.js`, `data/mockN.js` or `data/drills.js`, then `node tools/validate.js` (must show "No errors"). Push → audio updates automatically.
Adding words with new characters? Copy their stroke files from the `hanzi-writer-data` npm package into `vendor/hanzi/`.

## Notes
- edge-tts is an unofficial free API; if it ever breaks, the app still works (audio buttons show a notice).
- iOS doesn't support vibration, so there are no haptics.
