# Meal Custom Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lazy-load Markdown “Дополнительно” on meal detail from Settings `customInstructions` via a second AI call (not during first scan).

**Architecture:** First analyze unchanged. On `MealDetailPage`, if instructions are non-empty and `meal.customContent === undefined`, call `fetchMealCustomContentApi` (text-only, meal context), persist string (including `""`) via `updateMeal`, render with `react-markdown`. Refine updates `customContent` only when the JSON result includes the field.

**Tech Stack:** TypeScript, Zustand diary, TanStack Query, OpenRouter gateway via axios (same as refine), `react-markdown` + `remark-gfm`.

**Spec:** `docs/superpowers/specs/2026-07-19-meal-custom-content-design.md`

## Global Constraints

- Reuse single Settings field `customInstructions` (max 2000).
- Do not request `customContent` in first analyze XML.
- `undefined` = not loaded; `""` = loaded empty (hide block, no re-fetch).
- No photo on second call; no `rehype-raw`.
- FSD barrels for cross-slice imports.

## File map

| File | Role |
| --- | --- |
| `packages/shared-types/src/index.ts` | `Meal.customContent?`, `NutritionResult.customContent?` |
| `apps/mobile/src/pages/settings/ui/SettingsPage.tsx` | Updated copy |
| `apps/mobile/src/features/analyze-food/api/fetchMealCustomContentApi.ts` | Second AI call |
| `apps/mobile/src/features/analyze-food/api/fetchMealCustomContentApi.test.ts` | API tests |
| `apps/mobile/src/features/analyze-food/model/useMealCustomContent.ts` | Query + persist |
| `apps/mobile/src/features/analyze-food/ui/MealCustomContentBlock.tsx` | Loading / MD / error |
| `apps/mobile/src/features/analyze-food/index.ts` | Barrel exports |
| `apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx` | Mount block |
| `apps/mobile/src/features/analyze-food/api/refineMealApi.ts` | Optional field in prompt |
| `apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts` | Accept optional string |
| `apps/mobile/src/features/refine-meal/model/useRefineMeal.ts` | Merge only if defined |
| `apps/mobile/package.json` | `react-markdown`, `remark-gfm` |

---

### Task 1: Types + Settings copy + deps

- [ ] Add `customContent?: string` to `Meal` and `NutritionResult` with JSDoc: Markdown from lazy custom-instructions answer; omit on legacy.
- [ ] Update Settings description + placeholder per spec.
- [ ] `pnpm --filter @ai-food/mobile add react-markdown remark-gfm`
- [ ] Commit: `feat: add customContent type and settings copy`

### Task 2: `fetchMealCustomContentApi`

**Produces:** `fetchMealCustomContentApi(input): Promise<string>`

```ts
export interface MealCustomContentInput {
  mealContext: {
    name?: string;
    totalCalories: number;
    items: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number; grams?: number }>;
  };
  customInstructions: string;
  model?: string;
}
```

- System: answer only content requests in instructions as Markdown; prefs-only → empty; Russian; no XML/JSON wrapper.
- User: meal JSON + instructions.
- Axios POST like refine (non-stream); strip ``` fences; trim; truncate to 8000 chars.
- Empty instructions → reject or return `""` (caller should not call).
- Tests: env missing, strips fences, returns trimmed MD, allows empty.
- Commit: `feat: add fetchMealCustomContentApi`

### Task 3: Hook + UI + MealDetailPage

- [ ] `useMealCustomContent(mealId)`:
  - enabled when meal ok, instructions trimmed non-empty, `customContent === undefined`
  - onSuccess → `updateMeal(id, { customContent })` (always set string)
  - expose `{ isLoading, isError, error, refetch, content }`
- [ ] `MealCustomContentBlock`: if no instructions → null; if undefined+loading → skeleton; if error → retry; if non-empty → ReactMarkdown+remarkGfm; if `""` → null
- [ ] Wire on MealDetailPage after `MealSummaryEditor`, before «Дополнить»
- [ ] Commit: `feat: lazy-load custom Markdown on meal detail`

### Task 4: Refine merge

- [ ] Add to refine system prompt: optional `"customContent": string` — include **only** when user correction explicitly asks to update the extra/custom answer; otherwise omit the key.
- [ ] `isNutritionResult`: if `customContent !== undefined`, must be string.
- [ ] `useRefineMeal`: `...(result.customContent !== undefined ? { customContent: result.customContent } : {})`
- [ ] Test: omit field → meal keeps prior; present → updates.
- [ ] Commit: `feat: refine optional customContent update`

### Task 5: Verify

- [ ] `pnpm --filter @ai-food/mobile test` (relevant suites)
- [ ] `pnpm --filter @ai-food/mobile type-check`
