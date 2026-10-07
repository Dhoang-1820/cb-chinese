# HSK 5 drills (data/hsk5/drills.js)

Global: `window.CB_HSK5_DRILLS`. Played by the four drill games at Learn → HSK 5 → Practice (`#/game/<set>/h5`). All sentences are original.
`checked: false` means the content is machine-written and has not been reviewed by a human teacher.

```js
window.CB_HSK5_DRILLS = {
  level: "HSK5", checked: false,
  confuse: [...],   // 96 items, ids h5c001..h5c096
  order:   [...],   // 110 items, ids h5o001..h5o110
  picture: [...],   // 52 items, ids h5p001..h5p052
  measure: [...]    // 50 items, ids h5m001..h5m050
};
```

Validate with `node tools/validate_hsk5_drills.js` (exit 1 on any error).

## Shapes (identical to window.CB_DRILLS, so js/games.js needs no new renderer)

| Set | Shape |
| --- | --- |
| confuse | `{ id, words: [2-3 options], q: "...____...", answer: "<one of words>", explain: { vi, en } }` |
| order | `{ id, parts: { A, B, C }, answer: "BCA", vi, en, clue: { vi, en } }` plus two extra keys, `zh` and `chunks` (below) |
| picture | `{ id, emoji, scene: { vi, en }, word, samples: [{ zh, py, vi, en }, { ... }] }` |
| measure | `{ id, q: "...一____...", options: [4], answer: <index 0-3>, explain: { vi, en } }` |

Ids: `h5c` / `h5o` / `h5p` / `h5m` + three digits. With the app's `drill:` prefix they fit the problem-report
pattern and cannot collide with the HSK 4 ids (`c01`, `o01`, `p01`, `m01`); the validator checks both.

## Differences from the HSK 4 set the integrator should know

- **order**: HSK 4 items are three clauses of a short passage (HSK 4 reading part 2). HSK 5 items are ONE sentence
  cut into three word groups (HSK 5 writing part 1), so `parts` carry no punctuation. The existing game rebuilds
  the answer by joining the parts, which shows the sentence without its final full stop; show `zh` instead if that
  matters. `zh` is the full sentence with punctuation. `chunks` is the same sentence cut into 4 to 7 smaller
  pieces (the A/B/C cuts always fall on chunk boundaries), ready for a tap-the-tiles game closer to the real exam.
  The six answer keys are evenly spread.
- **confuse**: some groups have three options (HSK 4 always has two); the game already maps over `words`.
- **measure**: the gap sits inside a full sentence rather than a bare "一____N" phrase. Answer positions are balanced.
- **picture**: one target word per prompt, as in HSK 4. Pinyin follows the HSK 4 style (tone marks, words joined,
  capital first letter, Western punctuation).

## Possible later additions (not in the data yet)

The validator already accepts two optional keys, each needing at least 40 items if present:

- `gapfill` (HSK 5 reading part 1): `{ id: "h5g001", text: "...[1]...[2]...[3]...", gaps: [{ options: [4], answer: <index>, explain: { vi, en } }], vi, en }`;
  the filled passage must be 60 to 100 characters.
- `essay` (HSK 5 writing part 2, first task): `{ id: "h5e001", words: [5 words], topic: { vi, en }, model: "<70-100 character answer using all five>", vi, en }`.
  This is also how a five-word essay prompt can be added without changing the one-word `picture` shape. A picture
  essay (second task) could reuse `picture` items with a longer `model` field.

Check the validator source for the exact field checks before writing these sets.
