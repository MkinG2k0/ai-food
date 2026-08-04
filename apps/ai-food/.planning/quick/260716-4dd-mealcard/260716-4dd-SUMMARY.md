---
phase: quick-260716-4dd
plan: 01
subsystem: ui
tags: [meal-card, macros, density, compact, badges, react]

requires:
  - phase: quick-260716-3qy
    provides: FoodMacrosBadges with fiber (Кл) pill badges shared by MealCard/FoodItemDisplayCard
provides:
  - FoodMacrosBadges density prop (badges | compact)
  - MealCard ready/analyzing compact layout (large kcal + Б/Ж/У/К circles)
affects: [meal-list, diary UI]

tech-stack:
  added: []
  patterns:
    - "Optional density prop on shared presentational component — default preserves existing call sites"

key-files:
  created: []
  modified:
    - apps/mobile/src/entities/meal/ui/FoodMacrosBadges.tsx
    - apps/mobile/src/entities/meal/ui/MealCard.tsx

key-decisions:
  - "D-01: MealCard compact = large calories + colored letter circles Б/Ж/У/К; FoodItemDisplayCard keeps pill badges via density default"
  - "Single FoodMacrosBadges component with density prop rather than a second public component"

patterns-established:
  - "density='compact' for narrow MealCard rows; density default/'badges' for FoodItemDisplayCard pills"

requirements-completed: [QUICK-4dd]

coverage:
  - id: D1
    description: "FoodMacrosBadges supports density=compact (large kcal + Б/Ж/У/К circles, no wrap) while default stays pills"
    requirement: QUICK-4dd
    verification:
      - kind: other
        ref: "pnpm --filter @ai-food/mobile exec tsc --noEmit (task files clean; pre-existing healthiness test failures out of scope)"
        status: pass
    human_judgment: true
    rationale: "Visual parity with reference screenshot (circle size, spacing, no wrap) needs human look at MealCard vs FoodItemDisplayCard"
  - id: D2
    description: "MealCard ready uses compact macros; analyzing skeleton is kcal bar + four circles; FoodItemDisplayCard unchanged"
    requirement: QUICK-4dd
    verification:
      - kind: other
        ref: "grep MealCard density=compact; FoodItemDisplayCard has no density prop"
        status: pass
    human_judgment: true
    rationale: "Analyzing skeleton and ready-row layout must match D-01 visually"

duration: 2min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-4dd Plan 01: MealCard Compact Layout Summary

**MealCard diary rows now use large calories plus colored Б/Ж/У/К letter circles (D-01); FoodItemDisplayCard keeps wrapping pill badges via FoodMacrosBadges default density.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-16T00:12:03Z
- **Completed:** 2026-07-16T00:13:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added optional `density?: 'badges' | 'compact'` to `FoodMacrosBadges` (default `'badges'` preserves pills)
- Compact mode: large tabular kcal + emerald «ккал», then blue/red/amber/teal circles Б/Ж/У/К with gram values in a non-wrapping row
- MealCard ready passes `density="compact"`; analyzing skeleton mirrors compact (kcal bar + four circle skeletons)
- FoodItemDisplayCard untouched — still default pills including «Кл»

## Task Commits

Each task was committed atomically:

1. **Task 1: Add compact density to FoodMacrosBadges** - `b549a54` (feat)
2. **Task 2: Wire MealCard ready and analyzing to compact** - `98203ef` (feat)

**Plan metadata:** skipped (orchestrator handles docs commit per constraints)

## Files Created/Modified

- `apps/mobile/src/entities/meal/ui/FoodMacrosBadges.tsx` — density prop + CompactMacros + LetterCircle
- `apps/mobile/src/entities/meal/ui/MealCard.tsx` — density=compact + compact analyzing skeleton

## Decisions Made

- Followed locked D-01: MealCard compact circles vs FoodItemDisplayCard pills
- Prefer optional `density` on existing component over a second public export
- Fiber letter «К» in compact; full «Кл» remains on badges only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Full-project `tsc --noEmit` reports pre-existing failures in `useRefineMeal.test.ts` / `useSaveMeal.test.ts` missing `healthiness` (parallel quick task 260716-4aa). Out of scope for 4dd; task source files type-check clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Quick task complete; diary list MealCards should be verified visually against the reference screenshot
- No blockers for Phase 2 or other quick work

## Self-Check: PASSED

- FOUND: `apps/mobile/src/entities/meal/ui/FoodMacrosBadges.tsx`
- FOUND: `apps/mobile/src/entities/meal/ui/MealCard.tsx`
- FOUND: commit `b549a54`
- FOUND: commit `98203ef`
- FOUND: MealCard `density="compact"`
- FOUND: FoodItemDisplayCard has no `density` prop (default pills)

---
*Phase: quick-260716-4dd*
*Completed: 2026-07-16*
