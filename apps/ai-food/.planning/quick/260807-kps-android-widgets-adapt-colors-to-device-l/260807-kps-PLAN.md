---
phase: 260807-kps
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - android/app/src/main/res/values-night/colors.xml
  - android/app/src/main/java/com/aifood/app/WidgetThemeRefresh.java
  - android/app/src/main/AndroidManifest.xml
  - android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/AddFoodActionWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/KbjuActivityRingsWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/WeeklyCaloriesWidgetProvider.java
autonomous: true
---

# Plan: Theme-aware widget colors

## Goal
Adapt all home-screen widgets to device light/dark theme via `values-night` colors; refresh widgets when night mode toggles so Canvas-drawn rings/charts pick new colors.

## Tasks

### Task 1: Night color palette + theme-change refresh
1. Add `res/values-night/colors.xml` — dark zinc surfaces/labels; slightly brighter accents for contrast; keep semantic KBJU hues.
2. Add `WidgetThemeRefresh` helper that updates all known AppWidget providers.
3. In each AppWidgetProvider `onReceive`, handle `UiModeManager.ACTION_ENTERING_NIGHT_MODE` / `ACTION_EXITING_NIGHT_MODE` (API 29+) by calling update; also handle `ACTION_CONFIGURATION_CHANGED` only if delivered to existing receivers (optional — prefer night-mode actions).
4. Register night-mode actions on each widget `<receiver>` intent-filter in AndroidManifest.
5. Layouts already use `@color/widget_*` and drawables reference colors — no layout rewrite needed.

## Done when
- Dark theme: dark card/bg, light labels, visible accents
- Light theme unchanged
- Toggle system dark mode → widgets refresh without reinstall
