---
phase: quick-260716-1ml
plan: 01
subsystem: ui
tags: [zustand, meal-diary, framer-motion, edit-meal, FSD]

requires:
  - phase: quick-260716-0hj
    provides: meal delete confirm + SwipeableMealCard swipe thresholds
  - phase: quick-260716-0vb
    provides: Meal.items[] FoodItem composition
provides:
  - updateMealItem / removeMealItem / updateMealNutrition store API
  - features/edit-meal editable composition + dish-level KBJU
  - MealDetailPage wired for edit/delete items
affects: [meal-detail, diary-store, daily-totals]

tech-stack:
  added: []
  patterns:
    - Meal.items[] as source of truth; totalCalories = sum(items.calories)
    - Proportional per-nutrient scale via updateMealNutrition
    - Confirm-before-delete BottomSheet for items (mirrors meal delete)

key-files:
  created:
    - apps/mobile/src/entities/meal/model/mealNutritionMath.ts
    - apps/mobile/src/features/edit-meal/index.ts
    - apps/mobile/src/features/edit-meal/model/useConfirmDeleteMealItem.ts
    - apps/mobile/src/features/edit-meal/ui/DeleteItemConfirmSheet.tsx
    - apps/mobile/src/features/edit-meal/ui/EditableFoodItemCard.tsx
    - apps/mobile/src/features/edit-meal/ui/MealSummaryEditor.tsx
  modified:
    - apps/mobile/src/entities/meal/model/useDiaryStore.ts
    - apps/mobile/src/entities/meal/model/useDiaryStore.test.ts
    - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx

key-decisions:
  - "D-01: items[] owns macros; totalCalories always recomputed from sum"
  - "D-04: dish-level nutrient edit scales all items proportionally"
  - "Native number/text inputs + Tailwind (no shadcn Input)"
  - "Single DeleteItemConfirmSheet on page; cards call onRequestDelete"

patterns-established:
  - "mealNutritionMath pure helpers colocated with diary store"
  - "edit-meal feature slice: confirm hook + sheets + editors; page only composes"

requirements-completed: [QUICK-1ml]

coverage:
  - id: D1
    description: Store mutations update/remove/scale items with totalCalories sync and empty-items allowed
    requirement: QUICK-1ml
    verification:
      - kind: unit
        ref: apps/mobile/src/entities/meal/model/useDiaryStore.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: MealDetailPage editable dish + items with swipe/button item delete confirm; meal delete intact
    requirement: QUICK-1ml
    verification:
      - kind: other
        ref: pnpm type-check (apps/mobile)
        status: pass
    human_judgment: true
    rationale: Manual smoke on /meal/:id for edit sync, swipe delete, dish-level scale

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-1ml Plan 01: Edit/Delete Composition KBJU Summary

**MealDetailPage now edits FoodItem КБЖУ and dish-level macros with diary store as SoT; item delete uses swipe/trash + BottomSheet confirm; empty composition leaves the meal.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-15T22:13:21Z
- **Completed:** 2026-07-15T22:17:21Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Added `updateMealItem`, `removeMealItem`, `updateMealNutrition` with sanitize (>=0 finite) and proportional scale
- New FSD feature `features/edit-meal`: editable cards, summary editor, item delete confirm
- Wired MealDetailPage; meal-level delete (header + button + DeleteMealConfirmSheet) unchanged

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 RED | f9e579d | test: failing store mutation tests |
| 1 GREEN | b8bc52f | feat: store mutations + mealNutritionMath |
| 2 | b26f07a | feat: edit-meal UI + MealDetailPage wiring |

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED: f9e579d `test(quick-260716-1ml): add failing tests for meal item mutations`
- GREEN: b8bc52f `feat(quick-260716-1ml): implement meal item store mutations`

## Known Stubs

None.

## Threat Flags

None — sanitize clamp mitigates T-1ml-01; BottomSheet confirm mitigates T-1ml-03; no new endpoints or packages.

## Manual Smoke Notes

1. Open `/meal/:id` — edit item calories → totals/bars update
2. Swipe left or trash on item → confirm → item gone; last item → empty state, meal remains
3. Edit dish protein → items scale; meal name editable
4. Header/bottom delete meal still works with confirm

## Self-Check: PASSED

- All key files FOUND
- Commits f9e579d, b8bc52f, b26f07a FOUND
