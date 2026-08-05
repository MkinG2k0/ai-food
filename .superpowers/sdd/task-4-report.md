# Task 4 Report: POST /usage/event for manual/barcode

**Status:** ✅ Complete  
**Branch:** feat/admin-users-data-consent  
**Date:** 2026-08-06

## Summary

Added `POST /usage/event` on `usageRouter` — accepts `{ kind: 'manual' | 'barcode' }`, requires `X-Device-Id`, optional `X-User-Token`. Creates `UsageEvent` via `ensureDevice` + `prisma.usageEvent.create`; no quota deduction.

## TDD Steps

| Step | Action | Result |
|------|--------|--------|
| 1 | Added `usage.event.test.ts` (3 tests) | 3 failed (404 route) |
| 2 | `vitest run usage.event.test.ts` | FAIL ✓ |
| 3 | Implemented `POST /event` in `usage.ts` | — |
| 4 | `vitest run usage.event.test.ts` | 3/3 PASS ✓ |
| 5 | Commit | `feat(ai-app): POST /usage/event for manual and barcode` |

## Changes

### `apps/ai-app/src/routes/usage.ts`

- Import `z` from zod, `ensureDevice` from quota lib.
- `EventBodySchema`: `kind` enum `manual | barcode`.
- `POST /event`: 400 without device / invalid kind; 503 if DB unavailable; optional token → `userId`; `{ ok: true }` on success.

### Tests

- **New:** `usage.event.test.ts` — manual event, reject analyze, require device id.

## Test Summary

```
✓ usage.event.test.ts (3)
Total: 3 passed
```

## Commit

```
feat(ai-app): POST /usage/event for manual and barcode
```

Files: `usage.ts`, `usage.event.test.ts`

## Concerns / Notes

- Invalid `X-User-Token` silently ignored (per brief) — event logged as guest.
- DB required (503) unlike GET `/usage` degraded mode — consistent with write semantics.
- No test for barcode kind or authenticated userId path; brief only specified 3 cases.

## Next

Frontend can call `POST /usage/event` when user logs manual entry or scans barcode.
