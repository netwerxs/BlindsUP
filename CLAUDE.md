# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BlindsUP is a single-file poker blinds timer — all HTML, CSS, and JavaScript live in `index.html`. There is no build step, no package manager, and no test framework.

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
| `level` | Current blind level (1–25) |
| `remSec` / `pausedRemSec` | Remaining seconds; `pausedRemSec` is the snapshot saved at pause |
| `paused` / `running` | Timer state |
| `launchWall` | `Date.now()` at last resume — elapsed time is computed as `(Date.now() - launchWall) / 1000` |
| `audioCtx`, `alarmNodes` | Web Audio API context and active oscillator nodes |

### Blind schedule

`BLINDS` is a 25-entry array: `{sb: i, bb: i*2}`. Level semantics:

- Levels 1–4: 15-minute countdown
- Level 5: "Break / Winding Down" — no countdown (`maxSec` returns 0), no timer ticks
- Levels 6–25: 10-minute countdown ("Freezeout")

`maxSec(lv)` encodes this rule and is the single source of truth for level duration.

### Timer loop

`setInterval(tick, 500)` drives the timer. `tick()` computes elapsed wall-clock time from `launchWall` and derives `remSec` with `Math.ceil(pausedRemSec - elapsed)` — this makes the timer drift-resistant. At `remSec <= 0`, the level auto-advances and `showAnnounce()` fires.

### Audio

All audio uses the Web Audio API (`AudioContext`). `playAlarm()` synthesizes 7 short sawtooth/sine blasts plus a long tail. `playTick()` synthesizes accelerating tick sounds for the final 12 seconds. The volume slider previews volume by running live oscillators that auto-stop after 600 ms of inactivity.

### Input

Both the blind zone and countdown zone support touch (swipe) and mouse (click left/right half). Non-touch devices get visible `+`/`−` click zones via `.no-touch-only` shown when `body.no-touch` is present (set on load). Swipe directions are intentionally inverted between the two zones (blinds: right=up; timer: left=+30s).
