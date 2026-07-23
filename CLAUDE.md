# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BlindsUP is a single-file poker blinds timer — all HTML, CSS, and JavaScript live in `index.html` (plus a small `sw.js` service worker for offline caching). There is no build step, no package manager, and no test framework. Two small third-party libraries (qrcode-generator, jsQR) are vendored inline, minified, near the end of `index.html`, ahead of the app's own `<script>` block.

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
| `locked` | Whether swipe/click adjustment is disabled (auto-re-engages after 10s idle) |

### Blind schedule

`BLINDS` is a 25-entry array of explicit `{sb, bb}` pairs. Level semantics:

- Levels 1–10: `sb = level, bb = level*2` (15-minute countdown for 1–5, 10-minute countdown from level 6)
- Levels 11–25: jump by +10/+20 per level (20/40, 30/60, ... up to 160/320), still 10-minute countdown

There's no special UI treatment for any level — the menu grid renders levels 1–24 identically (`Level N` / `sb/bb` / duration); level 25 is only reachable via auto-advance and has no menu card (its slot is given to the Sync card instead — see RTC alignment / Sync below). The menu grid does highlight whichever card matches the current `level` (class `.current`, kept in sync by `updateMenuHighlight()`, called from `showMenu()`), so the grid doubles as a lightweight progress indicator.

`maxSec(lv)` encodes the duration rule and is the single source of truth for level length.

**Level 5 (5/10) is followed by a break.** When level 5 finishes, `tick()` freezes the countdown (same shape as the Esc-hold reset) and calls `showBreakAnnounce()`, which reuses the same `#announce` overlay as a normal level-up but shows "Break" (`#ann-break`) instead of the new blinds, via the `#announce.break` CSS toggle. It plays the jingle `BREAK_JINGLE_PLAYS` (3) times, `BREAK_JINGLE_GAP` (10s) apart. Once all plays finish (or the overlay is tapped early, via `dismissAnnounce()`), `finishBreak()` sets `level=6`, resets `remSec`/`pausedRemSec`, and returns to the blind chooser (`showMenu(false)`), so the next level is always picked manually from the menu.

### Timer loop

`tick()` computes elapsed wall-clock time from `launchWall` and derives `remSec` with `Math.ceil(pausedRemSec - elapsed)` — this makes the timer drift-resistant. Rather than polling on a fixed interval, `scheduleTick()` computes the exact ms remaining until the next whole-second boundary and schedules `tick()` to land there via `setTimeout`, then `tick()` calls `scheduleTick()` again at the end — so each digit displays for a consistent ~1s instead of drifting. At `remSec <= 0`, the level auto-advances and `showAnnounce()` fires.

**RTC alignment.** New levels don't just start at their full duration — `snapToRTC()` nudges the start so the countdown lands on `:00` in sync with the wall clock, and `minDriftSec()` computes the minimum correction needed after a pause so a countdown stays RTC-aligned rather than drifting by however long the pause lasted. When a level auto-advances, there's a brief `advancing=true` window (guarded by `snapTO`) between the new level's raw duration being shown and its RTC-snapped value landing; `freezeCountdown()` (shared by Pause and level 5 finishing) always clears `advancing` and cancels `snapTO`, so pausing mid-advance can't permanently stall `tick()`/`scheduleTick()` (both bail early while `advancing` is true).

### Audio

All audio uses the Web Audio API via a small vendored `zzfx()` synthesizer (no samples, no network). `playAlarm()` synthesizes a warm ascending triangle-wave arpeggio (C5-E5-G5-C6) resolving into a shimmering two-note chime tail — used for level-advance (played once) and the level-5 break (played 3 times, 10s apart, see `showBreakAnnounce()`). `playWoodClack()` fires three wood-dowel-strike sounds 600ms apart, once at the 11-second mark of a level's countdown. `playSoundcheck()` is a distinct buzzy 2s tone for verifying device volume, deliberately unlike any other sound so it's never mistaken for a timer event. `stopAlarm()` clears `alarmNodes`/`alarmTimeouts` and is called from `freezeCountdown()` (so pausing silences any in-flight alarm or wood-clack) and `dismissAnnounce()`. There is no in-app volume control — alarm level follows the device's hardware volume buttons.

