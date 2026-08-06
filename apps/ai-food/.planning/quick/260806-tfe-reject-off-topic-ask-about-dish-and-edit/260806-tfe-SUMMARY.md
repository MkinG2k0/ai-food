---
phase: quick-260806-tfe
plan: 01
subsystem: api
tags: [food-topic-guard, off-topic, ask-about-dish, refine-meal, toast, vitest]

requires: []
provides:
  - Shared foodTopicGuard heuristic + OFF_TOPIC / offTopic sentinel detectors
  - Ask and refine APIs reject junk before gateway and after model sentinels
  - Russian ApiError OFF_TOPIC for existing sonner toast paths
affects: [analyze-food, refine-meal, meal-detail]

tech-stack:
  added: []
  patterns:
    - Hybrid client heuristic + model sentinel (same spirit as analyze noFood)
    - ApiError { code: OFF_TOPIC, status: 400 } with RU message for toast.error

key-files:
  created:
    - apps/ai-food/src/features/analyze-food/lib/foodTopicGuard.ts
    - apps/ai-food/src/features/analyze-food/lib/foodTopicGuard.test.ts
  modified:
    - apps/ai-food/src/features/analyze-food/api/fetchMealCustomContentApi.ts
    - apps/ai-food/src/features/analyze-food/api/fetchMealCustomContentApi.test.ts
    - apps/ai-food/src/features/analyze-food/api/refineMealApi.ts
    - apps/ai-food/src/features/analyze-food/api/refineMealApi.test.ts
    - apps/ai-food/src/features/refine-meal/model/useRefineMeal.test.ts

key-decisions:
  - "D-01/D-02: hybrid reject — isObviouslyIrrelevantFoodInput before axios; OFF_TOPIC/offTopic after model"
  - "D-03: offTopicApiError Russian copy flows through existing toast.error(apiError.message); no UI toast duplication"
  - "Guard kept internal to analyze-food (not exported from index.ts)"

patterns-established:
  - "Food free-text gates live in analyze-food lib + prompts; UI stays toast-only on ApiError"

requirements-completed: [QUICK-tfe]

coverage:
  - id: D1
    description: Client heuristic rejects bare numbers, mash, math, code, identity; allows food/portion intent
    requirement: QUICK-tfe
    verification:
      - kind: unit
        ref: apps/ai-food/src/features/analyze-food/lib/foodTopicGuard.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Ask and refine APIs short-circuit junk and map model OFF_TOPIC/offTopic to ApiError
    requirement: QUICK-tfe
    verification:
      - kind: unit
        ref: apps/ai-food/src/features/analyze-food/api/fetchMealCustomContentApi.test.ts
        status: pass
      - kind: unit
        ref: apps/ai-food/src/features/analyze-food/api/refineMealApi.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: OFF_TOPIC refine does not call updateMeal; toast via existing catch paths
    requirement: QUICK-tfe
    verification:
      - kind: unit
        ref: apps/ai-food/src/features/refine-meal/model/useRefineMeal.test.ts#does not call updateMeal when refineMealApi rejects OFF_TOPIC
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-06
status: complete
---

# Phase quick-260806-tfe Plan 01: Reject off-topic ask/edit Summary

**Shared `foodTopicGuard` plus ask/refine prompt sentinels cancel invalid questions and meal corrections with Russian OFF_TOPIC toasts, without mutating diary meals or appending answer slides.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-06T18:15:37Z
- **Completed:** 2026-08-06T18:21:00Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- Added `foodTopicGuard` with heuristic, ask/refine sentinel detectors, and `offTopicApiError('ask'|'edit')`.
- Wired ask (`fetchMealCustomContentApi`) and refine (`refineMealApi`) to reject before gateway and after OFF_TOPIC / `{offTopic:true}` responses.
- Confirmed MealCustomContentBlock / MealDetailPage already toast `ApiError.message`; extended `useRefineMeal` test so OFF_TOPIC never calls `updateMeal`.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `45d0946` | Shared foodTopicGuard + unit tests |
| 2 | `e866022` | Prompt + API rejection for ask and refine |
| 3 | `5ab6654` | OFF_TOPIC refine skips updateMeal |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cyrillic `\b` broke identity heuristic**
- **Found during:** Task 1
- **Issue:** JS `\b` does not treat Cyrillic as word chars, so `/кто ты\b/` failed on `кто ты`.
- **Fix:** End-anchored identity pattern with optional punctuation: `^(кто\s+ты|...)(?:\s*[?.!]*)?$`.
- **Files modified:** `foodTopicGuard.ts`
- **Commit:** `45d0946`

None other — plan executed as written (UI files untouched; toast already wired).

## TDD Gate Compliance

- Task 1–2: tests and implementation landed in the same commits (RED/GREEN not split into separate commits). Behavior covered by Vitest; suites green before each commit.
- Task 3: test-only commit after confirming UI paths.

## Known Stubs

None.

## Threat Flags

None beyond plan mitigations (T-tfe-01..03 applied via offTopic check before `isNutritionResult` / `updateMeal`, heuristic short-circuit, discard OFF_TOPIC ask content).

## Tests

```
pnpm exec vitest run \
  src/features/analyze-food/lib/foodTopicGuard.test.ts \
  src/features/analyze-food/api/fetchMealCustomContentApi.test.ts \
  src/features/analyze-food/api/refineMealApi.test.ts \
  src/features/refine-meal/model/useRefineMeal.test.ts
```

**Result:** 4 files, 57 tests passed.

## Self-Check: PASSED

- Key artifacts found on disk
- Commits `45d0946`, `e866022`, `5ab6654` present in git log
