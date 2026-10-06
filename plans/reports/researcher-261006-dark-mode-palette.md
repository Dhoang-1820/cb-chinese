# Research: Dark mode palette for C&B Chinese (eye comfort)

## Decision Summary
Replace the saturated purple dark theme (#15112a, text #f2eeff, 16:1) with a soft violet-grey: background #17161f, cards #1f1e29, raised #2a2936, body text #dcdbe8 (13:1), muted #a3a1b8 (7:1). Keep brand violet but desaturate it for fills and use a lighter violet (#a897ff) for links and active text. No pure black or white anywhere. Coloured cards (coral, teal, sun, blue) are darker and calmer so large colour blocks do not glare in a dark room.

## Methodology
Sources read: UX Planet "8 Tips for Dark Theme Design", Uxcel "12 Principles of Dark Mode Design", a11ywithdiana on black/white combinations, Open Design page on Duolingo tokens, GitHub Primer changelog on theme contrast (title only, page not read). 5 searches/fetches. Date: Oct 2026.

## Findings
- Avoid pure black (#000) and pure white text: very bright text on very dark ground "glows" (halation), worse for astigmatism, small text, dim rooms and long sessions (a11ywithdiana, Uxcel).
- Material guidance used by many apps: ~#121212 surface; text at ~87% / 60% / 38% emphasis; desaturate colours; raise elevation by making surfaces lighter, not by shadow (UX Planet, Uxcel).
- Safe soft pairs named in the sources: #EAEAEA on #121212, #F1F1F1 on #1E1E1E.
- Do not simply invert the light theme; keep strong brand colour only on small, prominent elements (Uxcel).
- Duolingo's published tokens (open-design.ai) are light only: no dark values to copy. We keep our own palette.
- Contrast: 4.5:1 is the minimum for body text; 15.8:1 is what white-on-#121212 gives, which is more than needed. We target about 12 to 13:1 for body text.

## Final tokens (dark)
| Role | Value | Contrast |
|---|---|---|
| Background | #17161f | |
| Card / raised | #1f1e29 / #2a2936 | |
| Body text | #dcdbe8 | 13.1 / 12.0 / 10.4 on bg / card / raised |
| Muted text | #a3a1b8 | 7.1 / 6.5 / 5.7 |
| Link and active text | #a897ff | 7.3 |
| Good / bad text | #3cc48c / #ff7a8a | 8.1 / 7.2 |
| Fills with white text | violet #775ceb, coral #b9504f, teal #108173, sun #a16914, blue #2f6fd6, boss #2a2250 | 4.6 to 14.6 |

## Trade-offs
- Lower contrast than before (16:1 to 13:1) is deliberate and still far above AA/AAA minimums.
- Darker coloured cards look less "Duolingo bright" at night. Light theme is unchanged.
- Warm/blue-light shifting is left to the phone (Night Shift / True Tone), not the app.

## Unresolved
- No controlled study was found that gives an exact "best" contrast number; values above come from design guidance, not clinical trials.
- Needs a real-device check in a dark room on an OLED iPhone.

## References
- https://uxplanet.org/8-tips-for-dark-theme-design-8dfc2f8f7ab6
- https://uxcel.com/blog/12-principles-of-dark-mode-design-627
- https://a11ywithdiana.substack.com/p/and
- https://open-design.ai/systems/duolingo/
- https://github.blog/changelog/2023-03-28-light-and-dark-theme-color-contrast-improvements/
