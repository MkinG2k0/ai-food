---
phase: 260807-k0v-android-home-widget-weekly-calorie-chart
plan: 01
status: complete
subsystem: ui
tags: [android, capacitor, app-widget, weekly-calories, preferences, vitest, deep-link]

requires:
  - phase: 260807-jk6-android-home-widget-today-kbju-progress-
    provides: KbjuWidget sync/plugin + CapacitorStorage rings snapshot pattern
provides:
  - Lean week kcal Preferences snapshot (ai-food-widget-week-kcal)
  - Dual Preferences write + single KbjuWidget.refresh for rings + weekly chart
  - Android ~4×2 weekly stacked-bar calorie widget with tap → aifood://stats
  - parseAppDeepLink routing stats + existing add-food links
affects:
  - android home widgets
  - DeepLinkHandler

tech-stack:
  added: []
  patterns:
    - Extend existing kbju-widget sync (no second AppShell listener)
    - JS raw series + goal; native niceChartMax / Atwater bar heights
    - Dual AppWidgetProvider notify from one Capacitor plugin refresh

key-files:
  created:
    - src/features/kbju-widget/model/buildWeekKcalWidgetSnapshot.ts
    - src/features/kbju-widget/model/buildWeekKcalWidgetSnapshot.test.ts
    - src/shared/lib/parseAppDeepLink.ts
    - src/shared/lib/parseAppDeepLink.test.ts
    - android/app/src/main/java/com/aifood/app/WeeklyCaloriesWidgetProvider.java
    - android/app/src/main/res/layout/widget_weekly_calories.xml
    - android/app/src/main/res/layout/widget_preview_weekly_calories.xml
    - android/app/src/main/res/xml/widget_weekly_calories_info.xml
    - android/app/src/main/res/drawable/widget_preview_weekly_calories.png
  modified:
    - src/features/kbju-widget/model/syncKbjuWidget.ts
    - src/features/kbju-widget/index.ts
    - src/shared/lib/index.ts
    - src/app/DeepLinkHandler.tsx
    - android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
    - android/app/src/main/AndroidManifest.xml
    - android/app/src/main/res/values/strings.xml
    - android/app/src/main/res/values/colors.xml

key-decisions:
  - "D-01..D-09 honored: weekly stacked chart widget, dual sync/refresh, stats deep link"
  - "PendingIntent FLAG_IMMUTABLE on M+; requestCode 2608071 distinct from rings (T-k0v-03)"
  - "Kept existing 200ms debounce; one refresh() notifies both providers (T-k0v-04)"
  - "parseAppDeepLink only aifood/com.aifood.app + host stats → /stats (T-k0v-05)"

patterns-established:
  - "Multi-widget data path: one JS sync writes N Preference keys → one plugin refresh → N providers"
  - "App deep links: parseAppDeepLink wraps add-food parser + fixed routes"

requirements-completed: [QUICK-260807-k0v]

coverage:
  - id: D1
    description: Week kcal snapshot builder + dual Preferences sync + stats deep link
    requirement: QUICK-260807-k0v
    verification:
      - kind: unit
        ref: src/features/kbju-widget/model/buildWeekKcalWidgetSnapshot.test.ts
        status: pass
      - kind: unit
        ref: src/shared/lib/parseAppDeepLink.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Native weekly chart widget + dual plugin refresh + manifest host=stats
    requirement: QUICK-260807-k0v
    verification:
      - kind: other
        ref: "./gradlew :app:compileDebugJavaWithJavac --quiet"
        status: unknown
    human_judgment: true
    rationale: JAVA_HOME missing in executor environment; device smoke required for picker/chart/tap

duration: 5min
completed: 2026-08-07
status: complete
---

# Phase 260807-k0v Plan 01: Weekly calorie chart home widget Summary

**Android home widget with Mon→Sun KBJU stacked bars synced via lean Preferences, tap opens `/stats` — rings and add-food widgets unchanged.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-07T14:28:47Z
- **Completed:** 2026-08-07T14:34:01Z
- **Tasks:** 2/2
- **Files modified:** 17

## Accomplishments

- `buildWeekKcalWidgetSnapshot` maps `getWeeklyCalorieSeries(meals, 0)` + `goalKcal` (fallback 2000) to lean JSON
- `syncKbjuWidget` writes both `ai-food-widget-kbju` and `ai-food-widget-week-kcal`, then one `KbjuWidget.refresh()`
- `parseAppDeepLink` + DeepLinkHandler route `aifood://stats` → `/stats`; add-food links unchanged
- `WeeklyCaloriesWidgetProvider` draws Canvas stacked bars (У/Ж/Б stack order carbs→fat→protein), goal line, RU day labels, range + average summary
- `KbjuWidgetPlugin.refresh` notifies rings **and** weekly providers; new receiver + `host=stats` intent-filter; add-food/rings receivers untouched

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 RED | `ca71e76` | test(260807-k0v-01): failing week snapshot + stats deep link tests |
| 1 GREEN | `26a6031` | feat(260807-k0v-01): week kcal snapshot sync and stats deep link |
| 2 | `56d7183` | feat(260807-k0v-01): Android weekly calorie chart widget and dual refresh |

## Deviations from Plan

None - plan executed as written. Android compile skipped (environment): noted below.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None beyond plan register (T-k0v-01..05 mitigated/accepted as specified).

## Verification

- Vitest: 9/9 passed (`buildWeekKcalWidgetSnapshot` + `parseAppDeepLink`)
- Android `./gradlew :app:compileDebugJavaWithJavac --quiet`: **not run** — `JAVA_HOME` unset / no `java` on PATH in executor shell. Code complete; compile on a machine with JDK before device install.

### Device smoke (manual)

1. Build/install debug APK with JDK set
2. Pin «Калории за неделю» from widget picker (preview should show stacked bars)
3. Log ready meals across the week; background app — chart updates; goal dashed line when goal present
4. Tap widget → app opens at `/stats`
5. Confirm KBJU rings + add-food widgets still work

## Self-Check: PASSED

- FOUND: `buildWeekKcalWidgetSnapshot.ts`, `WeeklyCaloriesWidgetProvider.java`, preview PNG/layouts/info
- FOUND commits: `ca71e76`, `26a6031`, `56d7183`
