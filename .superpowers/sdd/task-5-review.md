# Task 5 Review: Telegram auth routes (re-review)

**Scope:** `5a0bd1cdd0f6d68c3f98b9abc30886236dc235cc..f6fcdb4dabf107c349ee736d53495553238255cb`  
**Brief:** `.superpowers/sdd/task-5-brief.md`  
**Report:** `.superpowers/sdd/task-5-report.md`  
**Commits:** `fd7f73b` (routes) + `f6fcdb4` (consume-after-user-load fix)

## Verdict

- **Spec:** ✅
- **Quality:** **Approved**
- **Critical:** 0
- **Important:** 0
- **Minor:** 0

## Prior finding — resolved

**Issue:** `consumeLoginChallenge` ran before DB user load, permanently deleting the one-shot JWT on transient DB failure and breaking retries.

**Fix verified** in `apps/ai-app/src/routes/auth.ts`:

1. Confirmed challenge → load user via `requireDb()` + `findUnique` inside `try/catch`.
2. DB errors, `requireDb()` failures, and missing user → HTTP 200 `{ status: 'pending' }` without consuming.
3. `consumeLoginChallenge` runs only after user loads successfully; concurrent loser gets `{ status: 'expired' }`.

**Regression test present:** `keeps a confirmed challenge pending when the user query fails` in `auth.telegram.test.ts` asserts HTTP 200 `pending`, `findUnique` called, and `consumeLoginChallenge` **not** called.

## Spec compliance

- ✅ `POST /auth/telegram/start` → `{ challengeId, botDeepLink, expiresAt }`; nonce not exposed.
- ✅ Misconfigured Telegram bot → 503 `TELEGRAM_MISCONFIGURED`.
- ✅ `GET /auth/telegram/status` pending → `{ status: 'pending' }`.
- ✅ Confirmed challenge → `{ status: 'ok', token, user }` once, then `{ status: 'expired' }`.
- ✅ Unknown/missing `challengeId` → `{ status: 'expired' }`.
- ✅ Status polling always HTTP 200 with `pending | expired | ok` (including DB failure path).
- ✅ Challenge consumed only on successful user load + atomic consume.
- ✅ `GET /auth/me` → Telegram profile + subscription fields.
- ✅ Flash-Call routes and `auth.flashcall.test.ts` removed.

## Verification (re-run)

```text
pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)

pnpm --dir apps/ai-app test
Test Files  16 passed (16)
Tests       77 passed (77)
```

Diff scope matches task files: `auth.ts`, `auth.telegram.test.ts`, deleted `auth.flashcall.test.ts`.

## Decision

**Approved.** Prior Important finding is fixed; regression test covers the DB-failure path. No high-confidence issues remain.
