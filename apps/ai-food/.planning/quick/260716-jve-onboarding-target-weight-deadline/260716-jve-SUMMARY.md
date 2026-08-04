---
phase: quick-260716-jve
plan: 01
subsystem: onboarding
tags: [onboarding, UserProfile, targetWeightDate, micronutrients, settings]

requires:
  - phase: quick-260716-jaa
    provides: UserProfile.targetWeight and StepTargetWeight
provides:
  - UserProfile.targetWeightDate (YYYY-MM-DD) persisted via finish()
  - StepTargetWeight date input with isFutureDay validation
  - micronutrientTargetsApi userText includes targetWeightDate
  - Settings «Срок» row for target deadline
affects: [onboarding, settings, micronutrient-targets]

tech-stack:
  added: []
  patterns:
    - Native input type=date with min=tomorrow + isFutureDay gate on Next
    - Legacy-safe optional render for missing targetWeightDate in Settings

key-files:
  created: []
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/onboarding/model/useOnboarding.ts
    - apps/mobile/src/features/onboarding/model/useOnboarding.test.ts
    - apps/mobile/src/features/onboarding/model/useProfileStore.test.ts
    - apps/mobile/src/features/onboarding/model/calculateTargets.test.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
    - apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
    - apps/mobile/src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "D-01: date on same StepTargetWeight step (TOTAL_STEPS unchanged)"
  - "D-02: targetWeightDate as YYYY-MM-DD string on UserProfile"
  - "D-03: validate strictly after today via isFutureDay; Next disabled otherwise"
  - "D-04: finish() requires targetWeightDate with targetWeight"
  - "D-05: micronutrient prompt userText + SYSTEM_PROMPT mention targetWeightDate"
  - "D-06: Settings shows «Срок» when field present; legacy safe"
  - "Default deadline: today + 90 calendar days"

patterns-established:
  - "Date deadline UI mirrors LogWeightSheet input styles with min=tomorrow"

requirements-completed: [QUICK-jve]

coverage:
  - id: D1
    description: "finish() requires targetWeightDate; setProfile receives it"
    requirement: QUICK-jve
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/model/useOnboarding.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: "micronutrientTargetsApi userText includes targetWeightDate"
    requirement: QUICK-jve
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: "StepTargetWeight collects kg + future deadline; Settings shows Срок"
    requirement: QUICK-jve
    verification:
      - kind: other
        ref: pnpm --filter @ai-food/mobile exec tsc --noEmit
        status: pass
    human_judgment: true
    rationale: "Manual smoke of date picker / Settings formatting needs human eyes"

duration: 3min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-jve Plan 01: Onboarding Target Weight Deadline Summary

**Целевая дата (YYYY-MM-DD) на шаге «Желаемый вес» персистится в профиле, уходит в micronutrient prompt и показывается в Settings.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T11:21:35Z
- **Completed:** 2026-07-16T11:24:32Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Добавлено `UserProfile.targetWeightDate`; `finish()` требует поле вместе с `targetWeight`
- `micronutrientTargetsApi` передаёт `targetWeightDate=` в userText и SYSTEM_PROMPT
- `StepTargetWeight`: date input «До какого числа», default +90 дней, `min`=завтра, `isFutureDay` блокирует «Далее»
- Settings: строка «Срок» с `toLocaleDateString('ru-RU')` при наличии поля

## Task Commits

1. **Task 1: UserProfile.targetWeightDate + finish + AI prompt + fixtures** - `4629491` (feat)
2. **Task 2: StepTargetWeight date UI + Settings** - `2746b6e` (feat)

**Plan metadata:** orchestrator handles docs commit

## Files Created/Modified

- `packages/shared-types/src/index.ts` — `targetWeightDate: string` на UserProfile
- `apps/mobile/src/features/onboarding/model/useOnboarding.ts` — required includes targetWeightDate
- `apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts` — prompt + userText
- `apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx` — date UI + validation
- `apps/mobile/src/pages/settings/ui/SettingsPage.tsx` — «Срок» display
- Test fixtures updated in useOnboarding / useProfileStore / calculateTargets / micronutrientTargetsApi

## Decisions Made

Followed locked D-01…D-07. Default deadline = today + 90 days. Label «До какого числа» / Settings «Срок».

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new trust-boundary surface beyond plan threat model (client date → profile → AI userText).

## Self-Check: PASSED

- FOUND: packages/shared-types/src/index.ts (targetWeightDate)
- FOUND: StepTargetWeight.tsx date input + isFutureDay
- FOUND: commit 4629491
- FOUND: commit 2746b6e
- FOUND: SUMMARY path `.planning/quick/260716-jve-onboarding-target-weight-deadline/260716-jve-SUMMARY.md`
