# Research: Duolingo-style UI/UX for C&B Chinese

## Decision Summary
Your app already has most of the Duolingo "chrome": streak/XP/heart chips, a mascot (orange coin) with moods, levels, daily goal ring, streak freezes, confetti/XP pops, a bottom tab bar and reduced-motion support. What it lacks is the thing people recognise most: **a vertical learning path** (Learn is a grid of day cards), plus a polished **lesson flow** (top progress bar, bottom check bar, green/red feedback sheet) and **daily quests**.
Recommendation: build (1) a path view for Learn with a grid toggle, (2) a lesson-flow polish pass, (3) 3 daily quests plus a weekly self-challenge instead of leagues. Keep your own mascot, colours and type; do not copy Duolingo's character, green, Feather font or exact layout.

## Methodology
5 searches (path design, gamification results, brand/IP, PWA animation/performance, gamification research) + 6 page fetches + screenshots of your current Home and Learn. Date range 2022-2026. Some fetches failed (one study returned binary; the brand-assets page redirected; the PWA animation search returned only low-quality pages), so those areas rely on reasoning and are marked unverified.

## Findings
### What Duolingo did (first-party / secondary)
- **Path replaced the skill tree (Nov 2022).** Reason given: spacing and mixing new content with review beats finishing one skill at a time; stories were placed into the path. Duolingo published no outcome metrics in that post. ([Duolingo blog](https://blog.duolingo.com/new-duolingo-home-screen-design))
- **Criticism of the path:** it removed learner choice, forced a linear order for non-linear learning, kept a separate practice tab, and tilted toward gamification over showing real progress. Lesson: simpler look is not simpler use. ([UX Collective](https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c))
- **Gamification numbers (secondary source, not Duolingo's own paper):** leaderboards credited with +17% learning time; share of DAU with 7+ day streak up almost 3x; current-user retention +21% and daily churn down over 40%, within a 450% DAU growth over four years. ([Growth model write-up](https://marishalakhiani.substack.com/p/breaking-down-duolingos-growth-model))

### Legal / IP
- Duolingo states its software, branding, images and mascot are protected by copyright, trademark and trade dress. ([WIPO Magazine](https://www.wipo.int/wipo_magazine/en/ip-at-work/2022/duolingo.html)) The general idea of a path, streaks and XP is a mechanic, not protected expression; the owl, its exact green, the Feather typeface and a near copy of the screens are. I am not a lawyer; this is a private app for one or two users, so the risk is small, but avoid a lookalike.

### Evidence on gamification (weak here)
- The language-learning gamification study I tried to read was unreadable (binary page), so I cannot cite findings on streak anxiety or hearts. Treat as **unresolved**. Your learner has a fixed exam goal and 1-2 users: streak pressure helps a habit but can hurt on bad days; keep freezes and a "rest day" option.

### Performance (reasoning, unverified by sources)
- Prefer CSS transforms/opacity and a few SVGs over a Lottie runtime (extra JS, offline caching). Your build already honours `prefers-reduced-motion`. Check iPhone haptics separately: web vibration support on iOS Safari is unverified here.

## Recommendation
### Quick Start (order)
1. **Learn path.** Vertical winding path of round nodes: one node per day, review days as a "chest" node, a unit banner per 5-day week ("Week 7 · Hard conversations") with the section title, a floating "START" bubble on the next lesson, completed = gold check, suggested next highlighted, **nothing locked** (tap any node). Toggle "Path / Grid" so learners who want choice keep it. Parts 1/2/3 as section banners. Reuse existing data; no new content.
2. **Lesson flow polish.** Slim progress bar at the top with a close (X) button; bottom check bar that turns green/red with a short explanation and a Continue button; combo/streak chip inside a lesson; end screen with XP, accuracy, and new words.
3. **Quests.** 3 daily quests (e.g. "10 minutes", "5 new words", "1 listening drill") with a chest at the end, plus a weekly self-challenge ("beat last week's XP"). Skip leagues: one learner has no one to compete with.
4. **Home.** Replace the tall stat cards with a compact row and put "Continue" (next node) first; keep the install hint small.
5. **Mascot and tone.** Keep the orange coin; add 2-3 more poses (celebrate, think, sleepy) and use them on result and empty screens; warm, short encouragement lines in Vietnamese and English.
6. **Onboarding.** One 3-step screen (exam date, daily goal, level), then straight to the path.

### Pitfalls to Avoid
- Do not lock lessons or force order; keep Grid and "Today's session".
- Do not copy Duo, the Duolingo green, the Feather font or layout pixel-for-pixel.
- No guilt notifications; keep streak freeze and a rest day.
- Keep touch targets 44 px+, contrast AA, reduced-motion on, and test text size M/L.

## References
- [Duolingo: new home screen design](https://blog.duolingo.com/new-duolingo-home-screen-design)
- [UX Collective: down the wrong path](https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c)
- [Duolingo growth model](https://marishalakhiani.substack.com/p/breaking-down-duolingos-growth-model)
- [WIPO Magazine: Duolingo IP](https://www.wipo.int/wipo_magazine/en/ip-at-work/2022/duolingo.html)

## Unresolved
- Research on streak anxiety and hearts in language apps (study unreadable).
- iOS PWA haptics and animation benchmarks.
- Exact Duolingo brand-use rules (assets page redirected).
