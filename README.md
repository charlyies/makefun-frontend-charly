# make.fun board — a fast, read-only frontend for make.fun

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/charlyies/makefun-frontend-charly/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/charlyies/makefun-frontend-charly/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fully functioning custom frontend for [make.fun](https://make.fun/bounty/makefun-frontend-01):
the live bounty board, a bounty's page, its leaderboard, and an account's public profile —
each reachable by a link and by its own URL. Static files only, no build step, no sign-in,
no writes: it reads make.fun's public API alone (`https://make.fun/api/...`, GET only).

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
node serve.ts --port 8081 --host 127.0.0.1   # another port / bind address
```

## Routes

- `#/` — the bounty board: live pot, entry fee, time left, entries, filter + sort
- `#/bounty/<slug>` — a bounty: summary, skills, rewards table with the live pot, dates, status, description, rules, latest entries
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard with its score (judge win rate, Elo, or plain score, whichever the bounty uses) and the top three highlighted
- `#/profile/<handle>` — an account's public profile (or use the search box in the header)

## What it does

- **Board** — live pots, entry fees, time left (ticking once a minute), entries count,
  skills chips per bounty, and a search filter that also matches skills and sponsors.
  The "Still open only" default is decided by each bounty's deadline, not its status
  string — a bounty past its deadline reads closed even while the API still says open.
- **Bounty page** — live rewards table with the prize/fee split per place, the number
  of accounts that paid the entry fee, description and rules rendered from the API's
  markdown (headings, bold, italic, code, fenced code blocks, lists, blockquotes),
  and the latest entries with "Show more" paging.
- **Leaderboard** — ranked entries with avatars, the bounty-appropriate score column,
  and a ✓/✗ validity mark; ranks read 1st, 2nd, 3rd.
- **Profile** — bio, linked accounts, competitions entered, placements, wins and prize
  money, plus the account's public entries.

## Keyboard

- `/` focuses the board filter; `Esc` clears it. The header search jumps to a profile
  on Enter. A skip link (first Tab stop) jumps past the header to the content.

## Accessibility

- Visible `:focus-visible` outlines on every control, a skip link, `aria-live` on the
  main region, labelled navigation, and `prefers-reduced-motion` respected. Layout
  collapses to one column under 720px.

## Performance

- One small stylesheet, system fonts, vanilla JS — no framework, tiny first load.
- API answers cached in memory and revalidated with ETags (304 inside the minute);
  identical in-flight calls share one request; a view fetches only what it shows.
- Hovering or keyboard-focusing a board row prefetches that bounty's page in the
  background, so the click usually renders from cache. A failed fetch throws with its
  HTTP status and the page offers a retry instead of going blank.
- Long entry lists paginate with "Show more"; board filter/sort reuses the fetched list.
- Time-left labels tick once a minute by updating only their own text.
- The footer shows the live request count: requests sent, answers revalidated (304),
  and failures.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks `screenshots/` holds exactly 3 images under 256 KiB each, copies `app/`
and `screenshots/` to the output directory, and writes `dossier.json` with the vendored
`vendor/makefun-frontend.ts` library, then prints a short summary.
