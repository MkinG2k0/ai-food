---
phase: 260807-itx
plan: 01
status: complete
subsystem: mobile
tags: [android, app-widget, deep-link, capacitor, add-food]

requires:
  - phase: add-food-sheet
    provides: Six AddFoodSheet menu actions and routes
provides:
  - Android home-screen widget with six quick-add buttons
  - aifood://add/<action> deep-link parser and Capacitor handler
  - Home ?add=gallery|describe → AddFoodSheet autoAction
affects: [android-widget, deep-links, add-food]

tech-stack:
  added: []
  patterns:
    - "Custom-scheme deep links aifood://add/<action> shared by widget + JS"
    - "DeepLinkHandler null component (Capacitor App listeners) next to BackButtonHandler"
    - "Home searchParams consume-once for gallery/describe sheet flows"

key-files:
  created:
    - apps/ai-food/src/shared/lib/addFoodDeepLink.ts
    - apps/ai-food/src/shared/lib/addFoodDeepLink.test.ts
    - apps/ai-food/src/app/DeepLinkHandler.tsx
    - apps/ai-food/android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java
    - apps/ai-food/android/app/src/main/res/layout/widget_add_food.xml
    - apps/ai-food/android/app/src/main/res/xml/add_food_widget_info.xml
  modified:
    - apps/ai-food/src/app/AppShell.tsx
    - apps/ai-food/src/features/add-food/ui/AddFoodSheet.tsx
    - apps/ai-food/src/pages/home/ui/HomePage.tsx
    - apps/ai-food/android/app/src/main/AndroidManifest.xml
    - apps/ai-food/android/app/src/main/java/com/aifood/app/MainActivity.java

key-decisions:
  - "Six action tokens scan|scan-describe|gallery|describe|manual|favorites mirror AddFoodSheet"
  - "gallery/describe open via /?add= + AddFoodSheet autoAction (not direct navigate to picker routes)"
  - "Allowlist-only parseAddFoodDeepLink; unknown URLs ignored"
  - "Widget PendingIntent ACTION_VIEW → MainActivity singleTask + onNewIntent setIntent"

patterns-established:
  - "Native widget URI contract documented in JS comment twinning AddFoodWidgetProvider"
  - "URL dedupe (1.5s) between getLaunchUrl and appUrlOpen"

requirements-completed: [QUICK-260807-itx]

coverage:
  - id: D1
    description: parseAddFoodDeepLink maps six actions and rejects unknown/https
    requirement: QUICK-260807-itx
    verification:
      - kind: unit
        ref: apps/ai-food/src/shared/lib/addFoodDeepLink.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Android widget + aifood intent-filter + MainActivity handoff
    requirement: QUICK-260807-itx
    verification:
      - kind: other
        ref: static presence of AddFoodWidgetProvider + scheme aifood in manifest
        status: pass
    human_judgment: true
    rationale: Device install required to confirm widget UI and cold/warm deep-link delivery

duration: 8min
completed: 2026-08-07
status: complete
---

# Phase 260807-itx Plan 01: Android widgets quick-action buttons Summary

**Android home-screen widget with six emerald outline buttons launches the same AddFoodSheet flows via `aifood://add/<action>` deep links handled in Capacitor.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-07T10:38:49Z
- **Completed:** 2026-08-07T10:45:00Z
- **Tasks:** 3/3
- **Files modified:** 21

## Accomplishments

- Allowlisted `parseAddFoodDeepLink` + Vitest coverage (11 tests)
- `DeepLinkHandler` on native: `getLaunchUrl` + `appUrlOpen` with 1.5s URL dedupe
- Home `?add=gallery|describe` opens sheet with `autoAction`; query cleared after consume
- `AddFoodWidgetProvider` RemoteViews + six PendingIntents; manifest receiver + VIEW filter
- `MainActivity.onNewIntent` / `onCreate` keep VIEW URI for Capacitor bridge

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | aed20d5 | Deep-link parser, DeepLinkHandler, Home/AddFoodSheet wiring |
| 2 | d1b710b | Android App Widget + intent-filter + MainActivity handoff |
| 3 | c4961a9 | Regression test for full widget URI list |

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- Task 1 was `tdd="true"`; unit tests and implementation landed in the same feat commit (`aed20d5`) rather than separate RED/GREEN commits. Behavior coverage is present and green.
- Task 3 added an ordered URI snapshot test (`c4961a9`).

## Human Device Checklist

1. `pnpm cap:build` (or Android Studio assembleDebug) and install on device/emulator.
2. Long-press home → Widgets → AI Food → add «Быстрое добавление еды».
3. Tap each of 6 buttons: expect `/scan`, `/scan?describe=1`, gallery picker, describe sheet, `/manual-entry`, `/favorites`.
4. With app backgrounded, tap a widget button again — action still fires (singleTask + onNewIntent).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `apps/ai-food/src/shared/lib/addFoodDeepLink.ts`
- FOUND: `apps/ai-food/src/app/DeepLinkHandler.tsx`
- FOUND: `apps/ai-food/android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java`
- FOUND: commits aed20d5, d1b710b, c4961a9
