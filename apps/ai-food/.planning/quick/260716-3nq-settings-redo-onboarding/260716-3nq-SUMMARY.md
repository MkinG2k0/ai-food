---
phase: quick-260716-3nq
plan: 01
subsystem: ui
tags: [onboarding, settings, zustand, profile, russian-ui]

requires:
  - phase: quick-260716-3g0
    provides: SettingsPage and useSettingsStore customInstructions
provides:
  - resetProfile on useProfileStore (clears profile + targets only)
  - Settings profile/targets summary with Russian labels
  - Redo-onboarding confirm sheet → /onboarding
affects: [settings, onboarding, ProfileGuard]

tech-stack:
  added: []
  patterns:
    - "BottomSheet confirm before destructive/clearing local profile state"
    - "Label maps in page for UserProfile enum → Russian onboarding copy"

key-files:
  created: []
  modified:
    - apps/mobile/src/features/onboarding/model/useProfileStore.ts
    - apps/mobile/src/features/onboarding/model/useProfileStore.test.ts
    - apps/mobile/src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "resetProfile only nulls profile+targets in ai-food-profile; diary and customInstructions untouched"
  - "Inline confirm BottomSheet in SettingsPage (no new feature slice)"
  - "Explicit navigate('/onboarding', { replace: true }) after reset even though ProfileGuard would redirect"

patterns-established:
  - "Settings reads useProfileStore via @/features/onboarding barrel"
  - "Confirm copy states what is cleared vs preserved (goals vs diary/instructions)"

requirements-completed: [QUICK-3nq]

coverage:
  - id: D1
    description: resetProfile clears profile and targets; isComplete becomes false; setProfile works after reset
    requirement: QUICK-3nq
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/model/useProfileStore.test.ts#resetProfile clears profile and targets
        status: pass
    human_judgment: false
  - id: D2
    description: Settings shows Russian onboarding profile fields and daily targets
    requirement: QUICK-3nq
    verification: []
    human_judgment: true
    rationale: Visual Russian labels and layout need human smoke on device/browser
  - id: D3
    description: Confirmed redo clears profile, opens onboarding; diary and customInstructions survive
    requirement: QUICK-3nq
    verification: []
    human_judgment: true
    rationale: Cross-store persistence and ProfileGuard redirect need manual smoke

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-3nq Plan 01: Settings profile + redo onboarding Summary

**Settings shows completed onboarding profile/targets in Russian and lets the user re-run onboarding via confirmed `resetProfile` without clearing diary or custom instructions.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-15T23:41:19Z
- **Completed:** 2026-07-15T23:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `resetProfile()` to `useProfileStore` — sets `profile` and `targets` to `null` only
- Unit tests cover clear + recovery via `setProfile` after reset (6/6 pass)
- Settings «Профиль» section lists gender/age/height/weight/activity/goal + daily КБЖУ
- «Пройти анбординг заново» opens BottomSheet confirm; confirm → `resetProfile` + `/onboarding`

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED) | 80e9192 | test(quick-260716-3nq-01): add failing test for resetProfile |
| 1 (GREEN) | 33f5b2f | feat(quick-260716-3nq-01): implement resetProfile on useProfileStore |
| 2 | 6ebad18 | feat(quick-260716-3nq-01): show profile on Settings and redo onboarding |

## Files Created/Modified

- `apps/mobile/src/features/onboarding/model/useProfileStore.ts` — `resetProfile` action
- `apps/mobile/src/features/onboarding/model/useProfileStore.test.ts` — reset/recovery tests
- `apps/mobile/src/pages/settings/ui/SettingsPage.tsx` — profile summary + redo confirm sheet

## Decisions Made

- Confirm sheet inline on SettingsPage (mirror DeleteMealConfirmSheet); no new feature slice
- Russian labels match StepGender / StepActivity / StepGoal / OnboardingResult
- After reset, `navigate('/onboarding', { replace: true })` for explicit UX; ProfileGuard also blocks until `finish()`

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None — no new network endpoints or auth paths; mitigations T-3nq-01/02 applied via BottomSheet confirm and diary preservation.

## Known Stubs

None.

## Verification Results

- `pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/model/useProfileStore.test.ts` — 6 passed
- `pnpm --filter @ai-food/mobile exec tsc --noEmit` — exit 0

## Self-Check: PASSED

- FOUND: apps/mobile/src/features/onboarding/model/useProfileStore.ts
- FOUND: apps/mobile/src/pages/settings/ui/SettingsPage.tsx
- FOUND: commits 80e9192, 33f5b2f, 6ebad18
- FOUND: .planning/quick/260716-3nq-settings-redo-onboarding/260716-3nq-SUMMARY.md
