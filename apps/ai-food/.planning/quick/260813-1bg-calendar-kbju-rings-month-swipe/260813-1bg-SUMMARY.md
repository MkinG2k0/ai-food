---
phase: 260813-1bg
plan: 01
subsystem: ui
tags: [calendar, kbju, rings, weekstrip, settings, framer-motion]

requires: []
provides:
  - calendarRingMode setting (К/КБ/КБЖУ, default КБ)
  - DayCellRings concentric SVG on week + month cells
  - WeekStrip expand/collapse month grid via handle/swipe
affects: [home-daily-header, settings]

tech-stack:
  added: []
  patterns:
    - "Ready-only meal aggregation via computeDayKbju for calendar rings"
    - "calendarRingMode persist + normalize + backup round-trip"

key-files:
  created:
    - apps/ai-food/src/shared/lib/computeDayKbju.ts
    - apps/ai-food/src/widgets/daily-header/ui/DayCellRings.tsx
  modified:
    - apps/ai-food/src/features/settings/model/useSettingsStore.ts
    - apps/ai-food/src/features/settings/model/appDataBackup.ts
    - apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
    - apps/ai-food/src/widgets/daily-header/ui/WeekStrip.tsx
    - apps/ai-food/src/widgets/daily-header/ui/DailyHeader.tsx
    - apps/ai-food/src/pages/home/ui/HomePage.tsx
    - apps/ai-food/src/shared/lib/dateUtils.ts

key-decisions:
  - "Store field calendarRingMode: kcal | kcal_protein | full; default kcal_protein (D-01)"
  - "Ring colors locked: kcal #10B981, protein #FB7185, fat #FBBF24, carbs #0EA5E9 (D-03)"
  - "Month day select collapses strip and syncs weekOffset via weekOffsetForDate (D-05 discretion)"
  - "Removed hasFood under-dot; rings replace it"

patterns-established:
  - "normalizeCalendarRingMode for persist/backup tampering mitigation"
  - "getMonthGridDays Mon–Sun padded grid in shared/lib"

requirements-completed: [QUICK-260813-1bg]

coverage:
  - id: D1
    description: Settings К/КБ/КБЖУ with default КБ and backup round-trip
    requirement: QUICK-260813-1bg
    verification:
      - kind: unit
        ref: apps/ai-food/src/features/settings/model/appDataBackup.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: DayCellRings by mode + ready-only computeDayKbju on week cells
    requirement: QUICK-260813-1bg
    verification:
      - kind: unit
        ref: apps/ai-food/src/widgets/daily-header/ui/DayCellRings.test.tsx
        status: pass
      - kind: unit
        ref: apps/ai-food/src/shared/lib/computeDayKbju.test.ts
        status: pass
      - kind: unit
        ref: apps/ai-food/src/widgets/daily-header/ui/WeekStrip.test.tsx
        status: pass
    human_judgment: false
  - id: D3
    description: Handle/swipe expands month grid; day pick collapses
    requirement: QUICK-260813-1bg
    verification:
      - kind: unit
        ref: apps/ai-food/src/widgets/daily-header/ui/WeekStrip.test.tsx#expands month grid
        status: pass
    human_judgment: true
    rationale: Visual ring thickness/colors and vertical drag feel need device smoke

duration: 8min
completed: 2026-08-13
status: complete
---

# Phase 260813-1bg Plan 01: Calendar KBJU rings + month swipe Summary

**Persisted calendar ring density (К/КБ/КБЖУ, default КБ), concentric DayCellRings on week/month cells from ready meals, and handle/swipe month expand that collapses on day select.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-12T22:01:29Z
- **Completed:** 2026-08-12T22:10:00Z
- **Tasks:** 3/3
- **Files modified:** 16

## Accomplishments

- Settings + backup: `calendarRingMode` with normalize, legacy default `kcal_protein`, UI segmented control «Кольца календаря»
- `computeDayKbju` + `DayCellRings` (D-03 colors); WeekStrip shows rings instead of meal-dot
- Month grid via handle click / vertical drag; chevrons; select day → collapse + `weekOffsetForDate` sync on HomePage

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | faec5f2 | calendarRingMode setting + backup + Settings UI |
| 2 | 9b58566 | DayCellRings + computeDayKbju + week strip rings |
| 3 | 81500db | Month expand/collapse + weekOffset sync |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AnimatePresence mode=wait blocked month expand in vitest**
- **Found during:** Task 3
- **Issue:** Exit animation never completed in jsdom; month grid never mounted after handle click
- **Fix:** Conditional render with motion enter animation instead of AnimatePresence mode=wait
- **Files modified:** WeekStrip.tsx
- **Commit:** 81500db

**2. [Rule 2 - Critical] Sync weekOffset when selecting a month day**
- **Found during:** Task 3
- **Issue:** HomePage only set selectedDate; collapsing month left week strip on wrong week
- **Fix:** `weekOffsetForDate` in dateUtils + HomePage `handleDaySelect`
- **Files modified:** dateUtils.ts, HomePage.tsx
- **Commit:** 81500db

## Manual smoke notes

- Home: ready-meal day shows rings; empty day ringless
- Settings: К → КБ → КБЖУ changes arc count
- Handle / swipe down opens month; pick day collapses to that week

## Self-Check: PASSED

- FOUND: computeDayKbju.ts, DayCellRings.tsx, WeekStrip month grid
- FOUND commits: faec5f2, 9b58566, 81500db
