---
phase: 260809-pwe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/scan-barcode/ui/LiveBarcodeScan.tsx
  - src/features/scan-barcode/lib/detectBarcode.ts
  - src/features/scan-barcode/lib/detectBarcode.test.ts
autonomous: true
requirements:
  - QUICK-260809
must_haves:
  truths:
    - "В режиме Штрихкод превью камеры не подёргивается/не замирает каждые ~300–400 мс"
    - "Успешный live-скан по-прежнему вызывает onScan → lookup OFF → confirm (UX без регрессий)"
    - "Кнопка затвора в режиме barcode по-прежнему может распознать кадр (включая fallback)"
  artifacts:
    - path: src/features/scan-barcode/ui/LiveBarcodeScan.tsx
      provides: "rAF/idle decode loop without fixed-delay timer cadence"
    - path: src/features/scan-barcode/lib/detectBarcode.ts
      provides: "cached detector + live path that never does JPEG+scanFile every tick"
  key_links:
    - from: LiveBarcodeScan tick
      to: detectBarcodeInVideo(..., live)
      via: "busy gate + schedule-after-complete"
    - from: ScanPage shutter barcode
      to: detectBarcodeInVideo (capture/full)
      via: "handleShutter still uses full detect including file fallback"
---

<objective>
Убрать периодические подвисания камеры при live-скане штрихкода.

Purpose: Сейчас decode крутится на фиксированной задержке (~350 мс), а fallback путь рисует full-res canvas → JPEG → Html5Qrcode.scanFile на главном потоке — это совпадает с жалобой «лагает по интервалу».

Output: Плавный preview + тот же успешный scan UX (live onScan + shutter fallback).
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/features/scan-barcode/ui/LiveBarcodeScan.tsx
@src/features/scan-barcode/lib/detectBarcode.ts
@src/pages/scan/ui/ScanPage.tsx

## Root cause (confirmed in code)

1. `LiveBarcodeScan` рекурсивно планирует `tick` через fixed-delay ~350 мс (после старта ~400 мс).
2. `detectBarcodeInVideo` при отсутствии/сбое `BarcodeDetector` каждый tick вызывает `detectBarcodeInVideoViaFile`: новый canvas на полный `videoWidth×videoHeight`, `toBlob('image/jpeg')`, затем `Html5Qrcode.scanFile` — тяжёлая работа на UI thread.
3. `getBarcodeDetector()` создаёт новый detector на каждый вызов (лишняя стоимость на hot path).

## Constraints

- Не трогать OFF lookup / confirm / save meal / ScanPage layout.
- Не добавлять новые barcode UX-фичи.
- Shutter в barcode mode должен сохранить полный detect (включая file fallback).
- Новых npm-зависимостей не добавлять.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: rAF live loop without fixed-delay cadence</name>
  <files>src/features/scan-barcode/ui/LiveBarcodeScan.tsx</files>
  <behavior>
    - While active=true, decode attempts are scheduled via requestAnimationFrame (and/or requestIdleCallback if available), not a recursive fixed-delay timer chain.
    - While busyRef is true, no second detect starts (existing gate kept).
    - Next attempt is scheduled only after the previous detect settles (finally), optionally with a short min gap ≤200ms as backoff — never fire-and-forget every 350ms independent of decode duration.
    - On active=false / unmount: cancel pending rAF/idle handles; clear lastCodeRef (same as today).
    - onScan still fires only for new codes length ≥ 8.
  </behavior>
  <action>
    Rewrite the effect in LiveBarcodeScan per the behaviors above. Keep headless component (returns null), videoRef + onScanRef pattern, and busyRef. Do not change ScanPage props contract. Prefer chaining: start → detect → finally → scheduleNext(rAF), so camera paint frames are not contending with a timer that keeps queuing work. Avoid leaving any recursive fixed-delay timer API usage in this file (use rAF/idle cancel IDs in cleanup).
  </action>
  <verify>
    <automated>cd apps/ai-food; rg -n "setTimeout|setInterval" src/features/scan-barcode/ui/LiveBarcodeScan.tsx; test $(rg -c "setTimeout|setInterval" src/features/scan-barcode/ui/LiveBarcodeScan.tsx || echo 0) -eq 0; rg -n "requestAnimationFrame" src/features/scan-barcode/ui/LiveBarcodeScan.tsx</automated>
  </verify>
  <done>
    LiveBarcodeScan has zero fixed-delay timer scheduling; uses rAF (and optionally idle); cleanup cancels pending frames; scan gating unchanged.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Live-safe detect path (no JPEG/scanFile hot path)</name>
  <files>src/features/scan-barcode/lib/detectBarcode.ts, src/features/scan-barcode/lib/detectBarcode.test.ts</files>
  <behavior>
    - Cache a single BarcodeDetector instance (lazy); reuse across calls; reset helper may clear it for tests.
    - Add an options flag (e.g. `{ mode: 'live' | 'capture' }` default `'capture'`) on detectBarcodeInVideo.
    - mode 'live': try cached detector on the video element; if unavailable/empty, optional downscaled reused canvas (max side ≤720) + detector.detect(canvas) only — never create JPEG blob and never call Html5Qrcode.scanFile on the live path.
    - mode 'capture' (default): keep current full behavior including file/scanFile fallback for shutter.
    - LiveBarcodeScan calls detect with mode 'live'. ScanPage handleShutter keeps default/capture.
    - Unit tests: extractBarcodeValue unchanged; add tests covering that live mode does not invoke file-scanner path (mock/spy or exported path flag); detector cache reset still works with existing resetBarcodeFileScannerForTests (extend reset if needed).
  </behavior>
  <action>
    Implement cached detector + mode-gated live path as above. Reuse one offscreen canvas for downscale draws (do not allocate a new canvas every live tick). Keep detectBarcodeInFile API for gallery/file flows unchanged. Wire LiveBarcodeScan to pass live mode. Do not change Open Food Facts fetch or confirm UI.
  </action>
  <verify>
    <automated>cd apps/ai-food; pnpm exec vitest run src/features/scan-barcode/lib/detectBarcode.test.ts; pnpm exec tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <done>
    Live path cannot hit JPEG+scanFile; capture/shutter still can; tests pass; typecheck clean for touched modules.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Camera frame → decode | Untrusted pixel data stays on-device; no new network from this change |
| Client → Open Food Facts | Unchanged (post-scan lookup only) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260809-01 | Denial of service | LiveBarcodeScan loop | low | mitigate | busy gate + schedule-after-complete prevents decode pile-up |
| T-260809-02 | Tampering | detectBarcode result | low | accept | Same validation (length ≥ 8, normalize) as today; no new trust |
| T-260809-SC | Tampering | npm installs | low | accept | No new packages in this plan |
</threat_model>

<verification>
1. `rg` shows no fixed-delay timer APIs in LiveBarcodeScan; rAF present.
2. Vitest detectBarcode tests pass.
3. Manual (optional smoke): `/scan?mode=barcode` — preview stays smooth for 10+ seconds; scan a real EAN still opens product confirm; shutter still finds code when aimed.
</verification>

<success_criteria>
- Periodic camera freezes from interval decode are gone.
- Live scan + shutter barcode UX intact.
- No unrelated barcode feature churn.
</success_criteria>

<output>
Create `.planning/quick/260809-pwe-optimize-barcode-scanner-camera-lag-avoi/260809-pwe-SUMMARY.md` when done
</output>
