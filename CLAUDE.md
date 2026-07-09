# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BlindsUP is a single-file poker blinds timer — all HTML, CSS, and JavaScript live in `index.html`. There is no build step, no package manager, and no test framework.

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
| `audioCtx`, `alarmNodes` | Web Audio API context and active oscillator nodes |

### Blind schedule

`BLINDS` is a 25-entry array of explicit `{sb, bb}` pairs. Level semantics:

- Levels 1–15: `sb = level, bb = level*2` (15-minute countdown for 1–5, 10-minute countdown from level 6)
- Levels 16–25: jump by +5/+10 per level (20/40, 25/50, ... up to 65/130), still 10-minute countdown

There's no special UI treatment for any level — the menu grid renders every level identically (`Level N` / `sb/bb` / duration).

Break is not a level. A **Break button** (in col-right) starts a separate 15-minute break countdown (`inBreak` flag). During break, the level timer is frozen and the break screen shows "Break" in the blind zone. Horn fires at 3 min, 1 min, and 0; break holds at 0. "End Break" / "Break" label toggles on the button. Pressing Pause during break ends break and shows the menu.

`maxSec(lv)` encodes this rule and is the single source of truth for level duration.

### Timer loop

`tick()` computes elapsed wall-clock time from `launchWall` and derives `remSec` with `Math.ceil(pausedRemSec - elapsed)` — this makes the timer drift-resistant. Rather than polling on a fixed interval, `scheduleTick()` computes the exact ms remaining until the next whole-second boundary and schedules `tick()` to land there via `setTimeout`, then `tick()` calls `scheduleTick()` again at the end — so each digit displays for a consistent ~1s instead of drifting. At `remSec <= 0`, the level auto-advances and `showAnnounce()` fires.

### Audio

All audio uses the Web Audio API (`AudioContext`). `playAlarm()` synthesizes a warm ascending triangle-wave arpeggio (C5-E5-G5-C6) resolving into a shimmering two-note chime tail. `playTick()` synthesizes accelerating tick sounds for the final 5 seconds. There is no in-app volume control — alarm level follows the device's hardware volume buttons.

### Updates

The app is a PWA (`sw.js`) that runs entirely offline from its installed cache and never fetches anything on its own. A **Check for Updates** button (menu screen, bottom-left) is the only way it goes online: it calls `registration.update()` to refetch `sw.js` and fetches `index.html` to compare the embedded `VERSION` string. If a new version installed in the background (service worker `waiting` state), pressing the button posts `SKIP_WAITING` to it and reloads once `controllerchange` fires, replacing the installed app. `sw.js`'s `install` handler intentionally does not call `self.skipWaiting()` itself — that only happens on this explicit user request.

### Input

Both the blind zone and countdown zone support touch (swipe) and mouse (click left/right half). Non-touch devices get visible `+`/`−` click zones via `.no-touch-only` shown when `body.no-touch` is present (set on load). Swipe directions are intentionally inverted between the two zones (blinds: right=up; timer: left=+30s).
