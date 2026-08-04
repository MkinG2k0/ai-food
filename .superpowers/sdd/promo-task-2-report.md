# Task 2 Report: Validate route + discounted subscribe

## Status: COMPLETE

## TDD Evidence

### RED (Step 2)

Command:
```
pnpm exec vitest run src/routes/billing.test.ts
```

Result: **5 failed | 8 passed (13)**

| Test | Expected | Actual |
|------|----------|--------|
| POST /billing/subscribe real Init stores tbankPaymentId | body with amount/originalAmount/promoCode | missing fields |
| POST /billing/promo/validate returns discounted amounts for new80 | 200 | 404 |
| POST /billing/promo/validate rejects unknown code | 400 INVALID_PROMO | 404 |
| POST /billing/subscribe with new50 stores discounted amount | amount 5000 | undefined |
| POST /billing/subscribe with bad promo does not create payment | 400 INVALID_PROMO | 200 (payment created) |

### GREEN (Step 4)

Command:
```
pnpm exec vitest run src/routes/billing.test.ts src/lib/promos.test.ts
```

Result: **19 passed (19)** — billing 13/13, promos 6/6

## Changes

### `apps/ai-app/src/routes/billing.ts`

- Import `resolvePromo` from `../lib/promos.js`
- Add `resolveSubscribeAmount()` helper (validates promo, returns amount/originalAmount/promoCode)
- Add `POST /billing/promo/validate` — requires auth, returns `{ valid, code, discountPercent, originalAmount, finalAmount }`
- Extend `POST /billing/subscribe` — accepts optional `{ promoCode }`, stores discounted amount in Payment, response includes `amount`, `originalAmount`, `promoCode`
- Existing `GET /billing/price` unchanged

### `apps/ai-app/src/routes/billing.test.ts`

- Updated existing subscribe Init test body assertion (amount, originalAmount, promoCode: null)
- Added 4 new tests: validate new80, reject unknown, subscribe with new50, bad promo no payment

## Commit

```
feat(billing): validate promo codes and charge discounted subscribe amount
```

Only `billing.ts` and `billing.test.ts` staged.

## Concerns

None.
