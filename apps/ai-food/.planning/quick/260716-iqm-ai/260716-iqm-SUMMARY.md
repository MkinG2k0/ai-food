---
phase: quick-260716-iqm
plan: 01
subsystem: nutrition
tags: [micronutrients, ai-gateway, onboarding, stats, vitest]

requires:
  - phase: 260716-4nf
    provides: eight MICRONUTRIENT_IDS and meal micronutrients field
provides:
  - Quantitative MicronutrientEstimate (amount + mg/µg)
  - Personal daily micronutrientTargets via AI Gateway + RDA fallback
  - Weekly vitamins chart intake vs norm
  - Badges with Russian мг/мкг amounts
affects: [stats, onboarding, analyze-food, meal-detail]

tech-stack:
  added: []
  patterns:
    - Client AI Gateway for onboarding micronutrient norms (same as analyze)
    - MICRONUTRIENT_UNITS canonical map with normalize coerce
    - Legacy level-only rows ignored (no diary migration)

key-files:
  created:
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
    - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
    - apps/mobile/src/features/onboarding/model/defaultMicronutrientTargets.ts
  modified:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/analyze-food/api/nutritionResultSchema.ts
    - apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts
    - apps/mobile/src/features/analyze-food/api/refineMealApi.ts
    - apps/mobile/src/features/onboarding/model/useProfileStore.ts
    - apps/mobile/src/features/onboarding/model/useOnboarding.ts
    - apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.ts
    - apps/mobile/src/features/stats/ui/WeeklyMicronutrientsChart.tsx
    - apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.tsx
    - apps/mobile/src/pages/stats/ui/StatsPage.tsx

key-decisions:
  - "MicronutrientEstimate is { id, amount, unit }; MicronutrientLevel removed from public API"
  - "MICRONUTRIENT_UNITS fixed map; normalize coerces unit and drops legacy level-only rows"
  - "Daily norms via micronutrientTargetsApi after onboarding finish; defaults on any failure"
  - "Chart metric: weekly sum/7 vs daily norm; bar capped at 150%"

patterns-established:
  - "Onboarding feature exposes defaultMicronutrientTargets for stats chart fallback"
  - "formatMicronutrientUnit maps mg→мг, µg→мкг"

requirements-completed: [QUICK-iqm]

coverage:
  - id: D1
    description: Analyze/refine return quantitative micronutrient amounts; schema rejects qualitative level
    requirement: QUICK-iqm
    verification:
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/nutritionResultSchema.test.ts
        status: pass
      - kind: unit
        ref: apps/mobile/src/features/analyze-food/api/analyzeFoodApi.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: After onboarding finish, personal daily micronutrient norms stored (AI or RDA fallback)
    requirement: QUICK-iqm
    verification:
      - kind: unit
        ref: apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Weekly vitamins chart shows daily average vs personal norm with мг/мкг; badges show amounts
    requirement: QUICK-iqm
    verification:
      - kind: unit
        ref: apps/mobile/src/features/stats/model/getWeeklyMicronutrientSeries.test.ts
        status: pass
      - kind: unit
        ref: apps/mobile/src/entities/nutrition/ui/MicronutrientsBadges.test.tsx
        status: pass
    human_judgment: true
    rationale: Visual chart layout and onboarding→stats smoke need human glance

duration: 7min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-iqm Plan 01: Quantitative micronutrients Summary

**Качественные уровни витаминов заменены на мг/мкг: AI считает количества в порции, онбординг сохраняет дневные нормы, график сравнивает среднесуточное потребление с нормой.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-16T13:34:16Z
- **Completed:** 2026-07-16T13:41:30Z
- **Tasks:** 3/3
- **Files modified:** ~20

## Accomplishments

- Shared types: `MicronutrientUnit`, `MICRONUTRIENT_UNITS`, quantitative `MicronutrientEstimate`; removed `MicronutrientLevel`
- Analyze/refine prompts and `normalizeMicronutrients` coerce units and ignore legacy `level`-only rows
- `micronutrientTargetsApi` + `defaultMicronutrientTargets`; `useOnboarding.finish` persists norms before navigate
- Stats chart: dailyAvg vs norm progress bars (cap 150%), Russian units; badges show `45 мг` style amounts

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `e03000e` | feat(260716-iqm): quantitative micronutrient types and analyze schema |
| 2 | `d09130b` | feat(260716-iqm): AI micronutrient daily norms after onboarding |
| 3 | `1a6f6e2` | feat(260716-iqm): chart intake vs norm and quantitative badges |

## Verification Results

- `vitest` (5 files / 58 tests): **pass**
- `pnpm --filter @ai-food/mobile type-check`: **pass**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated useSaveMeal micronutrient fixtures**
- **Found during:** Task 1
- **Issue:** Fixtures still used qualitative `level` after type change
- **Fix:** Switched to amount+unit in `useSaveMeal.test.ts`
- **Commit:** e03000e

**2. [Rule 2 - Critical] Profile store test covers micronutrientTargets clear**
- **Found during:** Task 3
- **Issue:** `resetProfile` behavior for norms not asserted
- **Fix:** Extended `useProfileStore.test.ts`
- **Commit:** 1a6f6e2

## Threat Flags

None — no new backend route; client gateway key surface unchanged (T-iqm-01 accept).

## Known Stubs

None.

## Self-Check: PASSED

- SUMMARY path exists: `.planning/quick/260716-iqm-ai/260716-iqm-SUMMARY.md`
- Commits found: e03000e, d09130b, 1a6f6e2
- `status: complete` in frontmatter
