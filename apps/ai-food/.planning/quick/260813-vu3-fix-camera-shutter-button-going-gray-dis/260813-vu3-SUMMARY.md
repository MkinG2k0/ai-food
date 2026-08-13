---
phase: 260813-vu3
plan: 01
subsystem: ui
tags: [camera, shutter, scan, canvas, capture]
requires: []
provides:
  - "isLivePreviewPainting gates canvas rAF while capturing"
  - "video.pause() on food/barcode shutter before encode/detect"
affects: [scan-camera]
actuals:
  tokens: 2500
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns: [freeze-preview-on-shutter]
key-files:
  created:
    - src/pages/scan/lib/isLivePreviewPainting.ts
    - src/pages/scan/lib/isLivePreviewPainting.test.ts
  modified:
    - src/pages/scan/ui/ScanPage.tsx
    - src/pages/scan/lib/captureVideoFrame.test.ts
key-decisions:
  - "Pause video in the same click turn, before toBlob — do not wait for React commit"
  - "Success food path still holds capturing/lock busy until navigate"
  - "Barcode finally always play() + setCapturing(false)"
requirements-completed: [QUICK-260813-vu3]
coverage:
  - id: D1
    description: Live preview freezes the instant the food shutter fires
    requirement: QUICK-260813-vu3
    verification:
      - kind: unit
        ref: src/pages/scan/lib/isLivePreviewPainting.test.ts#is false when capturing is true
        status: pass
    human_judgment: false
  - id: D2
    description: captureVideoFrame encodes a paused video when dimensions are set
    requirement: QUICK-260813-vu3
    verification:
      - kind: unit
        ref: src/pages/scan/lib/captureVideoFrame.test.ts#encodes a paused video when dimensions are set
        status: pass
    human_judgment: false
  - id: D3
    description: Barcode shutter pauses then resumes in finally
    requirement: QUICK-260813-vu3
    verification: []
    human_judgment: true
    rationale: ScanPage shutter wiring is not covered by RTL; verify on device
duration: 15min
completed: 2026-08-13
status: complete
---

# Quick 260813-vu3: freeze shutter preview

**Food/barcode shutter pauses live canvas preview in the same click turn as encode/detect, so a gray button no longer sits on a moving camera.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-13T19:55:18Z
- **Completed:** 2026-08-13T20:05:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- rAF paint loop gated by `isLivePreviewPainting` (stops while `capturing`)
- Food shutter: `video.pause()` then `setCapturing(true)` then `captureVideoFrame`; failure resumes `play()`
- Barcode shutter: pause before detect, `play()` in `finally`
- Paused-frame encode covered by unit test

## Task Commits

1. **Task 1: Freeze live preview the instant the food shutter fires** - `73294c1` (fix)
2. **Task 2: Cover paused-frame captureVideoFrame** - `f1c2115` (test)
3. **Task 2: Pause barcode shutter preview until detect finishes** - `52fa2a7` (fix)

## Files Created/Modified

- `src/pages/scan/lib/isLivePreviewPainting.ts` - paint only when live, no error, not capturing
- `src/pages/scan/lib/isLivePreviewPainting.test.ts` - three-flag matrix
- `src/pages/scan/ui/ScanPage.tsx` - pause/resume + rAF gate
- `src/pages/scan/lib/captureVideoFrame.test.ts` - paused video still encodes JPEG

## Decisions Made

Followed plan: freeze pixels synchronously with press; keep capture lock busy on food success; resume preview only on failure / barcode finally.

## Deviations from Plan

None - plan executed as written (task 2 split into test + barcode commits).

## Issues Encountered

Executor interrupted twice in the orchestrator; code commits landed before SUMMARY.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Scan shutter UX mismatch fixed. Manual check on Android: press food shutter → canvas freezes immediately while button is gray.

---
*Phase: 260813-vu3*
*Completed: 2026-08-13*
