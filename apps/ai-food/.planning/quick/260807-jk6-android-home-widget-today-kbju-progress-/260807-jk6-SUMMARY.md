---
phase: 260807-jk6-android-home-widget-today-kbju-progress-
plan: 01
status: complete
subsystem: ui
tags: [android, capacitor, app-widget, kbju, preferences, vitest]

requires: []
provides:
  - Pure computeTodayKbjuSnapshot matching DailyHeader aggregation (no fiber)
  - FSD features/kbju-widget sync + Capacitor KbjuWidget plugin bridge
  - Android 2×2 KBJU rings home widget with Preferences snapshot sync
affects:
  - android home widgets
  - AppShell composition

tech-stack:
  added: []
  patterns:
    - Lean Preferences snapshot (ai-food-widget-kbju) for native widget; no zustand parse in Java
    - Local Capacitor plugin registered in MainActivity before super.onCreate
    - RemoteViews rings via Canvas→Bitmap

key-files:
  created:
    - src/shared/lib/computeTodayKbjuSnapshot.ts
    - src/shared/lib/computeTodayKbjuSnapshot.test.ts
    - src/features/kbju-widget/index.ts
    - src/features/kbju-widget/model/syncKbjuWidget.ts
    - src/features/kbju-widget/api/kbjuWidgetPlugin.ts
    - src/features/kbju-widget/ui/KbjuWidgetSync.tsx
    - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java
    - android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
    - android/app/src/main/res/layout/widget_kbju_rings.xml
    - android/app/src/main/res/layout/widget_preview_kbju_rings.xml
    - android/app/src/main/res/xml/widget_kbju_rings_info.xml
    - android/app/src/main/res/drawable/widget_preview_kbju_rings.png
  modified:
    - src/shared/lib/index.ts
    - src/app/AppShell.tsx
    - android/app/src/main/java/com/aifood/app/MainActivity.java
    - android/app/src/main/AndroidManifest.xml
    - android/app/src/main/res/values/strings.xml
    - android/app/src/main/res/values/colors.xml

key-decisions:
  - "D-01..D-08 honored: four rings, lean Preferences snapshot, tap opens MainActivity MAIN/LAUNCHER"
  - "PendingIntent FLAG_IMMUTABLE on M+ (T-jk6-03)"
  - "200ms debounce on syncKbjuWidget (T-jk6-04)"

patterns-established:
  - "Widget data path: JS snapshot → CapacitorStorage → AppWidgetProvider bitmaps"
  - "Local Cap plugins: registerPlugin(Class) before BridgeActivity.super.onCreate"

requirements-completed: [QUICK-260807-jk6]

coverage:
  - id: D1
    description: Pure today KBJU snapshot compute (ready meals, fallback goals, local date)
    requirement: QUICK-260807-jk6
    verification:
      - kind: unit
        ref: src/shared/lib/computeTodayKbjuSnapshot.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Preferences sync feature + AppShell KbjuWidgetSync mount
    requirement: QUICK-260807-jk6
    verification:
      - kind: other
        ref: files src/features/kbju-widget/* + AppShell mount
        status: pass
    human_judgment: false
  - id: D3
    description: Native 2×2 KBJU rings widget + KbjuWidget.refresh plugin
    requirement: QUICK-260807-jk6
    verification:
      - kind: other
        ref: "./gradlew :app:compileDebugJavaWithJavac --quiet"
        status: pass
    human_judgment: false
  - id: D4
    description: Device smoke — pin widget, log meal, rings update; tap opens home; add-food widgets intact
    requirement: QUICK-260807-jk6
    verification: []
    human_judgment: true
    rationale: Home-screen widget picker and live update require a physical/emulator Android device

duration: 12min
completed: 2026-08-07
status: complete
---

# Phase 260807-jk6 Plan 01: Android KBJU rings widget Summary

**Glanceable 2×2 Android home widget with four today-KBJU progress rings synced via Capacitor Preferences snapshot**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-07T11:09:27Z
- **Completed:** 2026-08-07T11:22:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Pure `computeTodayKbjuSnapshot` mirrors DailyHeader (ready-only, FALLBACK goals, no fiber)
- `features/kbju-widget` writes `ai-food-widget-kbju` and calls `KbjuWidget.refresh()` on native
- `KbjuRingsWidgetProvider` draws four Canvas rings; over-goal uses destructive red; tap opens app home

## Task Commits

1. **Task 1 RED:** `2dd73d5` — test(260807-jk6-01): add failing test for today KBJU snapshot
2. **Task 1 GREEN:** `50b86a1` — feat(260807-jk6-01): implement KBJU snapshot sync and AppShell mount
3. **Task 2:** `e01d474` — feat(260807-jk6-01): add Android KBJU rings widget and refresh plugin

**Plan metadata:** skipped (orchestrator commits SUMMARY; `commit_docs` constraint)

## Files Created/Modified

- `src/shared/lib/computeTodayKbjuSnapshot.ts` — pure today totals vs goals
- `src/shared/lib/computeTodayKbjuSnapshot.test.ts` — ready-only / fallback / empty day
- `src/features/kbju-widget/*` — plugin, debounced sync, KbjuWidgetSync
- `src/app/AppShell.tsx` — mounts KbjuWidgetSync
- `android/.../KbjuRingsWidgetProvider.java` — snapshot → RemoteViews rings
- `android/.../KbjuWidgetPlugin.java` — Cap `refresh` → APPWIDGET_UPDATE
- `android/.../MainActivity.java` — `registerPlugin` before `super.onCreate`
- Layout/info/preview PNG + colors/strings + manifest receiver

## Decisions Made

- Followed locked D-01–D-08 from plan
- Manifest/strings commit scoped to KBJU-only deltas so pre-existing add-food WIP stayed uncommitted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `JAVA_HOME` unset in shell — used Android Studio JBR at `%LOCALAPPDATA%\Programs\Android Studio\jbr` for Gradle compile
- Working tree had unrelated add-food widget WIP mixed into Manifest/strings — isolated KBJU-only commit, then restored WIP on disk

## Manual device smoke (executor note)

1. `pnpm cap:sync` / install debug APK
2. Long-press home → Widgets → «КБЖУ сегодня» (~2×2) with preview
3. Open app, log a ready meal, background — rings should update
4. Tap widget → app home (not add-food deep link)
5. Confirm existing add-food action widgets still work

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Quick task deliverable complete pending optional device UAT (coverage D4)
- No blockers for merge of JS + native KBJU widget code

## Self-Check: PASSED

- FOUND: `src/shared/lib/computeTodayKbjuSnapshot.ts`
- FOUND: `src/features/kbju-widget/index.ts`
- FOUND: `android/.../KbjuRingsWidgetProvider.java`
- FOUND: `android/.../KbjuWidgetPlugin.java`
- FOUND commits: `2dd73d5`, `50b86a1`, `e01d474`

---
*Phase: 260807-jk6-android-home-widget-today-kbju-progress-*
*Completed: 2026-08-07*
