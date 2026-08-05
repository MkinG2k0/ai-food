# Task 1 Report: Gateway GET /admin/payments

## Status: DONE

## Summary

Implemented `GET /admin/payments` on the Express admin router in `apps/ai-app`, returning `{ payments: PaymentListItem[] }` with payment fields and nested user profile data. Extended test mocks and added two focused tests (happy path + auth rejection).

## Commits

| SHA | Subject |
|-----|---------|
| `9165d04` | feat(ai-app): add admin GET /payments list |

## TDD Flow

### Step 1 — Failing tests

Extended `admin.test.ts`:

- Added `MockPayment` type and in-memory `payments` store
- Replaced `payment` mock with `findMany`, `findUnique`, `delete` (for future DELETE task), kept `aggregate`
- Added `$transaction` mock passthrough
- Initialized two seed payments in `beforeEach` (confirmed older, pending newer)
- Added tests:
  - `GET /admin/payments returns payments with user fields` — expects 200, 2 items, desc order (`pay-pending` first), user nested object
  - `GET /admin/payments rejects requests without admin key` — expects 401

### Step 2 — Confirm FAIL

```
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Result: **1 failed** — `GET /admin/payments returns payments with user fields` returned **404** (route missing). Other 12 tests passed.

### Step 3 — Implementation

In `admin.ts`:

- Added `paymentResponse()` helper mapping payment + user fields to API shape
- Added `adminRouter.get('/payments', ...)` after `/stats`:
  - Uses `requireDb()` (consistent with other DB-backed admin routes)
  - `prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: ... } } })`
  - Returns `{ payments: payments.map(paymentResponse) }`
- Protected by existing `adminRouter.use(requireAdminKey)` — no extra auth wiring needed

### Step 4 — Confirm PASS

```
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Result: **13 passed** (all existing + 2 new).

## Files Changed

| File | Change |
|------|--------|
| `apps/ai-app/src/routes/admin.ts` | `paymentResponse` helper + `GET /payments` route |
| `apps/ai-app/src/routes/admin.test.ts` | Extended mock prisma, seed data, 2 new tests |

## API Contract

**Request:** `GET /admin/payments` with header `X-Admin-Key: <ADMIN_API_KEY>`

**Response 200:**
```json
{
  "payments": [
    {
      "id": "string",
      "amount": 90000,
      "status": "pending | confirmed | rejected | refunded",
      "paidAt": "ISO8601 | null",
      "createdAt": "ISO8601",
      "tbankPaymentId": "string | null",
      "tbankOrderId": "string",
      "user": {
        "id": "string",
        "telegramId": "string",
        "username": "string | null",
        "firstName": "string | null",
        "lastName": "string | null"
      }
    }
  ]
}
```

**Response 401:** Missing/invalid admin key (via `requireAdminKey` middleware).

## Self-Review

### Correctness
- Route path `/payments` mounts under admin router → full path `/admin/payments` ✓
- Sort order `createdAt desc` matches test expectation (`pay-pending` newer than `pay-confirmed`) ✓
- `take: 50` limit as specified ✓
- User fields match brief exactly ✓

### Consistency
- Follows existing patterns: `requireDb()`, `asyncHandler`, response helper function, same user select fields as would be needed for admin UI ✓
- Mock `$transaction` and `payment.delete` added per brief (prep for Task 2 DELETE) without implementing DELETE route ✓

### Security
- Inherits `requireAdminKey` from router-level middleware ✓
- No secrets exposed; only admin-selected user fields ✓

### Test Coverage
- Happy path with user join and sort order ✓
- Auth rejection (401) ✓
- Existing admin tests unaffected (13/13 pass) ✓

### Concerns
- None blocking. Dates serialize to ISO strings in JSON responses (supertest/json behavior); tests compare nested `user` object only, not date fields — consistent with other admin route tests.

## Out of Scope (not implemented)

- DELETE /admin/payments
- BFF proxy
- Admin UI

## Test Command

```powershell
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

**Result:** 13 tests passed.
