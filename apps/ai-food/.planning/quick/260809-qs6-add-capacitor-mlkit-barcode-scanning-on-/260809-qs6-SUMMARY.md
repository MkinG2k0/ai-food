---
phase: 260809-qs6
plan: 01
subsystem: ui
tags: [capacitor, mlkit, barcode-scanning, android, dual-path]

requires: []
provides:
  - Dual-path barcode scan: Cap 8 ML Kit continuous startScan on native Android
  - Web LiveBarcodeScan fallback unchanged
  - Transparent WebView body class for camera-behind-chrome UX
affects: [scan-barcode, ScanPage]

tech-stack:
  added: ["@capacitor-mlkit/barcode-scanning@^8.1.0"]
  patterns:
    - "Dynamic import native plugin only on Capacitor.isNativePlatform()"
    - "Camera ownership handoff: stop getUserMedia before startScan; restore on leave"
    - "Continuous barcodesScanned listener (not RTU scan())"

key-files:
  created:
    - apps/ai-food/src/features/scan-barcode/lib/nativeBarcodeScan.ts
    - apps/ai-food/src/features/scan-barcode/ui/NativeMlKitBarcodeScan.tsx
  modified:
    - apps/ai-food/package.json
    - pnpm-lock.yaml
    - apps/ai-food/android/app/src/main/AndroidManifest.xml
    - apps/ai-food/android/app/capacitor.build.gradle
    - apps/ai-food/android/capacitor.settings.gradle
    - apps/ai-food/src/features/scan-barcode/index.ts
    - apps/ai-food/src/app/styles/global.css
    - apps/ai-food/src/pages/scan/ui/ScanPage.tsx

key-decisions:
  - "Continuous startScan + barcodesScanned (Cap 8), not RTU scan()"
  - "Native barcode takes camera ownership; food/web keep getUserMedia"
  - "Torch disabled on native barcode; shutter toast «Наведите на код»"

patterns-established:
  - "Mirror useSpeechToText: dynamic import + requestPermissions + listener cleanup"
  - "body.mlkit-barcode-scan-active for WebView transparency during ML Kit"

requirements-completed: [QUICK-260809-qs6]

coverage:
  - id: D1
    description: Cap 8 ML Kit plugin installed with barcode_ui Manifest + Android sync
    requirement: QUICK-260809-qs6
    verification:
      - kind: other
        ref: "node -e package.json ^8 + Manifest barcode_ui + cap sync android"
        status: pass
    human_judgment: false
  - id: D2
    description: Native continuous startScan helpers + transparent CSS + barrel exports
    requirement: QUICK-260809-qs6
    verification:
      - kind: other
        ref: "pnpm exec tsc --noEmit -p tsconfig.json"
        status: pass
    human_judgment: false
  - id: D3
    description: ScanPage dual-path — ML Kit on native, LiveBarcodeScan on web; food camera intact
    requirement: QUICK-260809-qs6
    verification:
      - kind: unit
        ref: "pnpm exec vitest run src/features/scan-barcode (14 passed)"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit -p tsconfig.json"
        status: pass
    human_judgment: true
    rationale: "Android APK continuous detect → OFF confirm and food getUserMedia toggle need device smoke"

# Metrics
duration: 8min
completed: 2026-08-09
status: complete
---

# Phase 260809-qs6 Plan 01: ML Kit barcode scanning Summary

**Dual-path `/scan?mode=barcode`: Cap 8 continuous ML Kit `startScan` on native Android, existing LiveBarcodeScan on web — OFF/confirm/save untouched.**

## Performance

- **Duration:** ~8 min (resume after interrupt; Task 1 deps were pre-installed)
- **Started:** 2026-08-09T19:23:20Z
- **Completed:** 2026-08-09T19:26:30Z
- **Tasks:** 3/3
- **Files modified:** 10

## Accomplishments

- Installed `@capacitor-mlkit/barcode-scanning@^8.1.0`, Manifest `barcode_ui` meta-data, `cap sync android` Gradle wiring
- Headless continuous scan module (`startScan` / `barcodesScanned` / stop cleanup) + `mlkit-barcode-scan-active` CSS
- ScanPage camera ownership: native barcode releases getUserMedia; web LiveBarcodeScan + food preview unchanged

## Task Commits

1. **Task 1: Install Cap 8 ML Kit plugin + Android Manifest** - `0d18be2` (feat)
2. **Task 2: Native continuous ML Kit scan module + transparent WebView CSS** - `5c3b075` (feat)
3. **Task 3: ScanPage dual-path camera ownership** - `fb24778` (feat)

**Plan metadata:** not committed (per resume instructions — SUMMARY/STATE/PLAN/CONTEXT left uncommitted)

## Files Created/Modified

- `apps/ai-food/src/features/scan-barcode/lib/nativeBarcodeScan.ts` — availability + start/stop helpers
- `apps/ai-food/src/features/scan-barcode/ui/NativeMlKitBarcodeScan.tsx` — headless continuous UI
- `apps/ai-food/src/features/scan-barcode/index.ts` — barrel exports
- `apps/ai-food/src/app/styles/global.css` — transparent WebView class
- `apps/ai-food/src/pages/scan/ui/ScanPage.tsx` — dual path + torch/shutter native behavior
- `apps/ai-food/package.json`, `pnpm-lock.yaml` — Cap 8 plugin pin
- `apps/ai-food/android/app/src/main/AndroidManifest.xml` — barcode_ui meta-data
- `apps/ai-food/android/app/capacitor.build.gradle`, `capacitor.settings.gradle` — plugin sync

## Decisions Made

- Continuous `startScan` (not RTU `scan()`) per plan discretion
- Cap 8 event name `barcodesScanned` (typed API) instead of legacy README `barcodeScanned`
- Gallery barcode still uses web `detectBarcodeInFile` on both platforms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cap 8 listener is `barcodesScanned`, not `barcodeScanned`**
- **Found during:** Task 2
- **Issue:** PLAN / older README examples use singular `barcodeScanned`; `@capacitor-mlkit/barcode-scanning@8.1.0` typings only expose `barcodesScanned` with `barcodes[]`
- **Fix:** Listen to `barcodesScanned` and take `event.barcodes[0]?.rawValue`
- **Files modified:** `nativeBarcodeScan.ts`
- **Verification:** `tsc --noEmit` clean
- **Committed in:** `5c3b075`

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Required for Cap 8 correctness; continuous UX unchanged

## Issues Encountered

None beyond the Cap 8 listener rename.

## User Setup Required

None - no external service configuration required. Rebuild Android APK to exercise native path.

## Next Phase Readiness

- Ready for device smoke: APK `/scan?mode=barcode` continuous detect → OFF confirm; toggle Еда → getUserMedia; localhost barcode unchanged
- OFF / confirm / save not modified

## Manual smoke (executor note)

1. Build/install Android APK
2. Open `/scan?mode=barcode` — point at EAN/UPC → product confirm
3. Switch to Еда — food camera preview works
4. Browser/localhost barcode still uses LiveBarcodeScan

## Self-Check: PASSED

- FOUND: `apps/ai-food/src/features/scan-barcode/lib/nativeBarcodeScan.ts`
- FOUND: `apps/ai-food/src/features/scan-barcode/ui/NativeMlKitBarcodeScan.tsx`
- FOUND: commits `0d18be2`, `5c3b075`, `fb24778`
- Source audit: uses `startScan` (not RTU `scan()`)

---
*Phase: 260809-qs6*
*Completed: 2026-08-09*
