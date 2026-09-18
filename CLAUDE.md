# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BlindsUP is a single-file poker blinds timer — all HTML, CSS, and JavaScript live in `index.html` (plus a small `sw.js` service worker for offline caching). There is no build step, no package manager, and no test framework, and no vendored third-party libraries — the entire app is hand-written JS in one inline `<script>` block, including a small adapted synth (`zzfx`) for sound effects.

## Workflow

Always commit and push every change immediately after making it — no need to ask for confirmation first.

## Running the app

Open `index.html` directly in a browser, or serve it with any static file server:

```
npx serve .
# or
python -m http.server
```

## Architecture

Everything is in `index.html`. The structure is:

- **CSS** (`:root` variables → screen layouts → component styles → animations)
- **HTML** — two top-level screens: `#menu-screen` and `#app`
- **JavaScript** — no modules, no classes, plain procedural script at bottom of `<body>`

### State

All mutable state is global:

| Variable | Purpose |
|---|---|
| `level` | Current blind level (1–25, see Blind schedule) |
| `remSec` / `pausedRemSec` | Remaining seconds; `pausedRemSec` is the snapshot saved at pause |
| `paused` / `running` | Timer state |
| `launchWall` | `Date.now()` at last resume — elapsed time is computed as `(Date.now() - launchWall) / 1000` |
| `advancing` / `snapTO` | True during the brief window between a level auto-advancing and its RTC-aligned start landing (see RTC alignment below) |
| `pauseSecRTC` | RTC second-of-minute recorded at pause, used to correct drift on resume |
| `audioCtx`, `alarmNodes`, `alarmTimeouts` | Web Audio API context and active oscillator nodes / pending sound timeouts |

### Blind schedule

`BLINDS` is a 29-entry array of explicit `{sb, bb}` pairs. Level semantics:

- Levels 1–10: `sb = level*100, bb = level*200` (15-minute countdown for 1–5, 10-minute countdown from level 6)
- Levels 11–13: +500/+1000 per level (1500/3000, 2000/4000, 2500/5000), 10-minute countdown
- Levels 14–29: +1000/+2000 per level (3000/6000 up to 18000/36000), 10-minute countdown

Blind values are always shown as full integers (no `k`/thousands abbreviation) — `render()`, the menu cards, the level-up announce and the resume button all read `bl.sb`/`bl.bb` straight from `BLINDS`.

`fitBlind()` / `fitAnnounce()` (via the shared `fitText()`) shrink `#blind-inner` / `#ann-wrap` from their vh baseline when a wide pair (e.g. `18000 / 36000`) would overrun the available width, snapping back to full size when it fits. Both containers own the font-size (`.b-num`/`.b-amp`/`#ann-wrap .ann-num`/`.ann-amp` are `1em`); `fitBlind()` is called every `render()` but early-returns unless the text or width changed, and is also wired to `resize`.

There's no special UI treatment for any level — the menu grid renders levels 1–28 identically (`Level N` / `sb/bb` / duration); level 29 is only reachable via auto-advance and has no menu card (its slot is given to the EXIT card instead). The menu grid does highlight whichever card matches the current `level` (class `.current`, kept in sync by `updateMenuHighlight()`, called from `showMenu()`), so the grid doubles as a lightweight progress indicator.

`maxSec(lv)` encodes the duration rule and is the single source of truth for level length.

**Level 5 (5/10) is followed by a break.** When level 5 finishes, `tick()` freezes the countdown (same shape as the Esc-hold reset) and calls `showBreakAnnounce()`, which reuses the same `#announce` overlay as a normal level-up but shows "Break" (`#ann-break`) instead of the new blinds, via the `#announce.break` CSS toggle. It plays the jingle once and holds the overlay for `BREAK_HOLD_MS` (1 minute). Once that elapses (or the overlay is tapped early, via `dismissAnnounce()`), `finishBreak()` sets `level=6`, resets `remSec`/`pausedRemSec`, and returns to the blind chooser (`showMenu(false)`), so the next level is always picked manually from the menu.

### Timer loop

