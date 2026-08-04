---
status: complete
---

# Quick Task 260716-i2n Summary

## Done

- Updated vision prompt (`NO_FOOD_PROMPT_RULE`) in mobile gateway client and backend route
- Model must return `{ noFood: true, reason }` for non-food photos instead of inventing dish names/KBЖУ
- Client rejects with `NO_FOOD_DETECTED` (422); meal stays in `error` state with `analyzeErrorCode`
- `MealCard` shows «На фото не обнаружена еда…» and existing «Повторить» button

## Files

- `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
- `apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts`
- `apps/mobile/src/features/save-meal/model/analyzeErrorPatch.ts`
- `apps/mobile/src/features/save-meal/model/useSaveMeal.ts`
- `apps/mobile/src/features/save-meal/model/useRetryAnalyzeMeal.ts`
- `apps/mobile/src/entities/meal/ui/MealCard.tsx`
- `apps/backend/src/routes/analyze-food.ts`
- `packages/shared-types/src/index.ts`

## Verification

- Mobile tests: 56 passed (analyzeFoodApi, nutritionResultSchema, useSaveMeal)
- `pnpm --filter @ai-food/mobile type-check` passed
