# HSK watch

A weekly check of the official HSK pages. When the text of a page changed since the last
check, you get a GitHub issue that says which page changed, with the changed lines and the link.

## What it does

Every Monday at 01:00 UTC (08:00 in Vietnam) the workflow `.github/workflows/hsk-watch.yml`:

1. downloads each page listed in `tools/hsk_watch_sources.json`;
2. reduces it to plain text (no scripts, styles or tags; link addresses are kept as `[...]`);
3. compares the text with the text saved by the previous check;
4. if something changed, opens an issue; then saves the new text for next time.

It makes no AI call and needs no key or secret. It uses only the token GitHub gives every workflow.

## Where results appear

- **Issues tab**: an issue titled like `HSK watch: 2 pages changed (2026-10-12)`, labelled
  `hsk-watch` and assigned to the repository owner. GitHub emails you about it. Each changed
  page has its own section: lines starting with `+` are new, `-` were removed (at most 40 lines per page).
- If an `hsk-watch` issue is still open, the new report is added to it as a **comment** instead
  of opening another issue. Close the issue once you have read it.
- **Actions tab > HSK watch > a run**: the summary table shows every source and its result
  (`baseline`, `unchanged`, `changed`, `failed`), and the log shows the details.
- **Branch `hsk-watch-state`**: the saved texts (`text/<id>.txt`) and `state.json`. You can read
  them to see exactly what the watch sees of a page. Do not merge this branch into `main`.

Nothing is reported on the first run (it only records a baseline), or when a new source is added,
or when a source's URL is edited.

A page that cannot be downloaded is not a change and does not fail the run. Only after 3
failed checks in a row is it listed once, under "Could not be reached".

## Run it by hand

On GitHub: Actions > HSK watch > Run workflow. Tick **Dry run** to only print what would be
reported: no issue is created and nothing is saved.

On your computer (Node 22 or newer, nothing to install):

```sh
node tools/hsk_watch.mjs --dry-run --state-dir /tmp/hsk-state --sources tools/hsk_watch_sources.json
node tools/hsk_watch.mjs --state-dir /tmp/hsk-state     # saves the texts in /tmp/hsk-state; run again later to see a diff
node tools/hsk_watch_test.mjs                           # tests, no network needed
```

Without `--github` the script never touches GitHub; it prints the report.

## Edit the sources

`tools/hsk_watch_sources.json` is a list of entries:

```json
{ "id": "cti-hsk4", "name": "shown in the issue", "url": "https://...", "why": "note for yourself", "verified": false }
```

- **Add a page**: copy an entry, give it a new `id` (lower-case letters, digits, `-`), set `url`.
  Its first check records a baseline.
- **Fix a URL**: change `url`. The next check records a new baseline for it (no false alert).
- **Stop watching**: delete the entry, or add `"enabled": false`.
- `verified` is only a note for you; set it to `true` when you have seen the source work in a real run.
- Optional keys: `"links": false` (ignore link addresses), `"minChars": 100` (smallest amount of
  text accepted, default 200; less counts as a failed download), `"ignore": ["regex", ...]`
  (lines matching any of these are dropped; use it for a line that changes every week).

Keep the list short. Editing this file on `main` starts a normal site deploy, like any other commit.

### The sources chosen

| id | Page | Why |
| --- | --- | --- |
| `cti-home` | chinesetest.cn home | links to the current test calendar and pinned announcement |
| `cti-hsk` | chinesetest.cn/HSK | HSK overview and the HSK 3.0 materials (syllabus, samples, demo) |
| `cti-hsk4` | chinesetest.cn/HSK/4 | level 4 format: questions, sections, duration, pass mark |
| `cti-news` | chinesetest.cn/news | news and notices list |
| `cti-calendar-2026` | chinesetest.cn/news/50278989 | 2026 test calendar; replace each year |
| `clec-home` | chinese.cn | Center for Language Education and Cooperation (formerly Hanban) |
| `moe-standards-2021` | moe.gov.cn | the national standard behind HSK 3.0 |

## After the first run: do this once

All URLs are marked `"verified": false`: they were written without being able to test them from
GitHub's servers.

1. Run the workflow by hand (not dry run) and open the run summary.
2. For each source marked `failed`: open the URL in your browser. If the address is wrong, fix it.
   If it works for you but not for GitHub (`HTTP 403`, `timed out`), the site blocks GitHub's
   servers; remove the source.
3. For each source with the note `same text as ...`: that URL returns only the site's menu
   (the real content is drawn by JavaScript), so it adds nothing. Remove it. This is likely for
   `cti-news` and `cti-calendar-2026`.
4. On branch `hsk-watch-state`, open `text/<id>.txt` for the remaining sources and check the
   text is the page's real content.
5. Set `"verified": true` on the sources that work.
6. One week later, check that the second run reports nothing when nothing changed. If the same
   line shows up as changed every week, add it to that source's `ignore` list.

## Limits

- **PDFs and images are not read.** Official announcements and exam calendars are often a PDF or a
  picture. The watch then sees only that a link appeared or its address changed, not what the
  document says. Open the link yourself.
- **Pages drawn by JavaScript are not read.** chinesetest.cn is such a site for at least some
  pages; a plain download gets the menu and whatever text the server includes. See step 3 above.
- **The official sites may block or time out** requests from GitHub's servers (they are outside
  China and are well-known addresses). Such a source is reported once as "could not be reached".
- **URLs are unverified until the first real run**, and official sites move pages without redirects.
- **Layout changes look like content changes.** A redesigned menu or footer produces an alert.
  Small counters, clocks, today's date, session tokens and copyright years are filtered out, but
  the filter cannot know everything; use `ignore` for the rest.
- **Weekly, not instant**, and GitHub may start scheduled runs late. Do not rely on it for
  registration deadlines.
- GitHub switches off scheduled workflows in a repository with no activity for 60 days, and emails
  you first. Re-enable it on the Actions tab.
- The email depends on your GitHub notification settings (Settings > Notifications: issues you are
  assigned to).

## Effect on the site deploy

None. The Pages deploy (`.github/workflows/deploy.yml`) starts only on a push to `main` or by hand.
The watch pushes only to `hsk-watch-state`, and pushes made with the workflow's own token do not
start other workflows anyway. The two workflows use different concurrency groups, so neither
waits for the other.

## Adding a summary later

`tools/hsk_watch.mjs` has a function `summariseChanges(run)` marked `EXTENSION POINT`. It
returns `null` today. If it returns text, that text is placed at the top of the issue. An AI
summary would go there, with its key in a repository secret passed in by the workflow.
