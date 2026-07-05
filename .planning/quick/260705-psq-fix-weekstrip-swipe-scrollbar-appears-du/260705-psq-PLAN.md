---
phase: quick
plan: 260705-psq
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx
  - apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx
autonomous: false
requirements: []
must_haves:
  truths:
    - "Dragging/swiping the week strip on desktop (mouse) or touch never produces a visible page scrollbar (horizontal or vertical), at any point during or after the drag"
    - "Swiping shows a continuous track shift where previous/current/next weeks are visible side by side, not a fade/replace of full content"
    - "After a swipe settles, the existing weekOffset/selectedDate wiring (calorie header, meal list, Monday-fallback-if-selected-day-not-in-new-week) keeps working unchanged"
    - "Tapping any single day button still calls onDaySelect with that date, independent of drag mechanics"
    - "WeekStripProps (weekOffset, selectedDate, meals, onDaySelect, onWeekChange) is unchanged, so DailyHeader.tsx and HomePage.tsx require zero edits"
  artifacts:
    - path: "apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx"
      provides: "3-slot (prev/current/next) virtualized carousel track with overflow-clipped viewport wrapper"
      contains: "overflow-hidden"
    - path: "apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx"
      provides: "Automated regression coverage for 3-slot rendering, overflow-hidden viewport, and day-click behavior"
      contains: "week-strip-viewport"
  key_links:
    - from: "apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx (onWeekChange call in onDragEnd)"
      to: "apps/mobile/src/pages/home/ui/HomePage.tsx (handleWeekChange)"
      via: "onWeekChange prop (unchanged contract)"
      pattern: "onWeekChange"
    - from: "apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx (viewport wrapper div)"
      to: "browser scrollable-overflow calculation"
      via: "overflow-hidden class containing the transformed/dragged track"
      pattern: "overflow-hidden"
---

<objective>
Fix WeekStrip (apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx) so that: (1) no scrollbar glitch appears during swipe/drag, and (2) the swipe interaction becomes a genuine 3-week virtualized carousel — previous, current, and next week rendered as three side-by-side tracks that all translate together, with the "current" week recomputed after each swipe — instead of the current fade/replace-the-content approach shipped in commits 35bb62e/b47aac5/92e66c1/abba404/c1fa49f.

Purpose: The current implementation (single 7-day track + useAnimation-driven opacity/x fade) has no overflow containment around the dragged/animated element, so the browser extends the document's scrollable area and paints a scrollbar during drag. It also fully replaces the visible week's content on swipe rather than sliding a real track, which does not match the windowed 3-week carousel design already agreed for this feature (docs/superpowers/plans/2026-06-30-week-navigation.md describes the original 7-day-track approach; this quick task supersedes its swipe mechanism with the 3-week virtualization the user now wants).

Output:
- apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx rewritten with an overflow-hidden viewport wrapper and a motion-value-driven 3-slot track
- apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx added with automated regression coverage
- DailyHeader.tsx, HomePage.tsx, MealList.tsx, and global.css remain untouched — WeekStripProps contract is identical
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx
@apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
@apps/mobile/src/shared/lib/dateUtils.ts
@apps/mobile/src/shared/lib/index.ts
@packages/shared-types/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite WeekStrip.tsx — overflow-hidden viewport + 3-slot virtualized carousel</name>
  <files>apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx</files>
  <action>
Replace the current implementation (single 7-day `motion.div` track driven by `useAnimation` that fades/slides the whole content out and a new week in) with a 3-slot virtualized carousel, fixing the scrollbar glitch in the same pass.

Root cause of the scrollbar bug: the draggable `motion.div` and every ancestor up to `HomePage`'s root div declare no `overflow` rule at all, so when framer-motion translates the element via CSS transform beyond its own box (drag elastic overshoot, plus the imperative `x: ±40` slide animation), the browser extends the document's scrollable-overflow area and paints a scrollbar (very visible on Windows Chromium/Edge, which shows non-overlay scrollbars). Fix this by containing the transform inside the component's own clipping wrapper — do not touch DailyHeader.tsx, HomePage.tsx, MealList.tsx, or global.css; the fix and the new carousel both live entirely inside this one file, and `WeekStripProps` must stay byte-identical (`weekOffset`, `selectedDate`, `meals`, `onDaySelect`, `onWeekChange`).

