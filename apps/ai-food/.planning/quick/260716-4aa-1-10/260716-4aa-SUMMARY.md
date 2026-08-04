---
phase: quick-260716-4aa
plan: 01
subsystem: ui
tags: [nutrition, healthiness, confidence, meal-detail, openai, zod]

requires: []
provides:
  - "NutritionResult.healthiness (1–10) validated in analyze/refine/backend"
  - "Meal.healthiness? + Meal.confidence? persisted from AI"
  - "Meal Detail Полезность/Точность range bars after date"
affects: [meal-detail, analyze-food, refine-meal, diary]

tech-stack:
  added: []
  patterns:
    - "AI quality signals: required on NutritionResult, optional on Meal for legacy"
    - "Display accuracy as Math.round(confidence * 100)%; keep storage as 0–1"

key-files:
  created: []
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/refineMealApi.ts
    - apps/backend/src/routes/analyze-food.ts
    - apps/mobile/src/features/save-meal/model/useSaveMeal.ts
    - apps/mobile/src/features/refine-meal/model/useRefineMeal.ts
    - apps/mobile/src/features/edit-meal/ui/MealSummaryEditor.tsx

key-decisions:
  - "D-01–D-06 honored: AI-sourced scores, ranges after date, healthiness 1–10 + confidence→%, Russian labels, legacy hide, MacroBar UI"
  - "Field names healthiness?/confidence? on Meal; no separate recognitionAccuracy field"

patterns-established:
  - "Optional Meal metadata from AI: omit UI rows when undefined (no fake N/A)"

requirements-completed: [QUICK-4aa]

coverage:
  - id: D1
    description: "NutritionResult requires healthiness 1–10; validators reject missing/out-of-range"
    requirement: QUICK-4aa
    verification:
      - kind: unit
        ref: "apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#rejects when healthiness missing/out of range"
        status: pass
      - kind: unit
        ref: "apps/backend/src/routes/analyze-food.test.ts#rejects out-of-range healthiness"
        status: pass
    human_judgment: false
  - id: D2
    description: "Save and refine persist healthiness + confidence onto Meal"
    requirement: QUICK-4aa
    verification:
      - kind: unit
        ref: "apps/mobile/src/features/save-meal/model/useSaveMeal.test.ts#persists scores"
        status: pass
      - kind: unit
        ref: "apps/mobile/src/features/refine-meal/model/useRefineMeal.test.ts#persists scores"
        status: pass
    human_judgment: false
  - id: D3
    description: "Meal Detail shows Полезность/Точность MacroBars after date; legacy hides block"
    requirement: QUICK-4aa
    verification:
      - kind: manual_procedural
        ref: "Open meal detail after analyze; confirm bars under date; open legacy meal without fields"
        status: unknown
    human_judgment: true
    rationale: "Visual placement and legacy hide need human eyeball on Meal Detail"

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-4aa Plan 01: Meal healthiness & accuracy ranges Summary

**AI analysis now returns and persists healthiness (1–10) plus recognition confidence; Meal Detail shows Russian MacroBar ranges «Полезность» / «Точность» under the date, hidden for legacy meals.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-16T00:08:57Z
- **Completed:** 2026-07-16T00:13:30Z
- **Tasks:** 2/2
- **Files modified:** 13 (types, APIs, backend, save/refine, UI, tests)

## Accomplishments

- Extended shared types: required `NutritionResult.healthiness`; optional `Meal.healthiness?` / `Meal.confidence?`
- Wired analyze + refine + backend prompts/validators for healthiness 1–10 (confidence stays 0–1)
- Persisted both scores on save (items + empty-items branches) and refine; MealSummaryEditor MacroBars after date

## Task Commits

1. **Task 1 RED:** `0fa166c` — test(quick-260716-4aa-01): add failing tests for healthiness schema
2. **Task 1 GREEN:** `3aca94d` — feat(quick-260716-4aa-01): add healthiness to NutritionResult schema
3. **Task 2 RED:** `38c16b4` — test(quick-260716-4aa-01): assert healthiness and confidence persist
4. **Task 2 GREEN:** `18185df` — feat(quick-260716-4aa-01): persist AI scores and show meal detail ranges

**Plan metadata:** skipped (orchestrator docs commit; `commit_docs` handling left to Step 8)

## Files Created/Modified

- `packages/shared-types/src/index.ts` — healthiness on NutritionResult; optional Meal scores
- `apps/mobile/.../analyzeFoodApi.ts` / `refineMealApi.ts` — SYSTEM_PROMPT + `isNutritionResult`
- `apps/backend/src/routes/analyze-food.ts` — Zod + SYSTEM_PROMPT
- `apps/mobile/.../useSaveMeal.ts` / `useRefineMeal.ts` — persist onto Meal
- `apps/mobile/.../MealSummaryEditor.tsx` — Полезность / Точность bars after date
- Co-located `*.test.ts` fixtures and assertions

## Decisions Made

- Honored D-01–D-06 from plan (no redesign of NutritionCard / MealCard / manual score edit)
- Storage keeps `confidence` 0–1; UI converts to %

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useAnalyzeFood test call-signature drift**
- **Found during:** Task 1 (GREEN verify)
- **Issue:** Hook now calls `analyzeFoodApi(file, { customInstructions, dietType })`; test still expected single-arg call (pre-existing)
- **Fix:** Updated assertion to expect options object
- **Files modified:** `apps/mobile/src/features/analyze-food/model/useAnalyzeFood.test.ts`
- **Verification:** useAnalyzeFood.test.ts green
- **Committed in:** `3aca94d`

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Minimal — unblocked Task 1 verify; no scope creep

## Issues Encountered

None beyond the assertion drift above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Quick task goals met; optional manual smoke on Meal Detail
- Unrelated stats/weight WIP left unstaged

## Self-Check: PASSED

- Key artifacts found on disk
- Commits `0fa166c`, `3aca94d`, `38c16b4`, `18185df` present in git log
- No TODO/FIXME stubs in modified feature UI paths

---
*Phase: quick-260716-4aa*
*Completed: 2026-07-16*
