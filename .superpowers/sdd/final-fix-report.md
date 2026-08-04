# Final whole-branch review fix

## Change

- `POST /auth/telegram/start` now verifies Telegram configuration, database availability, and `AUTH_SECRET` before creating a login challenge.
- JWT secret validation is exposed as `assertAuthConfigured()` and continues to enforce a trimmed secret of at least 32 characters with `500/AUTH_MISCONFIGURED`.
- Added a regression test proving an unavailable database returns `503/DATABASE_UNAVAILABLE` without calling `createLoginChallenge`.

## Verification

- RED: `pnpm test -- src/routes/auth.telegram.test.ts` — 1 failed, 7 passed; the new database-unavailable test received 200 instead of 503.
- GREEN: `pnpm test -- src/routes/auth.telegram.test.ts` — 8 passed.
- Full suite: `pnpm test` — 15 files passed, 79 tests passed.
- Type check: `pnpm type-check` — passed.
