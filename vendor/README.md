# Third-party files

- `hanzi-writer.min.js` — Hanzi Writer 3.7.3 by David Chanin, MIT licence (see `HANZI-WRITER-LICENSE.txt`). https://hanziwriter.org
- `hanzi/*.json` — stroke data from `hanzi-writer-data` 2.0.1 (derived from Make Me a Hanzi / Arphic fonts), copied verbatim for every character used in this course. Licensed under the Arphic Public License — see `hanzi/ARPHICPL.TXT`, which must stay with these files.

## dict/cedict.v1.js — Reader dictionary

A trimmed copy of **CC-CEDICT** (https://www.mdbg.net/chinese/dictionary?page=cc-cedict), Chinese → English,
taken from the `cedict-json` npm package (December 2025 edition).

- Licence: **Creative Commons Attribution-ShareAlike 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).
  This file is a derivative work and stays under the same licence. The app shows the credit under the Reader text.
- What was changed: simplified words up to 5 characters only; surnames, variants and archaic/dialect/slang-only
  entries removed; proper nouns kept only when 2–3 characters; at most 3 meanings per reading and 2 readings per word.
- Rebuild: `npm i cedict-json` in any folder, then `node tools/build_dict.js <path>/cedict.json`.
  When the content changes, save it under a new name (`cedict.v2.js`) and update `DICT_URL` in `js/app.js`,
  because the service worker keeps this file cache-first.
- The app does not load it at start-up. A learner downloads it once from the Reader (about 2 MB compressed).
