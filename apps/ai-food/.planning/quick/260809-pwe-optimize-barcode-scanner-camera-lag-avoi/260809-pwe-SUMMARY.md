---
phase: 260809-pwe
plan: 01
subsystem: scan-barcode
tags: [barcode, camera, performance, BarcodeDetector, rAF]

requires: []
provides:
  - rAF/idle live barcode decode loop without fixed-delay timers
  - live-safe detectBarcodeInVideo mode that never JPEG+scanFile
  - cached BarcodeDetector instance across calls
affects: [scan-barcode, ScanPage barcode live preview]

tech-stack:
  added: []
  patterns:
    - "schedule-after-complete via rAF/requestIdleCallback for camera decode"
    - "detect mode live|capture to split hot-path vs shutter fallback"

key-files:
  created: []
  modified:
    - src/features/scan-barcode/ui/LiveBarcodeScan.tsx
    - src/features/scan-barcode/lib/detectBarcode.ts
    - src/features/scan-barcode/lib/detectBarcode.test.ts

key-decisions:
  - "Live decode chains rAF/idle after settle with ≤120ms soft gap — no setTimeout cadence"
  - "mode live never allocates JPEG/scanFile; capture default preserves shutter fallback"
  - "Single lazy-cached BarcodeDetector; resetBarcodeFileScannerForTests clears it"

patterns-established:
  - "LiveBarcodeScan: busy gate + scheduleNext after finally"
  - "detectBarcodeInVideo({ mode: 'live' }) for continuous preview; default capture for shutter"

requirements-completed: [QUICK-260809]

coverage:
  - id: D1
    description: LiveBarcodeScan schedules decode via rAF/idle, not fixed-delay timers
    requirement: QUICK-260809
    verification:
      - kind: other
        ref: "rg setTimeout|setInterval LiveBarcodeScan.tsx → 0; requestAnimationFrame present"
        status: pass
    human_judgment: false
  - id: D2
    description: Live detect path never hits JPEG+scanFile; detector cached; shutter keeps capture
    requirement: QUICK-260809
    verification:
      - kind: unit
        ref: src/features/scan-barcode/lib/detectBarcode.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Camera preview stays smooth during barcode mode; shutter still finds codes
    requirement: QUICK-260809
    verification: []
    human_judgment: true
    rationale: Smoothness and real-device BarcodeDetector/shutter need device smoke on /scan?mode=barcode

duration: 5min
completed: 2026-08-09
status: complete
---

# Phase 260809-pwe Plan 01: Optimize barcode scanner camera lag Summary

**Live barcode decode no longer freezes the camera preview on a ~350ms timer — rAF/idle scheduling plus a live-safe path that never does JPEG+scanFile on the hot path.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-09T15:42:05Z
- **Completed:** 2026-08-09T15:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced recursive `setTimeout(350)` cadence in `LiveBarcodeScan` with requestIdleCallback/rAF chaining after each detect settles (busy gate kept; soft min gap 120ms).
- Added `detectBarcodeInVideo(..., { mode: 'live' | 'capture' })` with lazy-cached `BarcodeDetector`; live never creates JPEG blobs or calls `Html5Qrcode.scanFile`.
- Wired live scan to `mode: 'live'`; ScanPage shutter keeps default `capture` (full fallback).
- Unit tests cover live no-file-fallback, detector cache reuse, and reset clearing the cache.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c88d9fc | feat: rAF live barcode loop without fixed delay |
| 2 (RED) | 159b21a | test: failing tests for live-safe barcode detect |
| 2 (GREEN) | a793488 | feat: live-safe detect with cached BarcodeDetector |

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commit `159b21a` present before GREEN `a793488`.
- Task 1 verified via automated `rg` (no separate vitest for scheduling).

## Known Stubs

None.

## Threat Flags

None — no new network/auth/file trust boundaries; decode stays on-device.

## Self-Check: PASSED

- FOUND: `src/features/scan-barcode/ui/LiveBarcodeScan.tsx`
- FOUND: `src/features/scan-barcode/lib/detectBarcode.ts`
- FOUND: `src/features/scan-barcode/lib/detectBarcode.test.ts`
- FOUND: commits c88d9fc, 159b21a, a793488
