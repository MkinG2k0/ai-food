---
phase: quick-260716-1zl
plan: 01
subsystem: ui
tags: [meal-detail, edit-meal, FSD, framer-motion, FoodMacrosBadges]

requires:
  - phase: quick-260716-1ml
    provides: updateMealItem/removeMealItem, DeleteItemConfirmSheet, MealSummaryEditor
  - phase: quick-260716-0hj
    provides: SwipeableMealCard DRAG_CLICK_GUARD pattern
provides:
  - FoodMacrosBadges shared emerald/blue/red/amber badges
  - FoodItemDisplayCard display-only composition with swipe+navigate
  - FoodItemEditPage at /meal/:mealId/item/:itemId under ProfileGuard
affects: [meal-detail, meal-card, edit-meal]

tech-stack:
  added: []
  patterns:
    - Composition list display-only; edit on dedicated page
    - Shared FoodMacrosBadges for MealCard and composition cards
    - DRAG_CLICK_GUARD=10 to block click-after-swipe navigation

key-files:
  created:
    - apps/mobile/src/entities/meal/ui/FoodMacrosBadges.tsx
    - apps/mobile/src/features/edit-meal/ui/FoodItemDisplayCard.tsx
    - apps/mobile/src/pages/food-item-edit/ui/FoodItemEditPage.tsx
    - apps/mobile/src/pages/food-item-edit/index.ts
  modified:
    - apps/mobile/src/entities/meal/ui/MealCard.tsx
    - apps/mobile/src/entities/meal/index.ts
    - apps/mobile/src/features/edit-meal/index.ts
    - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx
    - apps/mobile/src/app/router.tsx
  deleted:
    - apps/mobile/src/features/edit-meal/ui/EditableFoodItemCard.tsx

key-decisions:
  - "D-01: composition on MealDetail is display-only with MealCard-colored badges"
  - "D-02: click navigates to /meal/:mealId/item/:itemId; swipe/trash keep confirm on detail"
  - "D-03: FoodItemEditPage edits integers via sanitizeNutrient + updateMealItem"
  - "D-04: FoodMacrosBadges extracted; MealSummaryEditor left unchanged"

patterns-established:
  - "FoodMacrosBadges in entities/meal for reusable colored KBJU chips"
  - "pages/food-item-edit FSD slice with barrel + ProfileGuard route"

requirements-completed: [QUICK-1zl]

coverage:
  - id: D1
    description: Composition list display-only with shared colored macros badges; swipe/trash delete confirm; click opens edit route
    requirement: QUICK-1zl
    verification:
      - kind: other
        ref: pnpm exec tsc --noEmit (apps/mobile)
        status: pass
    human_judgment: true
    rationale: Visual parity with MealCard badges and swipe-vs-click need manual smoke on /meal/:id
  - id: D2
    description: FoodItemEditPage persists integer KBJU via updateMealItem+sanitizeNutrient; optional delete returns to meal detail
    requirement: QUICK-1zl
    verification:
      - kind: unit
        ref: apps/mobile/src/entities/meal/model/useDiaryStore.test.ts
        status: pass
      - kind: other
        ref: pnpm exec tsc --noEmit (apps/mobile)
        status: pass
    human_judgment: true
    rationale: Route + form UX need brief manual check on /meal/:mealId/item/:itemId

duration: 3min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-1zl Plan 01: Composition Display + Edit Page Summary

**MealDetail composition is display-only with MealCard-colored macros badges; click opens `/meal/:mealId/item/:itemId` to edit integer КБЖУ; swipe/trash delete confirm stays on the detail page.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T22:28:15Z
- **Completed:** 2026-07-15T22:32:00Z
- **Tasks:** 2/2
- **Files modified:** 9 (including 1 deletion)

## Accomplishments

- Shared `FoodMacrosBadges` (emerald kcal / blue Б / red Ж / amber У) used by MealCard and composition cards
- Replaced inline `EditableFoodItemCard` with `FoodItemDisplayCard` (swipe + trash + DRAG_CLICK_GUARD navigate)
- Added `FoodItemEditPage` + ProfileGuard route for per-ingredient KBJU edit and optional delete

## Task Commits

1. **Task 1: FoodMacrosBadges + display composition card** - `1dbadd4` (feat)
2. **Task 2: FoodItemEditPage + route** - `7cb65af` (feat)

**Plan metadata:** not committed (orchestrator handles docs)

## Files Created/Modified

- `apps/mobile/src/entities/meal/ui/FoodMacrosBadges.tsx` - shared colored KBJU badges
- `apps/mobile/src/entities/meal/ui/MealCard.tsx` - uses FoodMacrosBadges
- `apps/mobile/src/entities/meal/index.ts` - exports FoodMacrosBadges + sanitizeNutrient
- `apps/mobile/src/features/edit-meal/ui/FoodItemDisplayCard.tsx` - display card with swipe/navigate
- `apps/mobile/src/features/edit-meal/ui/EditableFoodItemCard.tsx` - deleted
- `apps/mobile/src/features/edit-meal/index.ts` - export FoodItemDisplayCard
- `apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx` - compose display cards
- `apps/mobile/src/pages/food-item-edit/ui/FoodItemEditPage.tsx` - item edit page
- `apps/mobile/src/pages/food-item-edit/index.ts` - FSD barrel
- `apps/mobile/src/app/router.tsx` - `/meal/:mealId/item/:itemId` under ProfileGuard

## Decisions Made

None beyond locked D-01..D-05 — plan executed as specified. MealSummaryEditor unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Composition UX matches home MealCard; item edit is a dedicated route. Ready for visual UAT on detail → edit → back/delete flows.

## Self-Check: PASSED

- FOUND: FoodMacrosBadges.tsx, FoodItemDisplayCard.tsx, FoodItemEditPage.tsx
- FOUND: commits 1dbadd4, 7cb65af

---
*Phase: quick-260716-1zl*
*Completed: 2026-07-16*
