### Task 2: Validate route + discounted subscribe

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `resolvePromo` from `../lib/promos.js`; `getSubscriptionPriceKopecks`; existing `requireUser` / `ApiError`
- Produces:
  - `POST /billing/promo/validate` в†’ `{ valid, code, discountPercent, originalAmount, finalAmount }`
  - `POST /billing/subscribe` body optional `{ promoCode?: string }`; response includes `amount`, `originalAmount`, `promoCode`

- [ ] **Step 1: Write the failing route tests**

In `apps/ai-app/src/routes/billing.test.ts`, keep existing mocks. Append:

```ts
  it('POST /billing/promo/validate returns discounted amounts for new80', async () => {
    mockPrice.mockReturnValue(10_000);
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: ' New80 ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      valid: true,
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('POST /billing/promo/validate rejects unknown code', async () => {
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PROMO');
  });

  it('POST /billing/subscribe with new50 stores discounted amount', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockPrice.mockReturnValue(10_000);
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'new50' });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(5_000);
    expect(res.body.originalAmount).toBe(10_000);
    expect(res.body.promoCode).toBe('new50');
    expect(paymentStore.get(res.body.paymentId)?.amount).toBe(5_000);
  });

  it('POST /billing/subscribe with bad promo does not create payment', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockPrice.mockReturnValue(10_000);
    const before = paymentStore.size;
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PROMO');
    expect(paymentStore.size).toBe(before);
  });
```

Also update the existing test that asserts exact subscribe body for real Init:

```ts
    expect(res.body).toEqual({
      paymentUrl: 'https://pay.tbank/1',
      paymentId: 'pay_1',
      amount: 10_000,
      originalAmount: 10_000,
      promoCode: null,
    });
```

Ensure `mockPrice.mockReturnValue(10_000)` is set in that test (and in mock-mode subscribe tests that assert amounts if added). For the existing mock subscribe test, optionally assert `promoCode: null` and `amount` equals `mockPrice()` return вЂ” if `beforeEach` already sets `mockPrice` to `10_000`, use that.

Check `beforeEach` in the file: if `mockPrice` is not defaulted, set `mockPrice.mockReturnValue(10_000)` in `beforeEach` or in each affected test.

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/billing.test.ts`

Expected: FAIL (`/billing/promo/validate` 404 and/or body missing `amount` / promo fields)

- [ ] **Step 3: Implement routes**

In `apps/ai-app/src/routes/billing.ts`:

1. Add import:

```ts
import { resolvePromo } from '../lib/promos.js';
```

2. Add helper near top (after `requireUser`):

```ts
function resolveSubscribeAmount(promoCodeRaw: unknown): {
  amount: number;
  originalAmount: number;
  promoCode: string | null;
} {
  const originalAmount = getSubscriptionPriceKopecks();
  if (promoCodeRaw == null || promoCodeRaw === '') {
    return { amount: originalAmount, originalAmount, promoCode: null };
  }
  if (typeof promoCodeRaw !== 'string') {
    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
  }
  const resolved = resolvePromo(promoCodeRaw, originalAmount);
  if (!resolved) {
    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
  }
  return {
    amount: resolved.finalAmount,
    originalAmount: resolved.originalAmount,
    promoCode: resolved.code,
  };
}
```

3. Add route **before** `/subscribe` (order among siblings does not matter for Express path match, but place near subscribe for readability):

```ts
billingRouter.post(
  '/promo/validate',
  asyncHandler(async (req, res) => {
    await requireUser(req);
    const originalAmount = getSubscriptionPriceKopecks();
    const raw = req.body?.promoCode;
    if (typeof raw !== 'string') {
      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
    }
    const resolved = resolvePromo(raw, originalAmount);
    if (!resolved) {
      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
    }
    res.json({
      valid: true,
      code: resolved.code,
      discountPercent: resolved.discountPercent,
      originalAmount: resolved.originalAmount,
      finalAmount: resolved.finalAmount,
    });
  }),
);
```

4. In `/subscribe` handler, replace `const amount = getSubscriptionPriceKopecks();` with:

```ts
    const { amount, originalAmount, promoCode } = resolveSubscribeAmount(
      req.body?.promoCode,
    );
```

5. Pass `amount` into `payment.create` and `initPayment` as today (already uses `amount` variable).

6. Change both JSON responses (mock + real) from:

```ts
res.json({ paymentUrl, paymentId: updated.id });
```

to:

```ts
res.json({
  paymentUrl,
  paymentId: updated.id,
  amount,
  originalAmount,
  promoCode,
});
```

(same fields for mock branch).

- [ ] **Step 4: Run tests вЂ” expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/billing.test.ts src/lib/promos.test.ts`

Expected: PASS (update any stale exact-body assertions if still failing)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): validate promo codes and charge discounted subscribe amount

EOF
)"
```

---
