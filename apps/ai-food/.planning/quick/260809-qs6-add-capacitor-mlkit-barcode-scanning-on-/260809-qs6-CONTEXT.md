# Quick Task 260809-qs6: Native ML Kit barcode - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Task Boundary

Integrate `@capacitor-mlkit/barcode-scanning` for Capacitor Android APK barcode mode. Keep existing web camera + BarcodeDetector path for browser/PWA.

</domain>

<decisions>
## Implementation Decisions

### Platform split
- Native (`Capacitor.isNativePlatform()` + `BarcodeScanner.isSupported()`): use ML Kit plugin
- Web / unsupported: keep current `LiveBarcodeScan` + `detectBarcodeInVideo` (no regression on localhost)

### UX on native
- Prefer continuous scan (`startScan` / barcodeScanned listener) while ScanPage mode === barcode, so UX stays point-and-scan like web live
- If continuous overlay is too invasive for shared food camera, acceptable fallback: ready-to-use `BarcodeScanner.scan()` when entering barcode mode or on shutter — document choice in PLAN
- Food mode must keep existing getUserMedia preview; stop native scanner when leaving barcode mode

### Scope
- Android only for now (no ios/ project yet); add iOS-ready plugin dependency is fine
- Do not change OFF lookup / BarcodeProductConfirm / save meal flow — only how the code string is obtained
- Wire AndroidManifest / Gradle / cap sync as required by plugin docs
- No new barcode UX features beyond native path

### Claude's Discretion
- Exact continuous vs RTU API choice if continuous conflicts with shared camera architecture
- Capacitor 8 compatible plugin version

</decisions>

<specifics>
## Specific Ideas

User confirmed dual-path after discussion: native plugin on APK, web path unchanged for localhost/PWA.

</specifics>

<canonical_refs>
## Canonical References

- `@capacitor-mlkit/barcode-scanning` (Capawesome /capacitor-mlkit)
- Existing: `src/features/scan-barcode/**`, `src/pages/scan/ui/ScanPage.tsx`
- Prior quick: `.planning/quick/260809-pwe-optimize-barcode-scanner-camera-lag-avoi/`

</canonical_refs>
