# Task 9 — End-to-end verification report

Date: 2026-08-05
Branch/starting HEAD: `feat/admin-web` / `6428e77`

## Environment and database

- [x] `ADMIN_API_KEY` is present and matches in `apps/ai-app/.env` and `apps/ai-web/.env`.
- [x] No `.env` file was committed or printed.
- [x] `pnpm exec prisma migrate deploy` completed successfully.
- [x] Migration `20260804220000_app_settings` was applied; Prisma reported all migrations applied.

## Automated verification

- [x] Gateway targeted Vitest suite: 4 files passed, 35 tests passed.
  - `src/lib/subscription.test.ts`: 7 passed
  - `src/middleware/adminAuth.test.ts`: 3 passed
  - `src/routes/admin.test.ts`: 11 passed
  - `src/routes/billing.test.ts`: 14 passed
- [x] `pnpm --filter ai-web type-check`: passed with exit code 0.

## E2E matrix

- [x] `GET http://127.0.0.1:3000/admin/stats` without admin key returned `401`.
- [x] `GET http://127.0.0.1:3000/billing/price` returned a valid price payload.
- [x] `GET http://127.0.0.1:3001/` returned `200` and contained `Скоро`.
- [x] Logged-out `GET /admin/pricing` returned `307` redirecting to `/admin/login`.
- [x] `POST /api/admin/login` with the configured admin password returned `200` and issued an `admin_session` cookie.
- [x] Authenticated `GET /admin` returned `200`.
- [x] Authenticated Admin BFF `GET /api/admin/gateway/stats` returned a valid stats payload.
- [x] Authenticated Admin BFF pricing `PUT` succeeded.
- [x] Gateway `GET /billing/price` reflected the changed value without a gateway restart.
- [x] The original price and duration were restored and verified through `GET /billing/price`.
- [x] User search plus subscription activate, extend, and revoke all updated the expected fields.
- [x] User lifecycle checks used a disposable user, which was deleted after verification.

## Findings

- No application bugs were found.
- No fix commit was created (empty commit skipped).
- A direct `node` invocation of the temporary E2E harness could not load the generated TypeScript Prisma client; rerunning the same harness through the repository's `tsx` loader passed. This was a harness invocation issue, not an application failure.
