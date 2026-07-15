---
phase: quick
plan: 260715-x4c
subsystem: ui
tags: [calzen, daily-header, weekstrip, nutrition-summary, home]

requires: []
provides:
  - Light CalZen home header (title + WeekStrip + NutritionSummaryCard)
  - Selected-day remaining kcal / SVG ring / БЖУ bars from diary + profile targets
affects: [home, daily-header]

tech-stack:
  added: []
  patterns:
    - Presentational NutritionSummaryCard under widgets/daily-header; aggregation in DailyHeader
    - Profile targets with module-level FALLBACK_TARGETS; ready-meal day filter via isSameDay

key-files:
  created:
    - apps/mobile/src/widgets/daily-header/ui/NutritionSummaryCard.tsx
  modified:
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx
    - apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx
    - apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
    - apps/mobile/src/pages/home/ui/HomePage.tsx

key-decisions:
  - "Selected day styling: bg-foreground circle (not emerald) for light CalZen strip"
  - "Over-goal: remaining shows 0 + destructive excess hint; ring/Flame use destructive"
  - "Decorative Profile User button has no navigation (T-x4c-02)"
  - "HomePage bg-zinc-50 for white card contrast; FAB brand green unchanged"

patterns-established:
  - "KBZhU day totals: filter ready meals by selectedDate, sum totalCalories + item macros"

requirements-completed: []

coverage:
  - id: D1
    description: "WeekStrip light CalZen selected dark circle + Russian labels + carousel intact"
    verification:
      - kind: unit
        ref: "apps/mobile/src/widgets/daily-header/ui/WeekStrip.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "DailyHeader light layout with NutritionSummaryCard (remaining, ring, Б/Ж/У)"
    verification:
      - kind: unit
        ref: "pnpm --filter @ai-food/mobile type-check && vitest run src/widgets/daily-header/"
        status: pass
    human_judgment: true
    rationale: "Visual match to CalZen screenshot requires human comparison"

duration: 5min
completed: 2026-07-15
status: in-progress
---

# Phase quick Plan 260715-x4c: CalZen home header Summary

**Светлая шапка главной (title + WeekStrip + карточка КБЖУ с остатком/кольцом/барами) реализована; ждёт визуального подтверждения человеком.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-15T20:54:00Z
- **Completed:** —
- **Tasks:** 2/3 auto complete; Task 3 awaiting human-verify
- **Files modified:** 5

## Accomplishments

- WeekStrip перекрашен под светлый фон: тёмный selected circle (`bg-foreground`), muted ярлыки, meal-dot `bg-primary`; карусель и props без изменений
- Добавлен `NutritionSummaryCard`: остаток калорий, SVG-кольцо + Flame, бары Белки/Жир/Углеводы с destructive при превышении
- DailyHeader без emerald full-bleed; «AI Food» по центру, декоративный User (без навигации), агрегация ready-приёмов + fallback targets
- HomePage фон `bg-zinc-50`; MealList и FAB не трогались

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 14460a2 | style(260715-x4c): restyle WeekStrip for light CalZen look |
| 2 | 508d7cd | feat(260715-x4c): CalZen light home header with KBZhU card |
| 3 | — | checkpoint:human-verify — awaiting user |

## Deviations from Plan

None - plan executed exactly as written for Tasks 1–2.

## Known Stubs

None. Profile icon is intentionally non-navigating (no profile route yet; plan + threat model).

## Threat Flags

None beyond plan register (decorative profile control mitigated; no new packages).

## Checkpoint Status

**Blocked on Task 3 (human-verify).** Implementation of Tasks 1–2 is committed and automated checks pass. Waiting for user to compare UI vs CalZen reference screenshot and reply `approved` or describe gaps.

## Verification (automated, passed)

- `pnpm --filter @ai-food/mobile exec vitest run src/widgets/daily-header/ui/WeekStrip.test.tsx` — 4/4 pass
- `pnpm --filter @ai-food/mobile type-check` — pass
- `pnpm --filter @ai-food/mobile exec vitest run src/widgets/daily-header/` — pass

## Self-Check: PASSED

- FOUND: `apps/mobile/src/widgets/daily-header/ui/WeekStrip.tsx`
- FOUND: `apps/mobile/src/widgets/daily-header/ui/NutritionSummaryCard.tsx`
- FOUND: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`
- FOUND: commit `14460a2`
- FOUND: commit `508d7cd`
