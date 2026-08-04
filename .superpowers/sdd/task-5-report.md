# Task 5 Report: Telegram auth routes

## Status

Implemented the Telegram bot authentication routes and removed the Flash-Call route tests.

## Changes

- Rewrote `apps/ai-app/src/routes/auth.ts`.
  - Added `POST /auth/telegram/start`.
  - Added `GET /auth/telegram/status`.
  - Updated `GET /auth/me` to return Telegram profile and subscription fields.
  - Removed Flash-Call start and verification routes.
- Added `apps/ai-app/src/routes/auth.telegram.test.ts` with six route tests.
- Deleted `apps/ai-app/src/routes/auth.flashcall.test.ts`.

## TDD evidence

RED:

```text
pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
Test Files  1 failed (1)
Tests       6 failed (6)
```

The Telegram endpoints returned 404 and `/me` lacked Telegram profile fields.

GREEN:

```text
pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
Test Files  1 passed (1)
Tests       6 passed (6)
```

## Verification

```text
pnpm --dir apps/ai-app test
Test Files  16 passed (16)
Tests       76 passed (76)
```

IDE lint diagnostics for both changed auth files: none.

## Concern

`pnpm --dir apps/ai-app type-check` still exits with code 2 because of an unrelated pre-existing error:

```text
src/routes/billing.ts(296,41): error TS2367:
This comparison appears to be unintentional because the types
'"pending" | "rejected" | "refunded"' and '"confirmed"' have no overlap.
```

No TypeScript error was reported in either changed auth file.

## Important review finding fix

- Updated `GET /auth/telegram/status` to load the confirmed challenge's user
  before consuming the challenge.
- Database unavailability, query errors, and missing users now return HTTP 200
  `{ "status": "pending" }`, leaving the confirmed challenge available for retry.
- The challenge is consumed only after the user loads successfully; a consume
  race still returns `{ "status": "expired" }`.
- Added a regression test proving that a failed user query returns `pending`
  without calling `consumeLoginChallenge`.

RED:

```text
pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
Test Files  1 failed (1)
Tests       1 failed | 6 passed (7)
Expected { status: 'pending' }, received { status: 'expired' }
```

GREEN:

```text
pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
```

Full verification:

```text
pnpm --dir apps/ai-app test
Test Files  16 passed (16)
Tests       77 passed (77)
```

```text
pnpm --dir apps/ai-app type-check
Exit code 2: existing src/routes/billing.ts(296,41) TS2367 error.
No TypeScript error was reported in the changed auth files.
```
