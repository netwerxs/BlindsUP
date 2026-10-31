# BlindsUP — todo

## Payout / tournament structure

- [x] Define the rebuy cutoff (level or clock time) and record it in `PAYOUT.md` — _added 2026-09-09, done 2026-09-09: rebuy period is levels 1–5 + the break; freezeout from level 6 (600/1200)_

## Look and feel

- [x] Review current CSS and propose concrete modernization changes (within or challenging the existing dark/high-contrast/no-blur-on-numerals constraint from CLAUDE.md), then implement in `index.html` — _added 2026-09-12, done 2026-09-12: felt/announce depth, button/card press feedback, cherrywood highlight, richer accent/danger colors_

## Sync (device handoff)

- [x] Decide whether to restore or remove Sync — _added 2026-09-12, done 2026-09-18: removed `pendingSync`/`startSynced()` entirely (dead code — nothing generated the `?lv=&t=` link since the old Lock-button/QR mechanism was removed)_

## Reliability (from the 2026-10-31 council review)

- [x] Persist game state to localStorage and restore it paused on load — _added 2026-10-31, done 2026-10-31_
- [ ] Global error guard (`onerror`/`unhandledrejection`) so a sound failure can never stop `scheduleTick` — _added 2026-10-31_
- [ ] Fuzz-test the payout math (payouts + house = gross, multiples of $5, percentages sum to 100, break plans cover shortfalls, bad/tiny inputs) — _added 2026-10-31_
- [ ] Show a "payouts + house = pool" check line on the Payout screen — _added 2026-10-31_
- [ ] Create RUNBOOK.md: pre-game checklist, host instructions, don't update mid-game — _added 2026-10-31_
