# Status bar dark icons (Android light UI)

**Date:** 2026-08-12  
**Status:** approved  
**Package:** `apps/ai-food`

## Problem

On Android Capacitor builds with a light (white) content background, system status bar icons (time, signal, battery) render light/white and are nearly invisible. The in-app header («AI Food») is fine; only the OS status bar lacks contrast.

Root cause: no `@capacitor/status-bar` usage; Android theme does not set light-status-bar (dark icons) for the WebView activity.

## Goal

- Dark (readable) status bar icons on the light home/diary UI.
- Keep the white/light content background — no brand-colored status strip as the primary fix.
- Apply once at app bootstrap on native platforms; web unchanged.

## Decision

Use **`@capacitor/status-bar`** with **`Style.Dark`** (Capacitor naming: dark *icons* for light backgrounds), plus a white status bar background on Android where the platform still paints a bar color.

Optional native safety net: `android:windowLightStatusBar=true` in the NoActionBar theme so icons are dark before JS runs.

Rejected:

- **Colored status bar** (green / gray strip) — fixes contrast but changes chrome and fights the edge-to-edge light look.
- **Custom safe-area header scrim** — more layout churn across screens for the same contrast problem.

## Implementation sketch

1. Add dependency `@capacitor/status-bar` (Capacitor 8-compatible) in `apps/ai-food`.
2. New small bootstrap helper (e.g. `src/app/configureStatusBar.ts` or a tiny React effect component mounted from `App` / `Providers`):
   - Guard with `Capacitor.isNativePlatform()`.
   - `StatusBar.setStyle({ style: Style.Dark })`.
   - `StatusBar.setBackgroundColor({ color: '#ffffff' })` (Android; no-op / ignore errors on platforms that don’t support it).
3. Wire call once at startup (same layer as `BackButtonHandler` / app shell — not per-page).
4. `pnpm cap:sync` so the Android plugin registers.
5. Optionally set in `android/app/src/main/res/values/styles.xml` on `AppTheme.NoActionBar`:
   - `android:windowLightStatusBar` = `true`
   - status bar color white if needed for pre-JS splash→content transition

## Out of scope

- Per-screen style switching (e.g. dark camera / scan overlays).
- iOS-only polish beyond plugin defaults.
- Changing `theme-color` meta or redesigning the app header.
- Navigation bar (gesture bar) color theming.

## Success criteria

- On a light home screen Android build: time / battery / network icons are clearly visible against the status area.
- Web / `pnpm dev` behavior unchanged.
- No new colored band above the in-app toolbar unless the OS still draws a thin system bar (white is OK).
