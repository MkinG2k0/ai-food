---
phase: quick
plan: 260705-psq
subsystem: mobile-widgets
tags: [week-strip, framer-motion, carousel, scrollbar-fix, daily-header]
dependency-graph:
  requires: []
  provides:
    - "3-slot virtualized WeekStrip carousel (apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx)"
    - "WeekStrip.test.tsx regression suite"
  affects:
    - "apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx (consumes WeekStrip, unchanged)"
tech-stack:
  added: []
  patterns:
    - "framer-motion useMotionValue + imperative animate() instead of useAnimation"
    - "overflow-hidden viewport wrapper containing a 300%-wide draggable track (3-slot virtualization)"
    - "useLayoutEffect-driven invisible recenter on prop change"
key-files:
  created:
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx
  modified:
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx
decisions:
  - "Kept WeekStripProps byte-identical (weekOffset, selectedDate, meals, onDaySelect, onWeekChange) so DailyHeader/HomePage require zero edits"
  - "Slots keyed by fixed screen role ('prev'/'current'/'next'), never by the offset value, so slot identity stays pinned and only content changes on weekOffset change"
  - "dragMomentum={false} kept to prevent framer-motion's own inertia animation from racing the explicit animate() snap in onDragEnd"
metrics:
  duration: "~25 min"
  completed: "2026-07-05"
status: complete
---

# Phase quick Plan 260705-psq: WeekStrip 3-Slot Virtualized Carousel Rewrite Summary

Rewrote WeekStrip.tsx from a single-track useAnimation fade/replace implementation into an overflow-clipped, motion-value-driven 3-slot (prev/current/next) virtualized carousel, eliminating the page-scrollbar glitch that occurred during drag.

## Root Cause

The previous implementation's draggable `motion.div` and every ancestor up to `HomePage`'s root declared no `overflow` rule. When framer-motion translated the element via CSS transform (drag elastic overshoot plus the imperative `x: ±40` slide animation), the browser extended the document's scrollable-overflow area and painted a scrollbar — very visible on Windows Chromium/Edge, which shows non-overlay scrollbars. The old approach also fully faded out/in the 7-day content on swipe rather than sliding a real track.

## What Changed

- **`apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx`** — full rewrite:
  - Outer wrapper `div` (`data-testid="week-strip-viewport"`) with `overflow-hidden touch-pan-y overscroll-x-contain mt-4` contains all transform/drag motion, eliminating the scrollbar glitch.
  - Inner `motion.div` track is `300%` wide, holding 3 fixed slots (`weekOffset - 1`, `weekOffset`, `weekOffset + 1`), each rendering a full 7-day week via `getWeekDays(offset)`.
  - Slots keyed by screen role (`prev`/`current`/`next`) rather than by offset value, so slot identity stays pinned to screen position; only their day content updates when `weekOffset` changes.
  - Removed `useAnimation` entirely; replaced with `useMotionValue(0)` + imperative `animate()` for both the swipe-to-next/prev snap and the spring-back-to-center case.
  - `handleDragEnd` reads live `slotWidth` from `viewportRef.getBoundingClientRect().width`, animates `x` to `-2*slotWidth` (next) or `0` (prev) and calls `onWeekChange` only after that animation resolves; otherwise springs back to `-slotWidth`.
  - `recenter()` helper (`x.set(-slotWidth)`, instant, no animation) runs in a `useLayoutEffect` keyed on `weekOffset` so the visual jump-back to center is invisible (runs before paint), plus a `window resize` listener (mount-once `useEffect` with cleanup) to keep the track aligned across viewport resizes.
  - Existing `hasMeals` helper, day markup (label, day-number circle, meal-dot), and `SWIPE_OFFSET_THRESHOLD` / `SWIPE_VELOCITY_THRESHOLD` constants preserved unchanged in behavior, now evaluated per-slot.
  - No new dependency added — `framer-motion` (already installed) supplies `useMotionValue`, `animate`, `PanInfo`.

- **`apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx`** (new) — 4 tests:
  1. Renders 21 day buttons total (3 weeks x 7 days) — structural proof of virtualization.
  2. `week-strip-viewport` element carries `overflow-hidden` class — direct regression guard for the scrollbar fix.
  3. Clicking a day button in the current-week slot (DOM index 10, i.e. current week's 4th day) calls `onDaySelect` with a `Date` matching `getWeekDays(0)[3]` via `isSameDay`.
  4. A day with a matching fixture `Meal` (current week's 3rd day) renders its meal-dot indicator with an emerald-family class and not `bg-transparent`.

## Files Untouched (as required)

`DailyHeader.tsx`, `HomePage.tsx`, `MealList.tsx`, and `global.css` were not modified — confirmed via `git diff --stat c1fa49f HEAD`, which shows only the two WeekStrip files changed. `WeekStripProps` is byte-identical to before.

## Verification Results

- `pnpm --filter @ai-food/mobile type-check` — **0 errors** (ran after `pnpm install`, since this worktree had no `node_modules`; install was a lockfile-only resync, no new packages added or resolved).
- `pnpm --filter @ai-food/mobile test -- WeekStrip` — **4/4 tests passing**.
- `grep -q "overflow-hidden"` and `! grep -q "useAnimation"` on `WeekStrip.tsx` — both pass.

## Task 3 — PENDING HUMAN VERIFICATION

Task 3 (`checkpoint:human-verify`, gate=`blocking`) has **not** been completed or approved. This executor ran non-interactively and cannot perform the manual drag/swipe verification described in the plan (visual/touch confirmation that no scrollbar appears and the carousel motion feels correct). Per the plan's `<how-to-verify>` steps, the user must:

1. Run `pnpm dev` from the repo root.
2. Open `http://localhost:5173` in a desktop browser (Chrome or Edge on Windows).
3. Click-drag the week strip left/right, both slowly and with a quick flick.
4. Confirm no horizontal or vertical scrollbar appears at any point during/after the drag.
5. Confirm the incoming week's day-numbers slide in alongside the outgoing week as one continuous track (not fade/replace).
6. Confirm a flick/drag past ~1/3 width snaps fully to the next/previous week and the calorie header + meal list update accordingly.
7. Confirm a small drag springs back with no header/meal-list change.
8. Repeat steps 3-7 with Chrome DevTools device toolbar (touch emulation) to confirm no scrollbar/glitch on touch input.

**This plan is not fully complete until Task 3 is approved by the user.** Tasks 1 and 2 are done, committed, and automatically verified; Task 3 remains open.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Installed workspace dependencies**
- **Found during:** Task 1 verification (`pnpm --filter @ai-food/mobile type-check`)
- **Issue:** This worktree had no `node_modules` installed (fresh worktree checkout), causing `tsc` to fail resolving `react`, `framer-motion`, `@ai-food/shared-types`, etc.
- **Fix:** Ran `pnpm install` from repo root. Lockfile was already up to date — this only materialized `node_modules` from the existing lockfile; no new packages were added, resolved, or changed.
- **Files modified:** None (only `node_modules`, not committed).
- **Commit:** N/A (no source changes).

No other deviations. Plan executed as written for Tasks 1-2.

## Self-Check: PASSED

- FOUND: apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx
- FOUND: apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx
- FOUND: commit 59d495c (fix(week-strip): rewrite as overflow-clipped 3-slot virtualized carousel)
- FOUND: commit 98c237c (test(week-strip): add regression coverage for 3-slot carousel rewrite)