`tick()` computes elapsed wall-clock time from `launchWall` and derives `remSec` with `Math.ceil(pausedRemSec - elapsed)` — this makes the timer drift-resistant. Rather than polling on a fixed interval, `scheduleTick()` computes the exact ms remaining until the next whole-second boundary and schedules `tick()` to land there via `setTimeout`, then `tick()` calls `scheduleTick()` again at the end — so each digit displays for a consistent ~1s instead of drifting. At `remSec <= 0`, the level auto-advances and `showAnnounce()` fires.

**RTC alignment.** New levels don't just start at their full duration — `snapToRTC()` nudges the start so the countdown lands on `:00` in sync with the wall clock, and `minDriftSec()` computes the minimum correction needed after a pause so a countdown stays RTC-aligned rather than drifting by however long the pause lasted. When a level auto-advances, there's a brief `advancing=true` window (guarded by `snapTO`) between the new level's raw duration being shown and its RTC-snapped value landing; `freezeCountdown()` (shared by Pause and level 5 finishing) always clears `advancing` and cancels `snapTO`, so pausing mid-advance can't permanently stall `tick()`/`scheduleTick()` (both bail early while `advancing` is true).

### Audio

All audio uses the Web Audio API via a small adapted `zzfx()` synthesizer (no samples, no network). `playAlarm()` synthesizes a warm ascending triangle-wave arpeggio (C5-E5-G5-C6) resolving into a shimmering two-note chime tail — used for level-advance and the level-5 break (each played once, see `showBreakAnnounce()`). `playWoodClack()` fires three wood-dowel-strike sounds 600ms apart, once at the 11-second mark of a level's countdown. `playSoundcheck()` is a distinct buzzy 2s tone for verifying device volume, deliberately unlike any other sound so it's never mistaken for a timer event. `stopAlarm()` clears `alarmNodes`/`alarmTimeouts` and is called from `freezeCountdown()` (so pausing silences any in-flight alarm or wood-clack) and `dismissAnnounce()`. There is no in-app volume control — alarm level follows the device's hardware volume buttons.

### Sync (deep-link handoff between devices)

A `?lv=&t=` URL — level plus an absolute wall-clock end time, not a raw seconds-remaining count — is parsed once at startup into `pendingSync`, and consumed by `startSynced()` after the soundcheck gate resolves either way. `startSynced()` computes `remSec` from `pendingSync.t - Date.now()`, so the receiving device lands on the correct remaining time regardless of how long the link took to open. There is no QR code or camera scanning involved — sharing the link (however it reaches the second device) is the entire handoff. **Nothing in the current code generates this link** — an older Lock-button/QR mechanism apparently used to build and display it, but that generator is gone; only the receiving half (`pendingSync`/`startSynced()`) remains. As it stands, Sync can't actually be triggered from within the app.

### Payout (prize-pool cash-count calculator)

The **Payout** button opens `#split-overlay`, a calculator wholly separate from timer state (the countdown keeps running underneath) driven by `splitRecalc()`. The user enters how many bills of each denomination (`SPLIT_DENOMS = [100,50,20,10,5]`) are in the pot; the total is the **Prize Pool** (`gross`), 90% of which (`pool`) splits across paid places per the **Payout split** selector — fixed presets Top 3 (50/30/20) and Top 4 (50/25/15/10), or Custom 3–7 Paid, whose percentages default to 1st = 50% with the rest split evenly (`defaultPcts()`/`distributeInt()`, largest-remainder rounding) and are then step-adjustable per place by 1% (`stepPct()`), redistributing whichever places are unaffected by that step so the set always sums to 100%. Custom mode percentages persist to `localStorage` (`save/loadPayoutSettings()`) and are restored if that Custom mode is picked again, across app restarts. The selector itself defaults back to Top 3 on a fresh app open, but once the user picks a mode during a session (`splitModeTouched`), `openSplit()` keeps that choice for the rest of the session instead of reverting it.

Each payout rounds to the nearest whole $5 so it can be paid in bills; the rounding difference is absorbed by the **House** cut (`gross` minus all payouts), which can therefore land a little above or below its base 10%. `greedyTake()` — the one largest-first "hand out `amount` in bills" primitive — backs both dealing a payout from the counted bills (`dealBills()`) and describing a bill breakdown (`billBreakdown()`, an unlimited-supply variant used when breaking change). A payout that can't be dealt exactly from the counted bills is a shortfall; `planBreaks()` resolves every shortfall in one pass (largest first, so a break's change carries forward to smaller ones) and reports the minimal set of bills to break — e.g. "Break 2 $20's with 2 $10's and 4 $5's." — shown as one bold red line under the Payout split selector. The House's own bill breakdown only renders once every payout balances exactly, since otherwise some of what's "left over" is really still owed to a shorted place.

