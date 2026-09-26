# C&B Chinese · HSK 4 (iPhone-first)

30-day Compensation & Benefits Chinese course (240 words) as a colourful, installable web app.
Built for **iPhone 14 + Chrome**, works offline after the first visit.

## Deploy free on GitHub Pages (≈5 min)
1. Create a new GitHub repo (public), upload this whole folder (keep `.github/`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Push / re-run **Actions → Deploy**. The workflow:
   - validates the content (`tools/validate.js`),
   - generates all audio with **edge-tts** (free Microsoft neural voices: Xiaoxiao ♀, Yunxi ♂),
   - builds the site with `tools/build.js` (esbuild): one minified app bundle, a light start-up data file, lesson details and mock exams loaded lazily, hashed file names,
   - publishes to `https://<user>.github.io/<repo>/`,
   - runs **Lighthouse CI** on the live site (informational; scores and a report link are in the "lighthouse" job log).
   Audio is cached between runs; only changed sentences are regenerated.

## Install on iPhone (Chrome)
Open the site → **Share (⬆) → Add to Home Screen**. Then in the app: **Me → Download audio + stroke data** to study fully offline.
Tip: iOS may clear data of sites unused for weeks — use **Me → Export** now and then.

## Features
- **Learn**: 30 days (review days 5/10/15/20/25/30) — words (vi + en), chat-style dialogue with audio, grammar, practice (matching, tap-to-fill, translation), 10-question quiz.
- **Review**: flashcards with swipe (→ know / ← again), Leitner SRS (1/2/4/8/16 days). Smarter scheduling: words with 2+ lapses come back at half the interval; a slip on a box 4–5 word drops it to box 2; mistakes in games bring a word back today.
- **Mock exams**: 3 original tests in the real HSK 4 format (listening, reading, writing), shortened to ~30 min. Practice mode (instant feedback) or exam mode (timed per section). Scored /300, pass 180. Links to Study4 and official sample papers.
- **Mistake notebook**: wrong answers from quizzes, games, drills and mock exams are collected automatically; each clears after 2 right answers in a row. Targeted drills per skill.
- **Weak-area report**: accuracy per skill (13 skills: word meaning, pinyin, listening types, connectors, word order, reading passages, handwriting…), with tips and a "Practice" button. Shown after each mock exam too.
- **Games**: Sentence Builder, Listen & Pick, Speed Match (60 s), Pinyin Race (90 s), Boss Battle (review days), Quick Quiz, Listening Drill (reveal after listening, 0.75× slow mode), Stroke Writing (stroke-order animation + tracing). Daily challenge +15 XP.
- **Study plan**: today's checklist on Home, ahead/on-track/behind status, pace needed and a week-by-week plan to the exam date (last 14 days kept for mocks and review).
- **Progress charts**: mock scores vs the 180 pass line, section trends, words in review, daily XP.
- **Tap any word** in a dialogue or reading passage for pinyin, meaning, audio and "Add to review".
- **Motivation**: XP & 8 levels, streak + streak freezes (1 per 7 days, max 2), 19 badges, daily XP goal ring, 12-week heatmap, HSK exam countdown.
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
js/storage.js  srs.js  audio.js  gamify.js  learn.js  games.js  app.js
data/day01.js … day30.js, manifest.js, mock1–3.js, mock-manifest.js
vendor/hanzi-writer.min.js (MIT) + vendor/hanzi/*.json stroke data (Arphic PL — see vendor/README.md)
audio/manifest.js (+ mp3s generated in CI)
tools/validate.js  collect_texts.js  gen_audio.py  build.js
lighthouserc.json
.github/workflows/deploy.yml
```

## Editing content
Edit `data/dayNN.js` or `data/mockN.js`, then `node tools/validate.js` (must show "No errors"). Push → audio updates automatically.
Adding words with new characters? Copy their stroke files from the `hanzi-writer-data` npm package into `vendor/hanzi/`.

## Notes
- edge-tts is an unofficial free API; if it ever breaks, the app still works (audio buttons show a notice).
- iOS doesn't support vibration, so there are no haptics.
