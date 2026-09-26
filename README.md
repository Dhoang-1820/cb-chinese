# C&B Chinese · HSK 4 (iPhone-first)

30-day Compensation & Benefits Chinese course (240 words) as a colourful, installable web app.
Built for **iPhone 14 + Chrome**, works offline after the first visit.

## Deploy free on GitHub Pages (≈5 min)
1. Create a new GitHub repo (public), upload this whole folder (keep `.github/`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Push / re-run **Actions → Deploy**. The workflow:
   - validates the content (`tools/validate.js`),
   - generates all audio with **edge-tts** (free Microsoft neural voices: Xiaoxiao ♀, Yunxi ♂),
   - publishes to `https://<user>.github.io/<repo>/`.
   Audio is cached between runs; only changed sentences are regenerated.

## Install on iPhone (Chrome)
Open the site → **Share (⬆) → Add to Home Screen**. Then in the app: **Me → Download all audio** to study fully offline.
Tip: iOS may clear data of sites unused for weeks — use **Me → Export** now and then.

## Features
- **Learn**: 30 days (review days 5/10/15/20/25/30) — words (vi + en), chat-style dialogue with audio, grammar, practice (matching, tap-to-fill, translation), 10-question quiz.
- **Review**: flashcards with swipe (→ know / ← again), Leitner SRS (1/2/4/8/16 days).
- **Games**: Sentence Builder, Listen & Pick, Speed Match (60 s), Pinyin Race (90 s), Boss Battle (review days), Quick Quiz. Daily challenge +15 XP.
- **Motivation**: XP & 8 levels, streak + streak freezes (1 per 7 days, max 2), 18 badges, daily XP goal ring, 12-week heatmap, HSK exam countdown.
- Search, pinyin toggle, vi/en/both, dark mode, sound effects, voice speed, export/import JSON.

## Run locally
```bash
python3 -m http.server 8000      # open http://localhost:8000
# optional: local audio
pip install edge-tts
node tools/collect_texts.js && python3 tools/gen_audio.py
```
Opening `index.html` directly (file://) also works, minus offline caching.

## Structure
```
index.html  sw.js  manifest.webmanifest  icons/
css/style.css
js/storage.js  srs.js  audio.js  gamify.js  games.js  app.js
data/day01.js … day30.js, manifest.js
audio/manifest.js (+ mp3s generated in CI)
tools/validate.js  collect_texts.js  gen_audio.py
.github/workflows/deploy.yml
```

## Editing content
Edit `data/dayNN.js`, then `node tools/validate.js` (must show "No errors"). Push → audio updates automatically.

## Notes
- edge-tts is an unofficial free API; if it ever breaks, the app still works (audio buttons show a notice).
- iOS doesn't support vibration, so there are no haptics.
