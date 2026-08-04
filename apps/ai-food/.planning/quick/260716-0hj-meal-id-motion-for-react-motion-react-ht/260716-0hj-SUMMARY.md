---
phase: quick-260716-0hj
plan: 01
subsystem: ui
tags: [delete-meal, swipe, framer-motion, bottom-sheet, zustand, fsd]

requires:
  - phase: entities/meal
    provides: useDiaryStore.removeMeal + MealCard
provides:
  - features/delete-meal confirm sheet + swipe wrapper
  - Meal detail delete button
  - Swipe-to-confirm on Home MealList and DiaryPage
affects: [meal-list, diary, meal-detail]

tech-stack:
  added: []
  patterns:
    - FSD features/delete-meal orchestrates delete; entity MealCard stays presentational
    - Swipe opens BottomSheet confirm; removeMeal only after explicit confirm
    - framer-motion drag="x" for swipe-to-reveal (same API as WeekStrip)

key-files:
  created:
    - apps/mobile/src/features/delete-meal/index.ts
    - apps/mobile/src/features/delete-meal/model/useConfirmDeleteMeal.ts
    - apps/mobile/src/features/delete-meal/ui/DeleteMealConfirmSheet.tsx
    - apps/mobile/src/features/delete-meal/ui/SwipeableMealCard.tsx
  modified:
    - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx
    - apps/mobile/src/widgets/meal-list/ui/MealList.tsx
    - apps/mobile/src/pages/diary/ui/DiaryPage.tsx

key-decisions:
  - "Confirm UI via existing BottomSheet (not window.confirm / new Dialog)"
  - "Import motion from framer-motion (already installed); no new motion package"
  - "Confirm sheet lives inside each SwipeableMealCard for simple wiring"
  - "removeMeal via useDiaryStore.getState(); toast.success after delete"

patterns-established:
  - "Swipe gesture never deletes — only openConfirm; confirmDelete is sole removeMeal path"
  - "didDrag click-capture guard prevents navigation after swipe"

requirements-completed: []

coverage:
  - id: D1
    description: "Удаление с /meal/:id через кнопку + BottomSheet подтверждение"
    verification:
      - kind: other
        ref: "pnpm --filter @ai-food/mobile type-check"
        status: pass
    human_judgment: true
    rationale: "Нужна ручная проверка кнопки и навигации после удаления"
  - id: D2
    description: "Свайп карточки в MealList и Diary открывает confirm; removeMeal только после Удалить"
    verification:
      - kind: unit
        ref: "apps/mobile/src/entities/meal/model/useDiaryStore.test.ts"
        status: pass
      - kind: other
        ref: "pnpm --filter @ai-food/mobile test"
        status: pass
    human_judgment: true
    rationale: "Жест свайпа и конфликт drag/click требуют ручной проверки на устройстве"
  - id: D3
    description: "analyzing-карточки без swipe; тап без свайпа открывает деталь"
    verification: []
    human_judgment: true
    rationale: "Gesture edge cases не покрыты автотестами"

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-0hj Plan 01: Meal delete (detail + swipe) Summary

**Удаление приёма пищи с подтверждением: кнопка на `/meal/:id` и свайп влево в списках через `features/delete-meal` + `removeMeal` + BottomSheet.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-15T21:25:11Z
- **Completed:** 2026-07-15T21:28:00Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- FSD-фича `features/delete-meal`: hook подтверждения, BottomSheet с русскими строками, SwipeableMealCard на framer-motion
- MealDetailPage: кнопки удаления (шапка + низ) → confirm → `removeMeal` + navigate `/` + toast
- MealList и DiaryPage используют SwipeableMealCard; analyzing без drag; silent delete отсутствует

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9ea28e0 | feat(quick-260716-0hj): add delete-meal confirm hook and sheet |
| 2 | 1893781 | feat(quick-260716-0hj): add delete button on meal detail page |
| 3 | 93da285 | feat(quick-260716-0hj): swipe-to-confirm delete on meal lists |
| — | d12ce03 | refactor(quick-260716-0hj): simplify confirm delete hook style |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints; delete stays local via Zustand persist.

## Verification

- `pnpm --filter @ai-food/mobile type-check` — pass
- `pnpm --filter @ai-food/mobile test` — 82 tests pass

## Self-Check: PASSED

- FOUND: apps/mobile/src/features/delete-meal/index.ts
- FOUND: apps/mobile/src/features/delete-meal/model/useConfirmDeleteMeal.ts
- FOUND: apps/mobile/src/features/delete-meal/ui/DeleteMealConfirmSheet.tsx
- FOUND: apps/mobile/src/features/delete-meal/ui/SwipeableMealCard.tsx
- FOUND commits: 9ea28e0, 1893781, 93da285, d12ce03
