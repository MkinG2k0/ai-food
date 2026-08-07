---
phase: 260807-kps-android-widgets-adapt-colors-to-device-l
plan: 01
status: complete
subsystem: android-widgets
tags: [android, appwidget, dark-theme, values-night]
---

# Summary: Theme-aware widget colors

**Widgets follow device light/dark theme via `values-night` + refresh on night-mode change**

## Changes
- `res/values-night/colors.xml` — dark zinc surfaces, light labels, brighter accents
- `WidgetThemeRefresh` — updates all App Widget providers
- `WidgetThemeReceiver` — ENTERING/EXITING_NIGHT_MODE (API 29+)
- `MainActivity.onResume` — refresh if night mode changed while away
- Layouts/icons already use `@color/widget_*` — no layout rewrite

## Commits
(orchestrator)

## Verify
Toggle system dark theme → home widgets should show dark cards / light text (may need open app once on older OEMs).
