---
phase: quick-260716-jaa
plan: 01
subsystem: ui
tags: [onboarding, target-weight, user-profile, russian-copy, mobile]

requires:
  - phase: onboarding-feature
    provides: useOnboarding finish flow + StepWeight NumericRangeInput pattern
provides:
  - UserProfile.targetWeight persisted via finish()
  - StepTargetWeight after Goal before Diet (TOTAL_STEPS=8)
  - micronutrientTargetsApi userText includes targetWeight
affects: [onboarding-ux, settings-profile, micronutrient-norms]

tech-stack:
  added: []
  patterns:
    - StepTargetWeight mirrors StepWeight + useNumericRangeInput (40–160 kg)
    - finish() required keys include targetWeight; calculateTargets still uses weight only

key-files:
  created:
    - apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/onboarding/model/useOnboarding.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
    - apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx
    - apps/mobile/src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "D-01: Target weight step after Goal, before Diet; TOTAL_STEPS=8"
  - "D-02: targetWeight required on UserProfile and finish()"
  - "D-04/discretion: maintain and lose/gain prefill current weight"
  - "D-05: targetWeight in micronutrient userText only; calculateTargets formulas unchanged"

patterns-established:
  - "Desired-weight onboarding step reuses NumericRangeInput clamp pattern from StepWeight"

requirements-completed: [QUICK-jaa]

coverage:
  - id: D1
    description: "finish() requires targetWeight and persists it on UserProfile"
    requirement: QUICK-jaa
    verification:
      - kind: unit
        ref: "src/features/onboarding/model/useOnboarding.test.ts#finish() does not call setProfile without targetWeight"
        status: pass
      - kind: unit
        ref: "src/features/onboarding/model/useOnboarding.test.ts#finish() calls setProfile, sets micronutrient targets, and navigates"
        status: pass
    human_judgment: false
  - id: D2
    description: "micronutrientTargetsApi userText includes targetWeight"
    requirement: QUICK-jaa
    verification:
      - kind: unit
        ref: "src/features/onboarding/api/micronutrientTargetsApi.test.ts#parses valid AI JSON into 8 targets with correct units"
        status: pass
    human_judgment: false
  - id: D3
    description: "Onboarding Goal → desired weight → Diet; Settings shows desired weight"
    requirement: QUICK-jaa
    verification:
      - kind: other
        ref: "pnpm --filter @ai-food/mobile exec tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Step order and Settings row need visual smoke on device"

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-jaa Plan 01: Onboarding target weight Summary

**Онбординг просит желаемый вес после цели; значение сохраняется в профиле и уходит в контекст micronutrient API без смены формул КБЖУ.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-16T10:57:09Z
- **Completed:** 2026-07-16T11:01:00Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

- `UserProfile.targetWeight` + `finish()` required; тесты модели/API зелёные
- `StepTargetWeight` (RU «Желаемый вес») между Goal и Diet; `TOTAL_STEPS = 8`
- Settings показывает «Желаемый вес» только если поле есть (legacy safe)
- `micronutrientTargetsApi` добавляет `targetWeight=` в userText; `calculateTargets` не трогали

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for targetWeight | `50177a8` | useOnboarding/useProfileStore/calculateTargets/micronutrientTargetsApi tests |
| 1 (GREEN) | Profile + finish + API | `e01208d` | shared-types, useOnboarding.ts, micronutrientTargetsApi.ts |
| 2 | StepTargetWeight + step order + Settings | `ae67511` | StepTargetWeight.tsx, OnboardingPage.tsx, SettingsPage.tsx |

## Decisions Made

- Locked D-01…D-06 followed exactly
- lose/gain default initial = current weight (same as maintain / D-04)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None beyond plan register (T-jaa-01 accept; T-jaa-02 mitigated via NumericRangeInput clamp).

## Self-Check: PASSED

- FOUND: `packages/shared-types/src/index.ts`
- FOUND: `apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx`
- FOUND: `apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx`
- FOUND: commit `50177a8`
- FOUND: commit `e01208d`
- FOUND: commit `ae67511`
- FOUND: `.planning/quick/260716-jaa-onboarding-target-weight/260716-jaa-SUMMARY.md`
