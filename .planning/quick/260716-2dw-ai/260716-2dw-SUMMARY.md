---
phase: quick-260716-2dw
plan: 01
subsystem: ui
tags: [refine-meal, ai-gateway, tanstack, zustand, bottom-sheet]

requires:
  - phase: quick-260716-05y
    provides: client VITE_AI_GATEWAY analyzeFoodApi pattern
  - phase: quick-260716-24h
    provides: FoodItem.grams + resolveItemGrams
provides:
  - refineMealApi for text/image meal corrections via AI Gateway
  - useRefineMeal diary apply hook
  - RefineMealSheet + MealDetailPage «Дополнить» entry point
affects: [meal-detail, diary-store, analyze-food]

tech-stack:
  added: []
  patterns:
    - Client AI Gateway refine separate from analyzeFoodApi (no backend)
    - features/refine-meal slice with hook + BottomSheet; toast in sheet
    - Image-preferential refine with text-only fallback on Filesystem read failure

key-files:
  created:
    - apps/mobile/src/features/analyze-food/api/refineMealApi.ts
    - apps/mobile/src/features/analyze-food/api/refineMealApi.test.ts
    - apps/mobile/src/features/refine-meal/model/useRefineMeal.ts
    - apps/mobile/src/features/refine-meal/model/useRefineMeal.test.ts
    - apps/mobile/src/features/refine-meal/ui/RefineMealSheet.tsx
    - apps/mobile/src/features/refine-meal/index.ts
  modified:
    - apps/mobile/src/features/analyze-food/index.ts
    - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx

key-decisions:
  - "D-04/D-07: client refineMealApi + features/refine-meal slice; backend untouched"
  - "D-05: optional imageDataUrl from Filesystem; omit on read failure"
  - "Duplicated minimal isNutritionResult/mapGatewayError in refineMealApi to avoid analyzeFoodApi refactor"

patterns-established:
  - "Meal correction: RefineMealSheet → useRefineMeal → refineMealApi → updateMeal"
  - "Reuse FOOD_NAME_PROMPT_RULE + COMPOSITION_PROMPT_RULE in refine system prompt"

requirements-completed: [QUICK-2dw]

coverage:
  - id: D1
    description: "refineMealApi posts text-only and multimodal refine to AI Gateway and returns NutritionResult"
    requirement: QUICK-2dw
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/refineMealApi.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: "useRefineMeal maps NutritionResult onto diary meal via updateMeal with resolveItemGrams"
    requirement: QUICK-2dw
    verification:
      - kind: unit
        ref: apps/mobile/src/features/refine-meal/model/useRefineMeal.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: "MealDetailPage shows «Дополнить» between MealSummaryEditor and Состав; RefineMealSheet submits with loading + toasts"
    requirement: QUICK-2dw
    verification:
      - kind: other
        ref: pnpm --filter @ai-food/mobile exec tsc --noEmit
        status: pass
    human_judgment: true
    rationale: "Visual placement and toast UX need manual smoke on meal detail page"

duration: 12min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-2dw Plan 01: Meal Refine «Дополнить» Summary

**Client AI Gateway refineMealApi + useRefineMeal + MealDetailPage «Дополнить» BottomSheet for free-text meal corrections**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-15T22:47:15Z
- **Completed:** 2026-07-15T22:52:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added `refineMealApi` — text-only and optional image multimodal refine via VITE_AI_GATEWAY (backend untouched)
- Added `useRefineMeal` — loads meal image when possible, maps NutritionResult with `resolveItemGrams`, persists via `updateMeal`
- Wired MealDetailPage «Дополнить» button (below MealSummaryEditor, above «Состав») and `RefineMealSheet` with loading + sonner toasts

## Task Commits

1. **Task 1: refineMealApi** - `d5d9e7c` (feat)
2. **Task 2: useRefineMeal** - `ae6c22b` (feat)
3. **Task 3: RefineMealSheet + MealDetailPage** - `40965ca` (feat)

**Plan metadata:** skipped (commit_docs disabled by orchestrator constraint — orchestrator commits SUMMARY/STATE)

## Files Created/Modified

- `apps/mobile/src/features/analyze-food/api/refineMealApi.ts` — AI Gateway refine request/response
- `apps/mobile/src/features/analyze-food/api/refineMealApi.test.ts` — gateway happy/error tests
- `apps/mobile/src/features/analyze-food/index.ts` — export refineMealApi
- `apps/mobile/src/features/refine-meal/model/useRefineMeal.ts` — apply hook
- `apps/mobile/src/features/refine-meal/model/useRefineMeal.test.ts` — hook unit tests
- `apps/mobile/src/features/refine-meal/ui/RefineMealSheet.tsx` — BottomSheet UI
- `apps/mobile/src/features/refine-meal/index.ts` — FSD barrel
- `apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx` — «Дополнить» wiring

## Decisions Made

- Separate `refineMealApi` export (do not break `analyzeFoodApi` signature)
- Duplicate small validators/error mapping in refineMealApi instead of large shared extract
- Sheet owns toast; hook stays UI-free
- Disable close/submit while `isSubmitting` (T-2dw-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - uses existing `VITE_AI_GATEWAY_URL` / `VITE_AI_GATEWAY_API_KEY`.

## Next Phase Readiness

- Quick task complete; meal detail refine path ready for manual smoke
- Backend still mock-only for analyze; refine is client-gateway only (locked D-04)

## Self-Check: PASSED

- FOUND: apps/mobile/src/features/analyze-food/api/refineMealApi.ts
- FOUND: apps/mobile/src/features/refine-meal/model/useRefineMeal.ts
- FOUND: apps/mobile/src/features/refine-meal/ui/RefineMealSheet.tsx
- FOUND: commits d5d9e7c, ae6c22b, 40965ca
- Backend apps/backend: no file changes

---
*Phase: quick-260716-2dw*
*Completed: 2026-07-16*
