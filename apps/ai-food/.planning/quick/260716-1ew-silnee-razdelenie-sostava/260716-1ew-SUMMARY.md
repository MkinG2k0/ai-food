---
phase: quick-260716-1ew
plan: 01
subsystem: api
tags: [prompt, openai, nutrition, composition, vitest]

requires:
  - phase: quick-260716-16d
    provides: FOOD_NAME_PROMPT_RULE separating dish-level foodName from items[].name
provides:
  - COMPOSITION_PROMPT_RULE forcing compound dishes into ingredient/layer items
  - SYSTEM_PROMPT embedding stronger composition decomposition guidance
affects: [analyze-food, meal-composition]

tech-stack:
  added: []
  patterns:
    - Exported prompt-rule constants (FOOD_NAME / COMPOSITION) embedded via template interpolation in SYSTEM_PROMPT
    - Unit tests lock prompt-rule wording the same way as FOOD_NAME_PROMPT_RULE

key-files:
  created: []
  modified:
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts

key-decisions:
  - "COMPOSITION_PROMPT_RULE replaces weak «не склеивай тарелку» one-liner with explicit burger→layers decomposition"
  - "items[].name schema clarified as atomic ingredient/layer; foodName rules from 16d unchanged"
  - "Simple homogeneous foods (fries, apple) may remain a single item"

patterns-established:
  - "Prompt rules as named exports + vitest content assertions + SYSTEM_PROMPT body embedding check via axios mock"

requirements-completed: [QUICK-1ew]

coverage:
  - id: D1
    description: COMPOSITION_PROMPT_RULE exports and forces compound-dish → ingredient items (burger example)
    requirement: QUICK-1ew
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#COMPOSITION_PROMPT_RULE forces compound dishes into ingredient-level items
        status: pass
    human_judgment: false
  - id: D2
    description: SYSTEM_PROMPT embeds COMPOSITION_PROMPT_RULE and atomic ingredients[].name wording; FOOD_NAME_PROMPT_RULE preserved
    requirement: QUICK-1ew
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#SYSTEM_PROMPT embeds COMPOSITION_PROMPT_RULE alongside FOOD_NAME_PROMPT_RULE
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-1ew Plan 01: Stronger composition breakdown Summary

**Client SYSTEM_PROMPT now forces layered dishes (burger, sandwich, wrap…) into atomic items (булка, котлета, сыр…), while foodName stays dish-level and simple foods may stay one item.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T22:03:37Z
- **Completed:** 2026-07-15T22:05:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Exported `COMPOSITION_PROMPT_RULE` with explicit burger → булка/котлета/сыр/салат/помидор decomposition and single-item allowance for fries-like foods
- Embedded the rule in `SYSTEM_PROMPT` after `FOOD_NAME_PROMPT_RULE`; tightened `items[].name` to «атомарный видимый ингредиент/слой»
- Locked wording with unit tests (rule content + system message embedding); all 18 analyzeFoodApi tests green

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED):** `39a3aa3` — test(quick-260716-1ew): add failing test for COMPOSITION_PROMPT_RULE
2. **Task 1 (GREEN):** `23dcdbc` — feat(quick-260716-1ew): implement COMPOSITION_PROMPT_RULE

**Plan metadata:** skipped (commit_docs handled by orchestrator)

## Files Created/Modified

- `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts` — `COMPOSITION_PROMPT_RULE` + SYSTEM_PROMPT embedding / schema wording
- `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts` — composition rule + SYSTEM_PROMPT embedding assertions

## Decisions Made

- Replaced the weaker «не склеивай тарелку» lines with `COMPOSITION_PROMPT_RULE` so the model sees an explicit layered-dish example and a clear ban on a single «Гамбургер»/«Бургер» item when layers are visible
- Kept `FOOD_NAME_PROMPT_RULE` unchanged so dish title stays separate from composition
- No schema/UI/backend/shared-types/migration changes — prompt-only for new analyzes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- New AI Gateway analyzes should decompose compound dishes at ingredient granularity
- Human can verify on a real burger+fries photo; legacy diary meals unchanged by design

## TDD Gate Compliance

- RED gate: `39a3aa3` (test commit before implementation)
- GREEN gate: `23dcdbc` (feat after failing tests)
- REFACTOR: not needed

## Known Stubs

None

## Self-Check: PASSED

- FOUND: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
- FOUND: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
- FOUND: .planning/quick/260716-1ew-silnee-razdelenie-sostava/260716-1ew-SUMMARY.md
- FOUND: 39a3aa3
- FOUND: 23dcdbc
---
*Phase: quick-260716-1ew*
*Completed: 2026-07-16*
