### Task 3: Client billing API

**Files:**
- Modify: `apps/ai-food/src/features/billing/api/billingApi.ts`
- Modify: `apps/ai-food/src/features/billing/api/billingApi.test.ts`
- Modify: `apps/ai-food/src/features/billing/index.ts`

**Interfaces:**
- Consumes: `POST /billing/promo/validate`, extended subscribe response
- Produces:
  - `export type PromoValidateResult = { valid: true; code: string; discountPercent: number; originalAmount: number; finalAmount: number }`
  - `export async function validatePromo(promoCode: string): Promise<PromoValidateResult>`
  - `export async function subscribe(promoCode?: string): Promise<SubscribeResult>`
  - `SubscribeResult` extended with `amount`, `originalAmount`, `promoCode`

- [ ] **Step 1: Write the failing client tests**

Append / update in `apps/ai-food/src/features/billing/api/billingApi.test.ts`:

```ts
  it('validatePromo POSTs /billing/promo/validate', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        code: 'new80',
        discountPercent: 80,
        originalAmount: 10_000,
        finalAmount: 2_000,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { validatePromo } = await import('./billingApi');
    const result = await validatePromo('new80');
    expect(result.finalAmount).toBe(2_000);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/promo/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ promoCode: 'new80' }),
      }),
    );
  });

  it('subscribe sends promoCode when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentUrl: 'https://pay.example/x',
        paymentId: 'pay_1',
        amount: 5_000,
        originalAmount: 10_000,
        promoCode: 'new50',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { subscribe } = await import('./billingApi');
    const result = await subscribe('new50');
    expect(result.promoCode).toBe('new50');
    expect(result.amount).toBe(5_000);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ promoCode: 'new50' }),
      }),
    );
  });
```

Update the existing subscribe test expectation to allow the new response fields (assert at least `paymentUrl` / `paymentId`; if it uses `toEqual` on the full object, extend the mock JSON and expected object with `amount: 10_000`, `originalAmount: 10_000`, `promoCode: null`, and expect body `JSON.stringify({})` or empty object when no promo вЂ” see Step 3 for exact body shape).

- [ ] **Step 2: Run test вЂ” expect FAIL**

Run: `cd apps/ai-food && pnpm exec vitest run src/features/billing/api/billingApi.test.ts`

Expected: FAIL (`validatePromo` not exported)

- [ ] **Step 3: Implement client API**

In `billingApi.ts`, replace `SubscribeResult` and `subscribe`:

```ts
export type SubscribeResult = {
  paymentUrl: string;
  paymentId: string;
  amount: number;
  originalAmount: number;
  promoCode: string | null;
};

export type PromoValidateResult = {
  valid: true;
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
};

export async function validatePromo(
  promoCode: string,
): Promise<PromoValidateResult> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/promo/validate`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ promoCode }),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as PromoValidateResult;
}

export async function subscribe(promoCode?: string): Promise<SubscribeResult> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/billing/subscribe`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(promoCode ? { promoCode } : {}),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SubscribeResult;
}
```

In `index.ts`, re-export `validatePromo` and `PromoValidateResult`.

- [ ] **Step 4: Run tests вЂ” expect PASS**

Run: `cd apps/ai-food && pnpm exec vitest run src/features/billing/api/billingApi.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/billing/api/billingApi.ts apps/ai-food/src/features/billing/api/billingApi.test.ts apps/ai-food/src/features/billing/index.ts
git commit -m "$(cat <<'EOF'
feat(food): billing API for promo validate and discounted subscribe

EOF
)"
```

---
