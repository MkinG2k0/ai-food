# Task 4 Report: Admin promo CRUD API

## Status

DONE

## What was implemented

1. **`GET /admin/promos`** — Lists promo codes newest-first as `{ items }` with ISO `createdAt`.
2. **`POST /admin/promos`** — Normalizes codes, validates integer discounts from 1 to 99, creates promos, and maps Prisma `P2002` to `409 CONFLICT`.
3. **`DELETE /admin/promos/:id`** — Deletes a promo and returns `{ ok: true }`; maps Prisma `P2025` to `404 NOT_FOUND`.
4. **Admin route tests** — Added an in-memory promo Prisma mock and coverage for list, create, normalization, duplicate, validation, delete, missing record, and authentication.

## TDD evidence

- **RED:** `pnpm exec vitest run src/routes/admin.test.ts` — 5 failed, 19 passed; new CRUD requests returned 404 because routes were absent.
- **GREEN:** `pnpm exec vitest run src/routes/admin.test.ts` — 24/24 passed.
- **Lint:** Cursor diagnostics reported no errors in `admin.ts` or `admin.test.ts`.

## Commit

- `c3d71be` — `feat(ai-app): admin promo create list delete API`

## Self-review

- Implementation follows the exact route, response, validation, normalization, and Prisma error-mapping patterns from the brief.
- `requireAdminKey` remains router-wide and protects all three promo endpoints.
- Production and test changes are limited to `admin.ts` and `admin.test.ts`; unrelated existing workspace changes were not staged.

## Concerns

None.
# Task 4 Report: Sidebar nav entry «Платежи»

## Status
**COMPLETE**

## Commits
- `32ec891` — `feat(ai-web): add Платежи nav item to admin shell`

## Changes

### `apps/ai-web/src/components/AdminShell.tsx`
- Added `WalletOutlined` import from `@ant-design/icons`
- Inserted menu item `{ key: '/admin/payments', label: 'Платежи' }` between «Цены» and «Подписки»
- Added `'/admin/payments': 'Платежи'` to `pageTitles`

## Type-check Results
```
pnpm --filter ai-web type-check
✓ PASS (tsc --noEmit, exit 0)
```

## Self-Review

### Correctness
- Menu order and keys match brief
- `CreditCardOutlined` retained for «Подписки»
- Existing `selectedKey` logic handles `/admin/payments` via `pathname.startsWith`

### Scope
- AdminShell menu/titles only — no payments page route (Task 5)

### Concerns
None blocking. Clicking «Платежи» will 404 until Task 5 adds the page.
