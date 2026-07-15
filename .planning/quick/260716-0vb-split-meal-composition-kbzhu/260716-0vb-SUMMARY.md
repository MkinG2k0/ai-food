---
phase: quick-260716-0vb
plan: 01
subsystem: api
tags: [nutrition, composition, items, analyze-food, useSaveMeal, shared-types]

requires: []
provides:
  - NutritionResult.items with per-component КБЖУ
  - SYSTEM_PROMPT requesting multi-item composition
  - useSaveMeal mapping items → FoodItem[]
affects: [meal-detail composition UI]

tech-stack:
  added: []
  patterns:
    - "NutritionResult.items validated client-side before diary write"
    - "Empty items[] falls back to single FoodItem from foodName"

key-files:
  created: []
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
    - apps/mobile/src/features/save-meal/model/useSaveMeal.ts
    - apps/mobile/src/features/save-meal/model/useSaveMeal.test.ts
    - apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts

key-decisions:
  - "totalCalories from sum of mapped items when items present; top-level calories only on empty-items fallback"
  - "Empty items[] accepted for backward-compatible gateway responses"

patterns-established:
  - "isNutritionItem validates each composition row before accepting NutritionResult"

requirements-completed: [QUICK-0vb]

coverage:
  - id: D1
    description: NutritionResult includes validated items[] with per-item КБЖУ
    requirement: QUICK-0vb
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#resolves AnalyzeFoodResponse on valid gateway NutritionResult JSON
        status: pass
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#rejects ANALYSIS_FAILED when an item is missing name or has non-number calories
        status: pass
    human_judgment: false
  - id: D2
    description: useSaveMeal persists N FoodItems from analyze items (empty items → foodName fallback)
    requirement: QUICK-0vb
    verification:
      - kind: unit
        ref: apps/mobile/src/features/save-meal/model/useSaveMeal.test.ts#maps multiple analyze items to FoodItem[] with unique ids
        status: pass
      - kind: unit
        ref: apps/mobile/src/features/save-meal/model/useSaveMeal.test.ts#falls back to single FoodItem from foodName when items is empty
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-0vb Plan 01: Split meal composition КБЖУ Summary

**AI analysis now returns a composition array with per-item macros; photo saves write multiple FoodItems so MealDetail «Состав» shows separate components.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T21:41:40Z
- **Completed:** 2026-07-15T21:44:37Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `NutritionItem` + `items: NutritionItem[]` to shared `NutritionResult`
- Updated SYSTEM_PROMPT and `isNutritionResult` to require/validate composition rows (empty array OK)
- `useSaveMeal` maps items → unique `FoodItem[]` with `totalCalories` from item sum; empty items keeps foodName fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + SYSTEM_PROMPT + validation** — RED `c4ae029` (test), GREEN `b565a0a` (feat)
2. **Task 2: useSaveMeal maps items → FoodItem[]** — RED `1b20699` (test), GREEN `306ce93` (feat)

**Plan metadata:** skipped (orchestrator handles docs commit)

## Files Created/Modified

- `packages/shared-types/src/index.ts` — `NutritionItem`, `NutritionResult.items`
- `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts` — prompt + items validation
- `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts` — multi-item / empty / invalid cases
- `apps/mobile/src/features/save-meal/model/useSaveMeal.ts` — multi-item diary mapping
- `apps/mobile/src/features/save-meal/model/useSaveMeal.test.ts` — multi-item + empty fallback tests
- `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts` — `items: []` on mock for type-check

## Decisions Made

- When `items.length > 0`, `totalCalories` is the sum of mapped item calories (composition is source of truth)
- Empty `items` keeps prior single-item save from top-level macros / `foodName`
- Backend untouched; MealDetailPage / NutritionCard unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Composition data path is ready; manual UAT: photograph a plate with 2+ components and confirm `/meal/:id` «Состав» lists separate rows with КБЖУ.

## TDD Gate Compliance

- RED commits present: `c4ae029`, `1b20699`
- GREEN commits present after RED: `b565a0a`, `306ce93`

## Self-Check: PASSED

- FOUND: `packages/shared-types/src/index.ts`
- FOUND: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- FOUND: `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- FOUND: commits `c4ae029`, `b565a0a`, `1b20699`, `306ce93`
- FOUND: `.planning/quick/260716-0vb-split-meal-composition-kbzhu/260716-0vb-SUMMARY.md`

---
*Phase: quick-260716-0vb*
*Completed: 2026-07-16*