### Top menu bar

`#top-menubar` is a standard left-to-right dropdown menu bar — **Game** (Pause/Resume, Payout), **Utils** (Sound Check, Install, Update), **Help** (How to Play) — fixed above both screens rather than living inside either one, so it's identical whether the menu (level-select) or app (running timer) screen is showing. There is no side panel anymore; every control that isn't the blind/timer swipe zones themselves lives in this bar. It's styled to the same cherrywood/glass chrome as the rest of the UI rather than literal OS gray, per the visual-design constraint below. Each top-level entry is a `.mb-item` (`#mb-game`/`#mb-utils`/`#mb-help`) containing a `.mb-label` button and a `.mb-dropdown`; `toggleMenu(id)` opens one and closes any other, `closeAllMenus()` closes all, and a document-level `click` listener closes everything when the click lands outside `#top-menubar`. `z-index:41` — above both screens (`40`) but below the sound-check gate, the level-up announce, and every full-screen overlay (`45`/`50`/`60`), so it's naturally hidden whenever one of those covers the screen, no explicit show/hide JS needed. `#menu-screen` and `#app` reserve space for it via `padding-top: calc(env(safe-area-inset-top) + var(--menubar-h))`.

A top-level label's click goes through `menuLabelClick(id)` rather than opening the dropdown directly: if the dropdown has only one *enabled* item, it skips the dropdown and runs that item immediately. Help always has exactly one item (How to Play), so it behaves as a plain button rather than ever showing a one-row dropdown. Game normally has two (Pause/Resume, Payout), but Pause is disabled whenever no level is running (see below), which drops Game to one live item too — so tapping **Game** with nothing running jumps straight to Payout instead of opening a dropdown.