Component structure:

1. Outer wrapper `div`: `ref={viewportRef}` (a `useRef<HTMLDivElement>(null)`), `data-testid="week-strip-viewport"`, classes `overflow-hidden touch-pan-y overscroll-x-contain mt-4`. This div's rendered width (100% of the header's content column) is the single "slot width" that framer-motion measures against — do not set an explicit pixel width on it.
2. Inside the wrapper, the draggable track: a `motion.div` with `drag="x"`, `style={{ x, width: '300%' }}`, `dragConstraints={viewportRef}` (ref-based constraint — framer-motion auto-derives `{ left: -2 * slotWidth, right: 0 }` from the size difference between this 3x-wide track and the 1x-wide `viewportRef` element, so no manual constraint math is needed), `dragElastic={0.15}`, `dragMomentum={false}` (must be false — otherwise framer-motion's own inertia animation races the explicit `animate()` snap called from `onDragEnd`), `onDragEnd={handleDragEnd}`, class `flex cursor-grab active:cursor-grabbing select-none`.
3. `const x = useMotionValue(0)` from `framer-motion`.
4. Compute `const weekOffsets = [weekOffset - 1, weekOffset, weekOffset + 1]` and render exactly 3 fixed-position slot `div`s via `.map((offset, i) => ...)`, keyed by fixed screen role (`key={i}`, or `key={['prev','current','next'][i]}`) — never keyed by the `offset` value itself, so slot identity stays pinned to its screen position and only its `days`/content updates when `weekOffset` changes (this is what makes the recentering effect in step 7 invisible). Each slot `div` has class `flex justify-between` and inline `style={{ width: '33.3333%' }}`, and contains the same 7 day-button markup that exists in the current file today (label span with `formatDayLabel`, day-number circle span with the existing `isSelected` styling, meal-dot span using `hasMeals`) — keep the visual markup/classes as-is, just evaluated per-slot via `getWeekDays(offset)` instead of once for the whole component.
5. Keep the existing `hasMeals(date: Date): boolean` helper (checks `meals.some((m) => isSameDay(new Date(m.timestamp), date))`) unchanged, called per-slot.
6. `const SWIPE_OFFSET_THRESHOLD = 80` and `const SWIPE_VELOCITY_THRESHOLD = 500` as module-level constants (same magnitudes the current file already uses) above the component.
7. Import `{ motion, useMotionValue, animate, type PanInfo }` from `'framer-motion'`. Use the standalone imperative `animate()` function to drive the `x` motion value — remove the `useAnimation` import and hook entirely; it is no longer used anywhere in the file.
8. `handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo)`: read `const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0` and `if (!slotWidth) return` as a guard. If `info.offset.x < -SWIPE_OFFSET_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD`: call `animate(x, -2 * slotWidth, { type: 'tween', duration: 0.2, ease: 'easeOut' })` and, on that animation's completion (its returned promise/`.then` or `onComplete` callback), call `onWeekChange(1)`. Else if `info.offset.x > SWIPE_OFFSET_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD`: mirror it — animate `x` to `0`, then call `onWeekChange(-1)` on completion. Else (below threshold): `animate(x, -slotWidth, { type: 'spring', stiffness: 400, damping: 30 })` to spring back to center — do not call `onWeekChange` in this branch.
9. Add a recenter helper (e.g. `function recenter()`) that reads `slotWidth` the same way as step 8 and calls `x.set(-slotWidth)` (an instant, non-animated jump via `.set`, never `animate()`, in this helper). Call it from a `useLayoutEffect` (imported from `'react'` — must be `useLayoutEffect`, not `useEffect`: it runs synchronously after DOM mutation but before the browser paints, so this recentering jump is invisible; `useEffect` would cause a visible one-frame flash of the wrong week) with dependency array `[weekOffset]`. By the time this effect runs, the 3 slots have already re-rendered using `weekOffsets` derived from the new `weekOffset` prop, so the fixed "current" slot (index 1) already shows the week that was just swiped to — jumping `x` back to `-slotWidth` re-centers the viewport on that same content with no visible movement.
10. Also call the same `recenter()` helper from a `window.addEventListener('resize', recenter)` registered inside a `useEffect` with an empty-ish setup (mount once) and cleanup that removes the listener, so rotating/resizing the viewport (or DevTools responsive resizing during manual verification) does not leave the track misaligned.

Do not introduce any new npm dependency — framer-motion ^12.42.0 is already installed and exports `useMotionValue`, `animate`, and `PanInfo`.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile type-check && grep -q "overflow-hidden" apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx && ! grep -q "useAnimation" apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx</automated>
  </verify>
  <done>
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx renders 3 fixed slots (prev/current/next), each showing 7 days via getWeekDays(weekOffset ± 0/1)
    - Outer viewport wrapper has data-testid="week-strip-viewport" and class overflow-hidden (plus touch-pan-y, overscroll-x-contain)
    - useAnimation import/hook removed; useMotionValue + imperative animate() drive the track instead
    - WeekStripProps interface is unchanged (weekOffset, selectedDate, meals, onDaySelect, onWeekChange)
    - pnpm --filter @ai-food/mobile type-check passes with 0 errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add automated regression tests for WeekStrip</name>
  <files>apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx</files>
  <behavior>
    - Test 1: renders 21 day-number buttons total (3 weeks x 7 days) — structural proof that prev/current/next are all mounted simultaneously (virtualization), not a single 7-day track
    - Test 2: the element with data-testid="week-strip-viewport" has class overflow-hidden — regression guard tied directly to the scrollbar-glitch fix
    - Test 3: clicking a day button in the rendered current week calls onDaySelect with a Date matching that day (getWeekDays(0)[i])
    - Test 4: a day with a matching meal (built from getWeekDays(0) + a fixture Meal) renders its meal-dot indicator, proving hasMeals logic survived the per-slot rewrite
  </behavior>
  <action>
Create apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx following the existing Vitest style used in apps/mobile/src/shared/lib/formatters.test.ts (explicit `import { describe, it, expect, vi } from 'vitest'`) plus `@testing-library/react` (`render`, `screen`, `fireEvent`).

Build fixture dates from `getWeekDays(0)` (imported from `@/shared/lib`) rather than hardcoded calendar dates, so the test is stable regardless of the date it runs on. Build a single fixture `Meal` (matching the `Meal` interface from `@ai-food/shared-types`: `id`, `timestamp`, `items: []`, `totalCalories`) with `timestamp` set to `getWeekDays(0)[2].toISOString()` (a mid-week day) to exercise the meal-dot test.

Render `<WeekStrip weekOffset={0} selectedDate={getWeekDays(0)[0]} meals={[fixtureMeal]} onDaySelect={onDaySelectMock} onWeekChange={onWeekChangeMock} />` with `onDaySelectMock = vi.fn()` and `onWeekChangeMock = vi.fn()`.

For Test 1, query all day-number buttons via their accessible role/text and assert the count is 21 (do not assert on framer-motion drag/animation internals — jsdom reports zero layout dimensions, so drag-distance-dependent behavior from Task 1 is intentionally out of scope for this automated suite and is covered instead by the manual checkpoint task in this plan).

For Test 2, use `screen.getByTestId('week-strip-viewport')` and assert `.className` includes `overflow-hidden`.

For Test 3, click the button showing `getWeekDays(0)[3].getDate()` within the current-week slot and assert `onDaySelectMock` was called with a Date where `isSameDay(calledWithDate, getWeekDays(0)[3])` is true (import `isSameDay` from `@/shared/lib` for the assertion).

For Test 4, assert the meal-dot marker (the small rounded span rendered under a day with meals) is present near the day matching `getWeekDays(0)[2]` — locate it via the day button's container and check for the dot's distinguishing class (whatever class Task 1's markup uses for a "has meal" state, e.g. contains `bg-emerald` and not `bg-transparent`/`opacity-0`), rather than an exact class-string match, so the test does not overfit to incidental styling.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile test -- WeekStrip</automated>
  </verify>
  <done>
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx exists with 4 passing tests (21-button structural check, overflow-hidden viewport check, day-click callback check, meal-dot check)
    - pnpm --filter @ai-food/mobile test -- WeekStrip passes with 0 failures
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human verify no-scrollbar + genuine carousel motion</name>
  <action>User manually drags/swipes the week strip on desktop and touch to confirm the scrollbar glitch is gone and the swipe now behaves as a real 3-week carousel, per Task 1's rewrite.</action>
  <what-built>
    WeekStrip.tsx rewritten as a 3-slot (prev/current/next) virtualized carousel with an overflow-hidden viewport wrapper, replacing the previous single-track fade/replace + unclipped-drag implementation.
  </what-built>
  <how-to-verify>
    1. Run `pnpm dev` from the repo root.
    2. Open http://localhost:5173 in a desktop browser (Chrome or Edge on Windows — these show non-overlay scrollbars, matching the original bug report).
    3. Click-drag the week strip left and right, both slowly and with a quick flick.
    4. Confirm no horizontal or vertical scrollbar appears on the page at any point — before, during, or immediately after the drag/release.
    5. While dragging (before release), confirm you can see the incoming week's day-numbers sliding in alongside the outgoing week as one continuous track — not the current week vanishing and a new one fading in from nothing.
    6. Release a flick or a drag past roughly 1/3 of the strip width — confirm it snaps fully into the next/previous week, and that the calorie header + meal list below update to match the new selected day/week (existing HomePage/DailyHeader/MealList wiring must still work unchanged).
    7. Release a small drag (a few pixels) — confirm it springs back to the same week and neither the header nor the meal list changes.
    8. Open Chrome DevTools device toolbar (e.g. iPhone 14 emulation) and repeat steps 3-7 with touch/pointer drag to confirm no scrollbar or visual glitch on touch input either.
  </how-to-verify>
  <resume-signal>Type "approved" or describe the issue (e.g. "scrollbar still appears on flick", "carousel snaps to the wrong week", "header/meal list didn't update after swipe")</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Pointer/touch input -> WeekStrip drag handler | Client-side gesture input only; no network or server trust boundary is crossed by this change |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Denial of Service (client) | WeekStrip onDragEnd / animate() calls | low | accept | Purely client-side UI animation; rapid or repeated drag gestures at worst cause visual jank, never a crash or data loss. dragMomentum={false} plus duration-bounded animate() calls prevent runaway/compounding animations. |
| T-quick-02 | Tampering | meals prop consumed by WeekStrip | low | accept | No new data path introduced — WeekStrip only reads meals already passed down from useDiaryStore (unchanged) and never writes to it; this quick task touches rendering/gesture logic only. |
</threat_model>

<verification>
1. `pnpm --filter @ai-food/mobile type-check` passes with 0 errors.
2. `pnpm --filter @ai-food/mobile test -- WeekStrip` passes (4 new tests green).
3. Manual checkpoint (Task 3) approved: no scrollbar during drag on desktop and touch, genuine 3-week carousel motion observed, existing selectedDate/weekOffset wiring unaffected.
</verification>

<success_criteria>
- No scrollbar (horizontal or vertical) appears at any point while dragging/swiping the week strip, on desktop mouse-drag and touch emulation.
- Swiping shows previous/current/next weeks as one continuously translating track, never a fade/replace of full content.
- DailyHeader.tsx, HomePage.tsx, MealList.tsx, and global.css are untouched (git diff shows only WeekStrip.tsx + new WeekStrip.test.tsx).
- Existing weekOffset/selectedDate behavior (Monday-fallback on week change, calorie header update, meal list filtering, "+ add food" button) continues to work exactly as before.
</success_criteria>

<output>
Create `.planning/quick/260705-psq-fix-weekstrip-swipe-scrollbar-appears-du/260705-psq-SUMMARY.md` when done, describing what was changed, files modified, the root cause of the scrollbar bug, and manual verification results.
</output>
