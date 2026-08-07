---
phase: 260807-kjb-android-home-widget-apple-fitness-style-
plan: 01
status: complete
subsystem: android-widgets
tags: [android, appwidget, kbju, activity-rings, canvas, capacitor]

requires:
  - phase: 260807-jk6-android-home-widget-today-kbju-progress-
    provides: ai-food-widget-kbju Preferences snapshot + KbjuRingsWidgetProvider pattern
provides:
  - Shared KbjuWidgetSnapshot CapacitorStorage reader
  - KbjuActivityRingsWidgetProvider concentric 4-ring bitmap widget (~2×2)
  - Plugin refresh notify for activity rings alongside separate rings + weekly
affects: [android-home-widgets, kbju-glance]

tech-stack:
  added: []
  patterns:
    - package-private KbjuWidgetSnapshot shared Preferences parse for KBJU widgets
    - single Canvas ARGB_8888 bitmap with nested RectF arcs for Activity Rings look

key-files:
  created:
    - android/app/src/main/java/com/aifood/app/KbjuWidgetSnapshot.java
    - android/app/src/main/java/com/aifood/app/KbjuActivityRingsWidgetProvider.java
    - android/app/src/main/res/layout/widget_kbju_activity_rings.xml
    - android/app/src/main/res/layout/widget_preview_kbju_activity_rings.xml
    - android/app/src/main/res/xml/widget_kbju_activity_rings_info.xml
    - android/app/src/main/res/drawable/widget_preview_kbju_activity_rings.png
  modified:
    - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java
    - android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
    - android/app/src/main/AndroidManifest.xml
    - android/app/src/main/res/values/strings.xml

key-decisions:
  - "D-01: Second KBJU widget (concentric); keep existing separate-cell rings"
  - "D-03/D-09: Shared KbjuWidgetSnapshot; no new JS snapshot sync"
  - "D-04/D-05: Outer→inner kcal/protein/fat/carbs colors; over-goal red; ROUND caps"
  - "D-06: Center remaining-kcal text instead of dense legend"
  - "PendingIntent requestCode 2608071 to avoid collision with rings 260807"

patterns-established:
  - "KbjuWidgetSnapshot.read(Context) is the single parse path for ai-food-widget-kbju"
  - "KbjuWidgetPlugin.refresh notifies all KBJU-related AppWidgetProviders"

requirements-completed: [QUICK-260807-kjb]

coverage:
  - id: D1
    description: Shared KbjuWidgetSnapshot extracted; existing 2×2 rings provider uses it
    requirement: QUICK-260807-kjb
    verification:
      - kind: other
        ref: git show 22c33f7 --stat
        status: pass
    human_judgment: false
  - id: D2
    description: Concentric Apple-style KBJU activity rings widget registered with Russian picker label
    requirement: QUICK-260807-kjb
    verification:
      - kind: other
        ref: rg KbjuActivityRingsWidgetProvider AndroidManifest + KbjuWidgetPlugin
        status: pass
      - kind: other
        ref: ./gradlew :app:compileDebugJavaWithJavac
        status: unknown
    human_judgment: true
    rationale: Device pin/tap/update smoke and compile need local JDK/device; JAVA_HOME missing on executor host

duration: 8min
completed: 2026-08-07
status: complete
---

# Phase 260807-kjb: Android concentric KBJU activity rings Summary

**Second ~2×2 home widget draws Apple Fitness–style concentric KBJU rings from the existing `ai-food-widget-kbju` snapshot, with shared parse helper and plugin refresh wiring.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-07T14:50:18Z
- **Completed:** 2026-08-07T14:55:00Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

- Extracted package-private `KbjuWidgetSnapshot` (CapacitorStorage / `ai-food-widget-kbju`, stale-date zero-consumed, fallback goals) and refactored `KbjuRingsWidgetProvider` to use it without visual changes.
- Added `KbjuActivityRingsWidgetProvider`: one Canvas bitmap, outer→inner Ккал→Белки→Жиры→Углеводы, muted tracks, ROUND caps, over-goal `widget_kbju_over`, center remaining kcal, MAIN/LAUNCHER tap (`requestCode` 2608071).
- Registered receiver + `widget_kbju_activity_rings_info` (2×2, previewLayout + previewImage); picker string «КБЖУ кольца»; `KbjuWidgetPlugin.refresh` notifies activity rings + existing rings + weekly.

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `22c33f7` | refactor(260807-kjb): extract KbjuWidgetSnapshot shared helper |
| 2 | `9d7292a` | feat(260807-kjb): add Apple-style concentric KBJU activity rings widget |

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates

None.

## Known Stubs

None.

## Verification Notes

- `JAVA_HOME` / Android Studio JBR not found on executor host → `./gradlew :app:compileDebugJavaWithJavac` **skipped**. Note for local verify before device smoke.
- Static checks: `KbjuActivityRingsWidgetProvider` present in `AndroidManifest.xml` and `KbjuWidgetPlugin.java`; `KbjuRingsWidgetProvider` receiver retained; no JS snapshot changes.

## Threat Flags

None beyond plan threat model (T-kjb-01/02 mitigated as specified).

## Self-Check: PASSED

- FOUND: `KbjuWidgetSnapshot.java`, `KbjuActivityRingsWidgetProvider.java`, layout/info/preview/png, string, manifest receiver, plugin notify
- FOUND commits: `22c33f7`, `9d7292a`
