# Task 2 Report: Auth middleware + app shell + health

## Status: DONE_WITH_CONCERNS

## TDD Evidence

### RED (Step 2)

```
npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts

 FAIL  src/middleware/auth.test.ts — Failed to load url ./auth.js
 FAIL  src/routes/health.test.ts — Failed to load url ../app.js

 Test Files  2 failed (2)
      Tests  no tests
```

### GREEN (Step 7)

```
npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts src/middleware/error.test.ts

 ✓ src/middleware/error.test.ts (2 tests)
 ✓ src/middleware/auth.test.ts (4 tests)
 ✓ src/routes/health.test.ts (1 test)

 Test Files  3 passed (3)
      Tests  7 passed (7)
```

### Full suite

```
npm test — 13/13 pass (4 files)
```

## Files Changed

| File | Action |
|------|--------|
| `src/middleware/auth.ts` | Created — `requireApiKey` middleware |
| `src/middleware/auth.test.ts` | Created — 4 auth tests |
| `src/routes/health.ts` | Created — `healthRouter` at `/` |
| `src/routes/health.test.ts` | Created — health integration test |
| `src/app.ts` | Created — `createApp()` with CORS, JSON, `/health`, empty `/v1` + auth |
| `src/server.ts` | Created — listen on PORT (default 3000) |

## Commit

```
4d23498 feat: add Express app shell, auth, and health
```

## Self-Review

### Requirements met

- **`requireApiKey`** — skips when `API_KEY` unset; validates `Authorization: Bearer` and `X-API-Key`; 401 `UNAUTHORIZED` on mismatch.
- **`createApp`** — CORS `origin: *`, methods GET/POST/OPTIONS, allowed headers Content-Type/Authorization/X-API-Key; JSON 10mb; `/health` unauthenticated; empty `/v1` router with `requireApiKey`; `errorHandler` last.
- **`healthRouter`** — `GET /health` → `{ status: 'ok' }`.
- **`server.ts`** — logs startup message with port.
- **Scope** — no models/chat/embeddings routes; `api/` and legacy `lib/auth.ts` untouched.

### Auth flow

```
Request → CORS → JSON parser → /health (no auth) | /v1 (requireApiKey) → errorHandler
```

## Concerns

1. **`npm run type-check` fails** on legacy `lib/auth.ts` and `lib/request.ts` (missing `apiErrorResponse`) — expected until Task 5.
2. **`/v1/*` returns 404** until Task 3 mounts routes — auth middleware is wired but no handlers yet.

## Verification Commands Run

```bash
npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts   # RED
# implement
npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts src/middleware/error.test.ts  # GREEN 7/7
npm test                                                                 # 13/13 pass
npm run type-check                                                       # 2 legacy lib errors (expected)
```

## Review Fix (91435db)

**Finding:** Unknown routes and unmatched `/v1/*` returned Express HTML 404 instead of gateway JSON.

**Changes:**
- `src/app.ts` — catch-all middleware before `errorHandler` throws `ApiError(404, 'NOT_FOUND', 'Route not found.')`
- `src/app.test.ts` — tests for `GET /no-such-route` and `GET /v1/models` JSON 404 shape
- `src/routes/health.test.ts` — asserts `/health` returns 200 when `API_KEY` is set (no auth header)

**Commit:** `91435db fix: return JSON 404 via gateway error shape`

**Tests:**
```
npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts src/middleware/error.test.ts src/app.test.ts
# 4 files, 10 passed

npm test
# 5 files, 16 passed
```
