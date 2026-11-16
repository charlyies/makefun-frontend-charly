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
```

## Routes

- `#/` — the bounty board: live pot, entry fee, time left, entries, filter + sort
- `#/bounty/<slug>` — a bounty: summary, rewards table with the live pot, dates, status, description, rules, latest entries
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard with judge win rates
- `#/profile/<handle>` — an account's public profile (or use the search box in the header)

## Performance

- One small stylesheet, system fonts, vanilla JS — no framework, tiny first load.
- API answers cached in memory and revalidated with ETags (304 inside the minute);
  identical in-flight calls share one request; a view fetches only what it shows.
- Long entry lists paginate with "Show more"; board filter/sort reuses the fetched list.
- Time-left labels tick once a minute by updating only their own text.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored `vendor/makefun-frontend.ts` library.
