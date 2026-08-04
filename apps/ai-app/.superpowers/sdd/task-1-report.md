# Task 1 Report: Scaffold Express project + rewrite error helpers

## Status: DONE_WITH_CONCERNS

## TDD Evidence

### RED (Step 6)

```
npx vitest run src/middleware/error.test.ts

 FAIL  src/middleware/error.test.ts
Error: Failed to load url ./error.js (resolved id: ./error.js) in .../src/middleware/error.test.ts. Does the file exist?

 Test Files  1 failed (1)
      Tests  no tests
```

Module `./error.js` and rewritten `lib/errors.ts` did not exist yet — expected failure.

### GREEN (Step 9)

```
npx vitest run src/middleware/error.test.ts

 ✓ src/middleware/error.test.ts (2 tests) 20ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

### Full suite (pre-commit)

```
npm test

 ✓ lib/queue.test.ts (6 tests)
 ✓ src/middleware/error.test.ts (2 tests)

 Test Files  2 passed (2)
      Tests  8 passed (8)
```

`api/**/*.test.ts` no longer runs (vitest include narrowed to `src/**` and `lib/**`); `api/` directory left in place per brief.

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Modified — Express scripts/deps, removed vercel |
| `package-lock.json` | Modified — lockfile refresh |
| `tsconfig.json` | Modified — include `src`, `lib` only |
| `vitest.config.ts` | Modified — include `src/**/*.test.ts`, `lib/**/*.test.ts` |
| `lib/errors.ts` | Rewritten — `ApiError`, `sendApiError`, `mapOpenAIError` |
| `src/middleware/error.ts` | Created — `asyncHandler`, `errorHandler` |
| `src/middleware/error.test.ts` | Created — 2 integration tests via supertest |

## Commit

```
ba60d93 feat: scaffold Express and rewrite error helpers
```

## Self-Review

### Requirements met

- **Error body shape** — `{ message, code, status }` enforced via `sendApiError` and tested for `ApiError`; unknown errors return generic 500 without leaking internals.
- **ESM** — `"type": "module"`, imports use `.js` suffix in TS sources.
- **Dependencies** — kept `openai`, `zod`, `vitest`, `typescript`, `@types/node`; removed `vercel`; added `express`, `cors`, `tsx`, `@types/express`, `@types/cors`, `supertest`, `@types/supertest`.
- **Scripts** — `dev`/`start` use `tsx --env-file=.env` (Node 20+); no emit.
- **Scope** — no `src/server.ts`, no routes, `api/` not deleted.

### `errorHandler` behavior

- `ApiError` → status/code/message from instance.
- `entity.too.large` → 413 `PAYLOAD_TOO_LARGE`.
- JSON parse `SyntaxError` with `body` → 400 `VALIDATION_ERROR`.
- All other errors → 500 `UPSTREAM_ERROR` with safe message; logs to stderr.

### `mapOpenAIError`

Mapping preserved verbatim from prior implementation (429/504/400/500 cases).

## Concerns

1. **`npm run type-check` fails** — `lib/auth.ts` and `lib/request.ts` still import removed `apiErrorResponse`. Expected mid-migration; fix in later tasks when lib/api layers migrate to Express.
2. **`dev`/`start` scripts reference `src/server.ts`** — file does not exist yet (Task 2+). Scripts will fail until server scaffold lands.
3. **`api/` Vercel handlers** still import `apiErrorResponse` from `lib/errors.ts` — broken at runtime if deployed as-is; intentional until Task 5 cleanup.

## Verification Commands Run

```bash
npm uninstall vercel && npm install && npm install -D tsx @types/express @types/cors supertest @types/supertest && npm install express cors
npx vitest run src/middleware/error.test.ts   # RED then GREEN
npm test                                       # 8/8 pass
npm run type-check                             # 2 errors in lib/auth.ts, lib/request.ts (expected)
```
