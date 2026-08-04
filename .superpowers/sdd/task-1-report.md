# Task 1 Report: GET /billing/price (ai-app)

## Status

**DONE**

## Summary

Added public `GET /billing/price` endpoint to `billingRouter` that returns subscription tariff from existing env helpers — no auth, no DB.

Response shape:

```json
{
  "amountKopecks": number,
  "currency": "RUB",
  "durationDays": number
}
```

## Files Changed

| File | Change |
|------|--------|
| `apps/ai-app/src/routes/billing.ts` | Added `GET /price` route; imported `getSubscriptionDurationDays` |
| `apps/ai-app/src/routes/billing.test.ts` | Added `mockDuration`, two new tests, updated `beforeEach` defaults |

## TDD Evidence

### RED (Step 2)

Command:

```bash
pnpm --filter openrouter-gateway test -- src/routes/billing.test.ts
```

Result: **FAIL** — 2 failed, 7 passed

```
× GET /billing/price returns amount and duration without auth
  → expected 404 to be 200
× GET /billing/price reflects env helpers
  → expected 404 to be 200
```

Existing subscribe/notification/status tests continued to pass (7/7).

### GREEN (Step 4)

Same command after implementing route in `billing.ts`.

Result: **PASS** — 9/9 tests

```
✓ src/routes/billing.test.ts (9 tests) 47ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

## Implementation Details

Route placed at top of `billingRouter` (before auth-required `/subscribe`), per plan:

```ts
billingRouter.get(
  '/price',
  asyncHandler(async (_req, res) => {
    res.json({
      amountKopecks: getSubscriptionPriceKopecks(),
      currency: 'RUB',
      durationDays: getSubscriptionDurationDays(),
    });
  }),
);
```

Mounted at `/billing/price` via existing `createApp()` wiring.

## Self-Review

| Check | Result |
|-------|--------|
| Matches plan verbatim | ✓ Route, imports, test mocks/tests match brief |
| No auth required | ✓ No `requireUser`, no headers in tests |
| No DB access | ✓ Route only calls subscription helpers |
| Existing tests unaffected | ✓ 7 original tests still pass |
| Linter | ✓ No errors on changed files |
| Scope | ✓ Only 2 files committed |

### Note on `beforeEach` default

`mockPrice` default changed from `199000` to `10_000` per brief. Existing subscribe tests do not assert on price amount from mock; notification test hardcodes `amount: 199000` in fixture data. No regressions observed.

## Commit

```
2580e63 feat(ai-app): expose GET /billing/price for subscription tariff
```

Only `billing.ts` and `billing.test.ts` staged — unrelated dirty files left unstaged.

## Concerns

None.