### Sync (QR handoff between devices)

While unlocked, the Lock button doubles as a QR code (`renderLockButton()`) encoding the current level plus an absolute wall-clock end time — scanning it (via the menu's Sync card → `openScanner()`, which decodes camera frames with the vendored `jsQR`) opens the same countdown on a second device via `startSynced()`, landing on the correct remaining time regardless of scan/load delay. A URL carrying `?lv=&t=` params is parsed once at startup into `pendingSync` and consumed after the soundcheck gate resolves.

### Updates

The app is a PWA (`sw.js`) that runs entirely offline from its installed cache and never fetches anything on its own. The **version label doubles as the "Check for Updates" button** (`#btn-check-update`, menu screen bottom-right) — it shows the current `VERSION` at rest, and is the only way the app goes online: clicking it calls `registration.update()` to refetch `sw.js` and fetches `index.html` to compare the embedded `VERSION` string, showing "Latest vX.XX" (no update) or "Updated from vX.XX to vY.YY" (update found) before reloading to swap in the new version. If `sw.js` changes without a `VERSION` bump, the "Latest" path also checks `swReg.waiting` and hands the already-installed worker control rather than leaving it stuck. If a new version installed in the background (service worker `waiting` state), the click posts `SKIP_WAITING` to it and reloads once `controllerchange` fires, replacing the installed app. `sw.js`'s `install` handler intentionally does not call `self.skipWaiting()` itself — that only happens on this explicit user request. `sw.js` only overwrites its cached `index.html` on a successful (`res.ok`) fetch, so a transient network error during the check can't poison the offline cache with an error page.

### Input

Both the blind zone and countdown zone support touch (swipe), mouse (click left/right half), and keyboard (Up/Down adjusts level, Left/Right adjusts time — mirroring the swipe gestures, for keyboard/remote input at the table). Non-touch devices get visible `+`/`−` click zones via `.no-touch-only` shown when `body.no-touch` is present (set on load). Swipe directions are intentionally inverted between the two zones (blinds: right=up; timer: left=+1min). `bindSwipe()` uses an `armed` flag (set on `mousedown`, cleared on `mouseup`/`mouseleave`) so a mouse-drag that starts in one zone and ends in another can't misfire an adjustment.

### Visual design

Dark, high-contrast, glanceable-from-across-the-table is the load-bearing constraint — the blind and countdown numerals never get blur, gradients, or texture. "2026" polish (translucent `backdrop-filter` panels on the menu screen, soft shadows, inset highlights, the menu grid's current-level glow) is confined to chrome (`.menu-corner-btn`, `.pill-btn`, `.blind-card`) via the `--glass-*`/`--shadow-*`/`--inset-hi` tokens in `:root`, never to the data itself. A global `prefers-reduced-motion` media query collapses all animation/transition durations for users who request it.

`#col-right` (the right-hand control column) is a dark cherrywood panel — layered `repeating-linear-gradient` grain lines over a reddish-brown `linear-gradient` base, no `backdrop-filter` (an opaque wood texture has nothing to blur).

`#blind-zone` and `#cd-zone` share a medium-green poker-felt background (`#2e8b57`), framed by four large (`.suit`, `18vh`) unicode card-suit glyphs at the four corners of the combined area: clubs (black, top-left) and diamonds (red, top-right) in `#blind-zone`; hearts (red, bottom-left) and spades (black, bottom-right) in `#cd-zone`. All four are `pointer-events:none` so they never intercept the underlying swipe/click zones. There is no "Locked" text badge — `#layout.locked` still disables interaction on both zones (`pointer-events:none`), it's just not labeled on-screen.

The `#announce` overlay (level-up popup) matches the same felt green background and reuses the same four `.suit` corner glyphs, with its text set to white/near-white (rather than the `--dim`/`--dimmer` tones used elsewhere) for contrast against the green.
