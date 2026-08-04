# Task 1 Report: JWT — `phone` → `telegramId`

**Status:** DONE  
**Branch:** `feat/telegram-bot-auth`  
**Commit:** `f8b7a60` — `refactor(ai-app): JWT claims use telegramId instead of phone`

## Summary

JWT user token payload and claims migrated from `phone` to `telegramId` per the telegram-bot-auth plan. Only JWT module and related test mocks were changed; Flash-Call routes and Prisma were left untouched as instructed.

## TDD Steps Executed

### Step 1 — Update failing expectations in `jwt.test.ts`

- Renamed test `round-trips sub and phone` → `round-trips sub and telegramId`
- Payload changed from `{ sub: 'user_1', phone: '+79991234567' }` to `{ sub: 'user_1', telegramId: '42' }`
- Updated `does not set exp claim` test to use `telegramId: '42'`

### Step 2 — Run test, expect FAIL

```
pnpm exec vitest run src/lib/jwt.test.ts
```

**Result:** FAIL (1 failed, 2 passed)

- `round-trips sub and telegramId` failed with `ApiError: Invalid or expired user token.` — implementation still signed/verified `phone` claim while test expected `telegramId`.

### Step 3 — Implement JWT

Replaced `apps/ai-app/src/lib/jwt.ts`:

- `UserTokenPayload`: `{ sub: string; telegramId: string }`
- `signUserToken`: signs `{ telegramId: payload.telegramId }` in JWT body
- `verifyUserToken`: extracts and validates `telegramId` as string claim

### Step 4 — Fix test mocks

| File | Change |
|------|--------|
| `quota.test.ts` (2 mocks) | `{ sub: 'u1', phone: '+79991234567' }` → `{ sub: 'u1', telegramId: '42' }` |
| `billing.test.ts` (1 mock) | `{ sub: 'user-1', phone: '+79991234567' }` → `{ sub: 'user-1', telegramId: '42' }` |

### Step 5 — Run tests, expect PASS

```
pnpm exec vitest run src/lib/jwt.test.ts src/middleware/quota.test.ts src/routes/billing.test.ts
```

**Result:** PASS — 3 files, 15 tests, all green.

### Step 6 — Commit

```
git add apps/ai-app/src/lib/jwt.ts apps/ai-app/src/lib/jwt.test.ts apps/ai-app/src/middleware/quota.test.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "refactor(ai-app): JWT claims use telegramId instead of phone"
```

## Files Changed

| File | Lines changed |
|------|---------------|
| `apps/ai-app/src/lib/jwt.ts` | Type + sign/verify logic |
| `apps/ai-app/src/lib/jwt.test.ts` | Test expectations |
| `apps/ai-app/src/middleware/quota.test.ts` | Mock payloads (×2) |
| `apps/ai-app/src/routes/billing.test.ts` | Mock payload (×1) |

## Self-Review

### Scope compliance

- ✅ Only JWT claims and related test mocks modified
- ✅ `auth.ts` still uses `phone` — intentionally untouched
- ✅ Prisma schema untouched
- ✅ Flash-Call routes untouched
- ✅ Did not run `auth.flashcall.test.ts` suite

### Known follow-ups (expected, not blockers)

1. **`auth.ts`** — `signUserToken({ sub, phone })` will fail type-check once full app is type-checked; addressed in later tasks.
2. **`auth.flashcall.test.ts`** — still expects `phone` in `signUserToken` call; will fail until Flash-Call routes are replaced/updated in later tasks.
3. **No `exp` claim** — preserved existing behavior (test `does not set exp claim` still passes).

### Code quality

- Implementation matches plan verbatim
- Error handling unchanged (`AUTH_MISCONFIGURED`, `INVALID_USER_TOKEN`)
- No stray `phone` references in modified JWT files

## Test Summary

| Suite | Tests | Result |
|-------|-------|--------|
| `jwt.test.ts` | 3 | PASS |
| `quota.test.ts` | 5 | PASS |
| `billing.test.ts` | 7 | PASS |
| **Total** | **15** | **PASS** |

## Concerns

None for this task scope. Type errors in `auth.ts` and flashcall tests are expected until subsequent tasks.
