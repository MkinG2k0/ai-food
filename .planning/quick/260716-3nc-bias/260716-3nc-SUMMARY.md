---
phase: quick-260716-3nc
plan: 01
subsystem: ui
tags: [onboarding, diet, ai-gateway, prompt, halal, zustand]

requires:
  - phase: quick-260716-3g0
    provides: customInstructions in analyze/refine system prompts
  - phase: quick-260716-05y
    provides: client AI Gateway path for analyzeFoodApi
provides:
  - DietType on UserProfile with onboarding StepDiet
  - Settings diet control via updateDietType
  - appendDietPreference with halal-only pork→chicken bias
affects: [analyze-food, refine-meal, save-meal, onboarding, settings]

tech-stack:
  added: []
  patterns:
    - "dietType from useProfileStore → appendDietPreference after appendCustomInstructions"
    - "legacy profile?.dietType ?? 'none' fallback"

key-files:
  created:
    - apps/mobile/src/features/onboarding/ui/steps/StepDiet.tsx
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx
    - apps/mobile/src/features/onboarding/model/useOnboarding.ts
    - apps/mobile/src/features/onboarding/model/useProfileStore.ts
    - apps/mobile/src/pages/settings/ui/SettingsPage.tsx
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/refineMealApi.ts
    - apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts
    - apps/mobile/src/features/refine-meal/model/useRefineMeal.ts
    - apps/mobile/src/features/save-meal/model/useSaveMeal.ts

key-decisions:
  - "Diet options locked to none/halal/vegan/vegetarian (D-01); no kosher"
  - "Pork→chicken bias only in halal branch of appendDietPreference (D-02)"
  - "Diet stored on UserProfile (ai-food-profile), not settings store"
  - "Prompt injection on client AI Gateway only; apps/backend untouched (D-03 / 260716-05y)"
  - "Order: appendCustomInstructions then appendDietPreference"

patterns-established:
  - "Structured ## User diet preference section mirrors ## User custom instructions"
  - "Callers pass dietType: profile?.dietType ?? 'none' into analyze/refine APIs"

requirements-completed: [QUICK-3nc]

coverage:
  - id: D1
    description: Onboarding StepDiet single-select with four diet options persisted on UserProfile
    requirement: QUICK-3nc
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/model/useOnboarding.test.ts#finish() calls setProfile and navigates
        status: pass
      - kind: unit
        ref: apps/mobile/src/features/onboarding/model/useProfileStore.test.ts#updateDietType patches profile.dietType when profile exists
        status: pass
    human_judgment: false
  - id: D2
    description: Halal-only pork-lookalike→chicken bias injected into analyze/refine system prompts
    requirement: QUICK-3nc
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts#appendDietPreference
        status: pass
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/refineMealApi.test.ts#includes halal diet section
        status: pass
    human_judgment: false
  - id: D3
    description: Settings can change dietType without redoing onboarding; legacy missing dietType → none
    requirement: QUICK-3nc
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/model/useProfileStore.test.ts#isComplete stays true for legacy profile missing dietType
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-3nc Plan 01: Diet type + Halal bias Summary

**Onboarding and Settings persist DietType; client AI prompts get diet rules with pork→chicken bias only for Halal.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-15T23:43:55Z
- **Completed:** 2026-07-15T23:50:00Z
- **Tasks:** 2/2
- **Files modified:** 16

## Accomplishments

- Added `DietType` (`none` | `halal` | `vegan` | `vegetarian`) to `UserProfile` and onboarding step 7 (`StepDiet`).
- Persisted diet via `useProfileStore.updateDietType`; Settings UI lets existing users change diet without redo onboarding.
- Implemented `appendDietPreference` — Halal forbids non-halal meats and biases pork-lookalikes to chicken; vegan/vegetarian get constraints without that bias.
- Wired `dietType` through `useAnalyzeFood`, `useRefineMeal`, and `useSaveMeal` (also fixed save-meal gap for `customInstructions`).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 RED | `5027899` | test: failing tests for dietType onboarding |
| 1 GREEN | `d26a412` | feat: dietType onboarding + Settings |
| 2 RED | `054becc` | test: failing tests for diet prompt injection |
| 2 GREEN | `3c42947` | feat: inject diet preference into AI prompts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleared mockNavigate between onboarding tests**
- **Found during:** Task 1 GREEN
- **Issue:** `finish() does not call setProfile without dietType` failed because prior test left navigate calls on the shared spy
- **Fix:** `mockNavigate.mockClear()` in `beforeEach`
- **Files modified:** `useOnboarding.test.ts`
- **Commit:** `d26a412`

## TDD Gate Compliance

- RED commits present: `5027899`, `054becc`
- GREEN commits present: `d26a412`, `3c42947`

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth surfaces beyond existing AI Gateway prompt text.

## Self-Check: PASSED

- FOUND: `apps/mobile/src/features/onboarding/ui/steps/StepDiet.tsx`
- FOUND: `packages/shared-types/src/index.ts` (`DietType`)
- FOUND: commits `5027899`, `d26a412`, `054becc`, `3c42947`
- FOUND: no `apps/backend` changes in task commits
