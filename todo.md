# BlindsUP — todo

## Payout / tournament structure

- [x] Define the rebuy cutoff (level or clock time) and record it in `PAYOUT.md` — _added 2026-09-09, done 2026-09-09: rebuy period is levels 1–5 + the break; freezeout from level 6 (600/1200)_

## Look and feel

- [ ] Review current CSS and propose concrete modernization changes (within or challenging the existing dark/high-contrast/no-blur-on-numerals constraint from CLAUDE.md), then implement in `index.html` — _added 2026-09-12_

## Sync (device handoff)

- [ ] Decide whether to restore or remove Sync: `pendingSync`/`startSynced()` can consume a `?lv=&t=` link, but nothing in the app generates one anymore (the old Lock-button/QR mechanism is gone) — currently orphaned/unreachable from the UI — _added 2026-09-12_
