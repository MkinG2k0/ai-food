# Task 3 Report: Models + embeddings routes

## Status: DONE

## TDD Evidence

### RED (Step 2)

```
npx vitest run src/app.test.ts

 × GET /v1/models returns 200 with data array — expected 404 to be 200
 × POST /v1/embeddings returns embeddings JSON — expected 404 to be 200
 × allows protected routes with valid Bearer token — expected 404 to be 200

 Test Files  1 failed (1)
      Tests  3 failed | 3 passed (6)
```

### GREEN (Step 6)

```
npx vitest run src/app.test.ts src/middleware src/routes/health.test.ts

 ✓ src/middleware/error.test.ts (2 tests)
 ✓ src/middleware/auth.test.ts (4 tests)
 ✓ src/routes/health.test.ts (2 tests)
 ✓ src/app.test.ts (6 tests)

 Test Files  4 passed (4)
      Tests  14 passed (14)
```

### Full suite

```
npm test — 20/20 pass (5 files)
```

## Files Changed

| File | Action |
|------|--------|
| `src/routes/models.ts` | Created — `modelsRouter` GET `/` → OpenRouter `models.list()` |
| `src/routes/embeddings.ts` | Created — `embeddingsRouter` POST `/` with Zod validation |
| `src/app.ts` | Modified — mount `/models` and `/embeddings` on `/v1` after `requireApiKey` |
| `src/app.test.ts` | Modified — added 4 models/embeddings/auth tests; 404 test uses `/v1/chat/completions` |

## Commit

```
f7a8994 feat: add models and embeddings Express routes
```

## Self-Review

### Requirements met

- **`modelsRouter`** — `GET /` returns `{ object: 'list', data: page.data }` via `runOpenAI`; upstream errors mapped through `mapOpenAIError` → `ApiError`.
- **`embeddingsRouter`** — `POST /` validates body with Zod (`model`, `input`, optional `dimensions`/`encoding_format`/`user`); proxies to `client.embeddings.create()`; 400 `VALIDATION_ERROR` on bad body.
- **`createApp`** — routes mounted on `/v1` after `requireApiKey`; JSON 404 catch-all preserved before `errorHandler`.
- **Tests** — existing 404 tests retained; `/v1/models` 404 assertion updated to `/v1/chat/completions`; auth 401/200 cases covered with OpenAI mock.
- **Scope** — no chat route; `api/` and legacy lib files untouched.

### Route flow

```
Request → CORS → JSON → /health | /v1 (requireApiKey) → /models | /embeddings → 404 catch-all → errorHandler
```

## Concerns

1. **`npm run type-check`** may still fail on legacy `lib/auth.ts` / `lib/request.ts` — expected until Task 5.
2. **`/v1/chat/completions`** returns 404 until Task 4 — intentional placeholder for unmatched-route test.

## Verification Commands Run

```bash
npx vitest run src/app.test.ts                    # RED (3 fail)
# implement routes + mount
npx vitest run src/app.test.ts src/middleware src/routes/health.test.ts  # GREEN (14 pass)
npm test                                          # 20/20 pass
git add src/routes/models.ts src/routes/embeddings.ts src/app.ts src/app.test.ts
git commit -m "feat: add models and embeddings Express routes"
```
