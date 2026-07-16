---
phase: quick-260716-5gj
plan: 01
subsystem: ui
tags: [pwa, vite-plugin-pwa, safe-area, meal-detail, healthiness, confidence]

requires:
  - phase: quick-260716-4aa
    provides: Meal.healthiness / Meal.confidence + MacroBars in MealSummaryEditor
provides:
  - Installable Vite PWA (manifest + SW + icons)
  - viewport-fit=cover and safe-area padding on Home / Meal Detail
  - Polished Полезность/Точность layout with thicker bars and 2×2 macros
affects: [home, meal-detail, pwa]

tech-stack:
  added: [vite-plugin-pwa, workbox-window]
  patterns:
    - VitePWA registerType autoUpdate + virtual:pwa-register
    - CSS utilities pt-safe-header / pb-safe-fab / pb-safe via env(safe-area-inset-*)

key-files:
  created:
    - apps/mobile/public/pwa-192x192.png
    - apps/mobile/public/pwa-512x512.png
    - apps/mobile/public/apple-touch-icon.png
  modified:
    - apps/mobile/package.json
    - apps/mobile/vite.config.ts
    - apps/mobile/index.html
    - apps/mobile/src/main.tsx
    - apps/mobile/src/vite-env.d.ts
    - apps/mobile/src/app/styles/global.css
    - apps/mobile/src/pages/home/ui/HomePage.tsx
    - apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
    - apps/mobile/src/features/edit-meal/ui/MealSummaryEditor.tsx
    - apps/mobile/src/pages/meal-detail/ui/MealDetailPage.tsx
    - pnpm-lock.yaml

key-decisions:
  - "D-01: Web PWA via vite-plugin-pwa autoUpdate (not Capacitor rewrite)"
  - "D-02: Manifest name AI Food, theme #10b981, icons 192/512 in public/"
  - "D-03: viewport-fit=cover + safe-area padding on DailyHeader, FAB, Meal Detail"
  - "D-04: Layout-only polish for healthiness/confidence; no schema changes"
  - "Installed workbox-window peer so virtual:pwa-register resolves at build"

patterns-established:
  - "PWA registration in main.tsx via registerSW({ immediate: true })"
  - "Safe-area utilities in global.css reused by header/FAB/detail"

requirements-completed: [QUICK-5gj]

coverage:
  - id: D1
    description: Production build registers SW and exposes installable webmanifest (AI Food, teal theme)
    requirement: QUICK-5gj
    verification:
      - kind: other
        ref: pnpm --filter @ai-food/mobile build → dist/sw.js + dist/manifest.webmanifest
        status: pass
    human_judgment: false
  - id: D2
    description: Home and Meal Detail respect safe-area insets (not pt-12-only)
    requirement: QUICK-5gj
    verification:
      - kind: other
        ref: DailyHeader pt-safe-header; Home FAB pb-safe-fab; MealDetail pb-safe
        status: pass
      - kind: manual_procedural
        ref: smoke on notched device / Chrome Application tab
        status: unknown
    human_judgment: true
    rationale: Notch/home-indicator clearance needs visual smoke on a real device or device emulation
  - id: D3
    description: Meal Detail Полезность N/10 and Точность N% as thicker spaced emerald bars; macros 2×2
    requirement: QUICK-5gj
    verification:
      - kind: other
        ref: MealSummaryEditor MacroBar thick + grid-cols-2
        status: pass
      - kind: unit
        ref: favorites + retry regression tests
        status: pass
    human_judgment: true
    rationale: Screenshot spacing intent needs brief visual confirmation on Meal Detail

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase quick-260716-5gj Plan 01: PWA + Meal Detail UI/UX Summary

**Installable Vite PWA shell (manifest + SW + safe-area) and readable Meal Detail Полезность/Точность layout with 2×2 macros.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-16T00:59:11Z
- **Completed:** 2026-07-16T01:04:00Z
- **Tasks:** 2/2
- **Files modified:** 13

## Accomplishments

- `vite-plugin-pwa` + `workbox-window` produce `dist/sw.js` and `manifest.webmanifest` (name AI Food, theme `#10b981`)
- Emerald PNG icons (192/512/180) under `apps/mobile/public/`; SW registered via `virtual:pwa-register`
- Safe-area: `viewport-fit=cover`, `pt-safe-header` on DailyHeader/Meal Detail, FAB `pb-safe-fab`
- MealSummaryEditor: thicker range bars, more vertical rhythm, forced `grid-cols-2` macros; hero `aspect-[4/3]`

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `bc3f6c8` | feat(quick-260716-5gj): add PWA installability and safe-area shell |
| 2 | `7895879` | feat(quick-260716-5gj): polish Meal Detail healthiness/accuracy layout |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing `workbox-window` peer for `virtual:pwa-register`**
- **Found during:** Task 1 build
- **Issue:** Vite build failed resolving `workbox-window` from vite-plugin-pwa virtual module
- **Fix:** `pnpm --filter @ai-food/mobile add -D workbox-window`
- **Files modified:** `apps/mobile/package.json`, `pnpm-lock.yaml`
- **Commit:** `bc3f6c8`

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None beyond plan register (T-5gj-01 mitigated via autoUpdate generateSW default precache; no custom runtimeCaching of API secrets).

## Verification

- `pnpm --filter @ai-food/mobile exec tsc --noEmit` — pass
- `pnpm --filter @ai-food/mobile build` — pass; `dist/sw.js`, `dist/manifest.webmanifest` present
- `vitest run` favorites + retry tests — 17/17 pass

## Self-Check: PASSED

- FOUND: `apps/mobile/public/pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`
- FOUND: commits `bc3f6c8`, `7895879`
- FOUND: `apps/mobile/dist/sw.js`, `apps/mobile/dist/manifest.webmanifest`