**Pause/Resume is one menu item, not two buttons.** There's no separate Unpause button anymore — `#btn-pause` (inside the Game dropdown) always calls `togglePause()`, which already branches on `paused` to either freeze the countdown and return to the menu, or resume. `updatePauseMenuItem()` keeps that single item's label (`Pause`/`Resume`) and `disabled` state (disabled whenever `!running`, since `running` stays `true` across a pause — it's only ever set `false` by a hard reset like the Esc-hold) in sync, and is called from every place `running`/`paused` change: `enterRunningState()`, `togglePause()`, the level-5 break path, and the Esc-hold reset. It's also called once at load so the item starts disabled before any level is picked.

**The clock** lives on `#clock-platform`, a raised wood pedestal anchored to the bar's top-right corner (`position:absolute;top:0;right:0`, inside `#top-menubar` which is `position:fixed` and gives it its containing block) — replacing the side panel's rotated `.tod-box` clock. `#mb-clock` is set 5x the size of a normal bar label, too tall to fit inside `var(--menubar-h)` without changing the bar's own height, so rather than shrink it back down, the pedestal is allowed to grow past the bar's bottom edge and hang down over the felt's top-right corner below (past the wood border's own thickness), like a plaque mounted at the corner instead of a label squeezed into the bar. It's taken out of flex flow (`position:absolute`) so it doesn't disturb the Game/Utils/Help layout. No `border-radius` — coming left to right, the bar's `border-bottom` hits the pedestal's left wall and turns a sharp corner straight down it (the pedestal's own `border-left`), then turns again along its bottom wall (`border-bottom`) until it reaches the screen's right edge, rather than curving under the pedestal or being cut off by it.

**The version label** (`#mb-version`) is centered on the bottom wood border instead, in its own fixed `#bottom-bar` (not inside `#top-menubar`, since the bottom border belongs to each screen's own felt-frame rather than the shared top bar). `pointer-events:none` so it never intercepts the felt's swipe/click zones underneath it.

### Updates

The app is a PWA (`sw.js`) that runs entirely offline from its installed cache. **Check for Updates** (`#btn-check-update`, inside the top menu bar's **Utils** dropdown) is the main way the app goes online: clicking it calls `registration.update()` to refetch `sw.js` and fetches `index.html` to compare the embedded `VERSION` string, showing "Latest vX.XX" (no update) or "Updated from vX.XX to vY.YY" (update found) before reloading to swap in the new version. Its resting label is the static text "Update" — the current version itself is shown beside the clock (`#mb-version`), not on this button. Unlike the other Utils-menu items, clicking it does not close the dropdown — the status text needs to stay visible while it walks through "Checking…" / "Latest vX.XX" / "Updated…"; it closes itself (`closeAllMenus()`) once it settles back to the resting "Update" label. If `sw.js` changes without a `VERSION` bump, the "Latest" path also checks `swReg.waiting` and hands the already-installed worker control rather than leaving it stuck. If a new version installed in the background (service worker `waiting` state), the click posts `SKIP_WAITING` to it and reloads once `controllerchange` fires, replacing the installed app. `sw.js`'s `install` handler intentionally does not call `self.skipWaiting()` itself — that only happens on this explicit user request. `sw.js` only overwrites its cached `index.html` on a successful (`res.ok`) fetch, so a transient network error during the check can't poison the offline cache with an error page.

The only other time the app goes online unprompted is a **launch ping** — a fire-and-forget `fetch(..., {mode:'no-cors'})` to a healthchecks.io ping URL, sent once at startup right after the service worker registers. It exists purely so runs can be observed externally (healthchecks.io's Events log shows a timestamp + source IP per ping); the app never reads or awaits the response, and failures (no network, offline at the table) are swallowed silently and have no effect on startup.

### Input

Both the blind zone and countdown zone support touch (swipe), mouse (click left/right half), and keyboard (Up/Down adjusts level, Left/Right adjusts time — mirroring the swipe gestures, for keyboard/remote input at the table). Non-touch devices get visible `+`/`−` click zones via `.no-touch-only` shown when `body.no-touch` is present (set on load). Swipe directions are intentionally inverted between the two zones (blinds: right=up; timer: left=+1min). `bindSwipe()` uses an `armed` flag (set on `mousedown`, cleared on `mouseup`/`mouseleave`) so a mouse-drag that starts in one zone and ends in another can't misfire an adjustment.

### Visual design

Dark, high-contrast, glanceable-from-across-the-table is the load-bearing constraint — the blind and countdown numerals never get blur, gradients, or texture. "2026" polish (translucent `backdrop-filter` panels on the menu screen, soft shadows, inset highlights, the menu grid's current-level glow) is confined to chrome (`.menu-corner-btn`, `.pill-btn`, `.blind-card`) via the `--glass-*`/`--shadow-*`/`--inset-hi` tokens in `:root`, never to the data itself. A global `prefers-reduced-motion` media query collapses all animation/transition durations for users who request it.

`.wood-layout` (the frame behind the felt, shared by both screens) is a dark cherrywood panel — layered `repeating-linear-gradient` grain lines over a reddish-brown `linear-gradient` base, no `backdrop-filter` (an opaque wood texture has nothing to blur). It used to reserve a second grid column for a side panel; now that every control lives in the top menu bar, it's a single column and the felt fills its full width.

`#blind-zone` and `#cd-zone` share a medium-green poker-felt background (`#2e8b57`), framed by four large (`.suit`, `18vh`) unicode card-suit glyphs at the four corners of the combined area: clubs (black, top-left) and diamonds (red, top-right) in `#blind-zone`; hearts (red, bottom-left) and spades (black, bottom-right) in `#cd-zone`. All four are `pointer-events:none` so they never intercept the underlying swipe/click zones, and sit at `z-index:-1` behind the numerals — the zones (`#blind-zone`/`#cd-zone`) carry `z-index:0` so the glyphs still paint above the felt, just under the blind/countdown digits where they overlap. The blind `/` separator carries a small `em` side margin (`.b-amp`, `.ann-amp`), matching the countdown's spaced `:` (`.cd-colon`).

The `#announce` overlay (level-up popup) matches the same felt green background and reuses the same four `.suit` corner glyphs, with its text set to white/near-white (rather than the `--dim`/`--dimmer` tones used elsewhere) for contrast against the green.
