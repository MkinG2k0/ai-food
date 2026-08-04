### Task 1: `GET /billing/price` (ai-app)

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `getSubscriptionPriceKopecks()`, `getSubscriptionDurationDays()` from `../lib/subscription.js`
- Produces: `GET /billing/price` → `{ amountKopecks: number, currency: 'RUB', durationDays: number }`

- [ ] **Step 1: Extend subscription mock + write failing tests**

In `billing.test.ts`, add mock for duration next to `mockPrice`:

```ts
const mockDuration = vi.fn();
```

In the `vi.mock('../lib/subscription.js'...)` return object, add:

```ts
getSubscriptionDurationDays: (...args: unknown[]) => mockDuration(...args),
```

In `beforeEach` (or at start of new tests), set defaults:

```ts
mockPrice.mockReturnValue(10_000);
mockDuration.mockReturnValue(365);
```

Append tests:

```ts
  it('GET /billing/price returns amount and duration without auth', async () => {
    mockPrice.mockReturnValue(10_000);
    mockDuration.mockReturnValue(365);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
  });

  it('GET /billing/price reflects env helpers', async () => {
    mockPrice.mockReturnValue(250_000);
    mockDuration.mockReturnValue(30);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body.amountKopecks).toBe(250_000);
    expect(res.body.durationDays).toBe(30);
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter openrouter-gateway test -- src/routes/billing.test.ts`

Expected: FAIL (404 NOT_FOUND or missing route for `/billing/price`).

- [ ] **Step 3: Implement route**

Near the top of route handlers in `billing.ts` (before auth-required routes is fine), import `getSubscriptionDurationDays` alongside existing price import, then add:

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

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway test -- src/routes/billing.test.ts`

Expected: PASS (including new price tests; existing subscribe tests still pass with `mockPrice`).

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "feat(ai-app): expose GET /billing/price for subscription tariff"
```
