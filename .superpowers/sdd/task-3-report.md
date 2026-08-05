# Task 3 Report: Auth consent API + publicUser fields

**Status:** ✅ Complete  
**Branch:** feat/admin-users-data-consent  
**Date:** 2026-08-06

## Summary

Extended `publicUser` with `dataConsentAt` and `dataConsentVersion`. Added `POST /auth/consent` — accepts `{ version }`, validates against `DATA_CONSENT_VERSION`, sets consent once (idempotent on repeat).

## TDD Steps

| Step | Action | Result |
|------|--------|--------|
| 1 | Added `auth.consent.test.ts` (5 tests) | 5 failed (404 route / missing fields) |
| 2 | `vitest run auth.consent.test.ts` | FAIL ✓ |
| 3 | Extended `publicUser` + `POST /auth/consent` in `auth.ts` | — |
| 4 | Updated demo/telegram test mocks for consent fields | — |
| 5 | `vitest run auth.consent + demo + telegram` | 16/16 PASS ✓ |
| 6 | Commit | `feat(ai-app): POST /auth/consent and consent fields on user` |

## Changes

### `apps/ai-app/src/routes/auth.ts`

- Import `DATA_CONSENT_VERSION` from `../lib/consent.js`.
- `publicUser`: added `dataConsentAt` (ISO string | null), `dataConsentVersion` (string | null).
- `POST /auth/consent`: 401 without/invalid token; 400 wrong version; idempotent if `dataConsentAt` already set.

### Tests

- **New:** `auth.consent.test.ts` — 401, 400, set consent, idempotent, GET `/me` null fields.
- **Updated:** `auth.demo.test.ts`, `auth.telegram.test.ts` — mock users + assertions include consent null defaults.

## Test Summary

```
✓ auth.consent.test.ts (5)
✓ auth.demo.test.ts (3)
✓ auth.telegram.test.ts (8)
Total: 16 passed
```

## Commit

```
feat(ai-app): POST /auth/consent and consent fields on user
```

Files: `auth.ts`, `auth.consent.test.ts`, `auth.demo.test.ts`, `auth.telegram.test.ts`

## Concerns / Notes

- Consent timestamp uses `new Date()` at write time — not client-supplied; fine for audit.
- No Zod schema on consent body (brief uses direct `req.body?.version` check); consistent with brief snippet.
- Frontend (Task 4+) must call `POST /auth/consent` with `DATA_CONSENT_VERSION` before gated features.

## Next

Task 4 can consume `dataConsentAt` / `dataConsentVersion` from `/auth/me` and wire consent UI.
