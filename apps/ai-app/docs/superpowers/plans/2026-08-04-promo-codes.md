# Promo Codes on Subscribe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users enter `new80` / `new50` on `/subscribe`, preview the discounted price, and pay the reduced amount via existing T-Bank / mock billing.

**Architecture:** Hardcoded promo catalog in `ai-app`. `POST /billing/promo/validate` returns discounted amounts. `POST /billing/subscribe` accepts optional `promoCode` and charges `finalAmount`. `ai-food` SubscribePage: field + Apply + price preview.

**Tech Stack:** Express, Vitest + supertest, React + Vite (`ai-food`), existing `ApiError` / billing API patterns.

**Spec:** `apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md`

## Global Constraints

- Catalog in code only: `new80` → 80%, `new50` → 50% (no Prisma / DB).
- No redemption limits.
- Normalize: `trim` + lowercase before lookup.
- `finalAmount = max(1, floor(original * (100 - discountPercent) / 100))` kopecks.
- Empty / unknown promo → `400 INVALID_PROMO`; subscribe must not create a `Payment`.
- Missing `promoCode` → full `getSubscriptionPriceKopecks()` (unchanged).
- Client never invents the paid amount; gateway is source of truth.
- No new env vars.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/lib/promos.ts` | Catalog + resolve + amount helpers |
| `apps/ai-app/src/lib/promos.test.ts` | Unit tests for promo math / normalize |
| `apps/ai-app/src/routes/billing.ts` | `/promo/validate` + subscribe `promoCode` |
| `apps/ai-app/src/routes/billing.test.ts` | Route tests for validate + discounted subscribe |
| `apps/ai-food/src/features/billing/api/billingApi.ts` | `validatePromo`, `subscribe(promoCode?)` |
| `apps/ai-food/src/features/billing/api/billingApi.test.ts` | Client API tests |
| `apps/ai-food/src/features/billing/index.ts` | Re-exports |
| `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx` | Promo UI |

---

### Task 1: Promo catalog helpers

**Files:**
- Create: `apps/ai-app/src/lib/promos.ts`
- Create: `apps/ai-app/src/lib/promos.test.ts`

**Interfaces:**
- Consumes: none (pure helpers; price comes from caller)
- Produces:
  - `export type PromoDefinition = { code: string; discountPercent: number }`
  - `export type ResolvedPromo = { code: string; discountPercent: number; originalAmount: number; finalAmount: number }`
  - `export function normalizePromoCode(raw: string): string`
  - `export function lookupPromo(raw: string): PromoDefinition | null`
  - `export function applyPromoDiscount(originalAmount: number, discountPercent: number): number`
  - `export function resolvePromo(raw: string, originalAmount: number): ResolvedPromo | null`

- [ ] **Step 1: Write the failing tests**

Create `apps/ai-app/src/lib/promos.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  normalizePromoCode,
  lookupPromo,
  applyPromoDiscount,
  resolvePromo,
} from './promos.js';

describe('promos', () => {
  it('normalizePromoCode trims and lowercases', () => {
    expect(normalizePromoCode(' New80 ')).toBe('new80');
  });

  it('lookupPromo finds new80 and new50', () => {
    expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
    expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
  });

  it('lookupPromo returns null for unknown', () => {
    expect(lookupPromo('nope')).toBeNull();
    expect(lookupPromo('')).toBeNull();
    expect(lookupPromo('   ')).toBeNull();
  });

  it('applyPromoDiscount floors and clamps to min 1', () => {
    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
    expect(applyPromoDiscount(1, 80)).toBe(1);
    expect(applyPromoDiscount(3, 80)).toBe(1);
  });

  it('resolvePromo returns amounts for valid code', () => {
    expect(resolvePromo(' new80 ', 10_000)).toEqual({
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('resolvePromo returns null for invalid', () => {
    expect(resolvePromo('x', 10_000)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts`

Expected: FAIL (module `./promos.js` not found)

- [ ] **Step 3: Implement `promos.ts`**

Create `apps/ai-app/src/lib/promos.ts`:

```ts
export type PromoDefinition = {
  code: string;
  discountPercent: number;
};

export type ResolvedPromo = {
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
};

const PROMOS: Record<string, PromoDefinition> = {
  new80: { code: 'new80', discountPercent: 80 },
  new50: { code: 'new50', discountPercent: 50 },
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function lookupPromo(raw: string): PromoDefinition | null {
  const key = normalizePromoCode(raw);
  if (!key) return null;
  return PROMOS[key] ?? null;
}

/** finalAmount in kopecks; never below 1. */
export function applyPromoDiscount(
  originalAmount: number,
  discountPercent: number,
): number {
  const discounted = Math.floor(
    (originalAmount * (100 - discountPercent)) / 100,
  );
  return Math.max(1, discounted);
}

export function resolvePromo(
  raw: string,
  originalAmount: number,
): ResolvedPromo | null {
  const promo = lookupPromo(raw);
  if (!promo) return null;
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/promos.ts apps/ai-app/src/lib/promos.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): add in-code promo catalog helpers

EOF
)"
```

---

### Task 2: Validate route + discounted subscribe

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `resolvePromo` from `../lib/promos.js`; `getSubscriptionPriceKopecks`; existing `requireUser` / `ApiError`
- Produces:
  - `POST /billing/promo/validate` → `{ valid, code, discountPercent, originalAmount, finalAmount }`
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

Ensure `mockPrice.mockReturnValue(10_000)` is set in that test (and in mock-mode subscribe tests that assert amounts if added). For the existing mock subscribe test, optionally assert `promoCode: null` and `amount` equals `mockPrice()` return — if `beforeEach` already sets `mockPrice` to `10_000`, use that.

Check `beforeEach` in the file: if `mockPrice` is not defaulted, set `mockPrice.mockReturnValue(10_000)` in `beforeEach` or in each affected test.

- [ ] **Step 2: Run tests — expect FAIL**

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

- [ ] **Step 4: Run tests — expect PASS**

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

Update the existing subscribe test expectation to allow the new response fields (assert at least `paymentUrl` / `paymentId`; if it uses `toEqual` on the full object, extend the mock JSON and expected object with `amount: 10_000`, `originalAmount: 10_000`, `promoCode: null`, and expect body `JSON.stringify({})` or empty object when no promo — see Step 3 for exact body shape).

- [ ] **Step 2: Run test — expect FAIL**

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

- [ ] **Step 4: Run tests — expect PASS**

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

### Task 4: Subscribe page promo UI

**Files:**
- Modify: `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx`

**Interfaces:**
- Consumes: `validatePromo`, `subscribe(promoCode?)` from `@/features/billing`
- Produces: UI state for draft code, applied promo, price display

- [ ] **Step 1: Update imports and state on the main (non-success/fail) path**

In `SubscribePage.tsx`:

1. Import `validatePromo` alongside `subscribe`.
2. Add state (only needed on the pay form; keep success/fail branches unchanged):

```ts
  const [promoInput, setPromoInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{
    code: string;
    discountPercent: number;
    originalAmount: number;
    finalAmount: number;
  } | null>(null);
```

3. Keep `PRICE_RUB = 100` as fallback display before apply. After apply, display from `applied` (kopecks → rubles: `amount / 100`).

- [ ] **Step 2: Wire Apply + Pay handlers**

```ts
  function clearAppliedIfEdited(next: string) {
    setPromoInput(next);
    if (applied && next.trim().toLowerCase() !== applied.code) {
      setApplied(null);
    }
  }

  async function handleApplyPromo() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setApplying(true);
    try {
      const result = await validatePromo(promoInput);
      setApplied({
        code: result.code,
        discountPercent: result.discountPercent,
        originalAmount: result.originalAmount,
        finalAmount: result.finalAmount,
      });
      setPromoInput(result.code);
      toast.success(`Скидка ${result.discountPercent}% применена`);
    } catch (err) {
      setApplied(null);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Неверный промокод';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  async function handlePay() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setPaying(true);
    try {
      const result = await subscribe(applied?.code);
      openPaymentUrl(result.paymentUrl);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Не удалось создать платёж';
      toast.error(message);
      setPaying(false);
    }
  }
```

- [ ] **Step 3: Render price + promo field**

Replace the price `<section>` and insert promo UI before the pay button on the main form:

```tsx
      <section className="space-y-3">
        {applied ? (
          <p className="text-3xl font-semibold tabular-nums">
            <span className="mr-2 text-base font-normal text-muted-foreground line-through">
              {(applied.originalAmount / 100).toLocaleString('ru-RU')} ₽
            </span>
            {(applied.finalAmount / 100).toLocaleString('ru-RU')} ₽
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / год (−{applied.discountPercent}%)
            </span>
          </p>
        ) : (
          <p className="text-3xl font-semibold tabular-nums">
            {PRICE_RUB.toLocaleString('ru-RU')} ₽
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / год
            </span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Разовая оплата — доступ к AI на 365 дней. Без автосписаний.
        </p>
      </section>

      {/* existing "Входит в лицензию" / "Всегда бесплатно" sections stay */}

      <section className="space-y-2">
        <label htmlFor="promo" className="text-sm font-medium">
          Промокод
        </label>
        <div className="flex gap-2">
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => clearAppliedIfEdited(e.target.value)}
            placeholder="Введите код"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={applying || !promoInput.trim()}
            onClick={() => void handleApplyPromo()}
          >
            {applying ? '…' : 'Применить'}
          </Button>
        </div>
      </section>
```

Confirm `Button` supports `variant="secondary"` in this repo; if not, omit `variant` or use the closest existing variant from `button.tsx`.

Keep the existing pay `Button` calling `handlePay`.

- [ ] **Step 4: Manual smoke (optional if no UI test harness)**

Run food + gateway locally (`pnpm dev` from monorepo root). On `/subscribe`: apply `new80` → price 20 ₽ (if list price 100 ₽); pay in mock → payment amount 2000 kopecks.

Automated gate for this task:

Run: `cd apps/ai-food && pnpm exec vitest run src/features/billing/api/billingApi.test.ts`

Expected: PASS (UI is covered by API contract + manual smoke)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
git commit -m "$(cat <<'EOF'
feat(food): promo code field and discounted price on subscribe

EOF
)"
```

---

### Task 5: Spec status + gateway doc touch-up

**Files:**
- Modify: `apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md` (Status → Approved — implemented, or leave Approved — plan executed after verification)
- Modify: `apps/ai-food/docs/AI-GATEWAY.md` — add `POST /billing/promo/validate` to the billing table

- [ ] **Step 1: Update AI-GATEWAY.md billing table**

Add row:

| `POST` | `/billing/promo/validate` | `X-User-Token` | Проверка промокода и цена со скидкой |

Note that `/billing/subscribe` accepts optional `promoCode` and returns `amount` / `originalAmount` / `promoCode`.

- [ ] **Step 2: Set spec Status**

Change header Status to: `Approved — implemented`

- [ ] **Step 3: Commit**

```bash
git add apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md apps/ai-food/docs/AI-GATEWAY.md
git commit -m "$(cat <<'EOF'
docs: document promo validate endpoint and mark promo spec implemented

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Catalog `new80`/`new50` in code | Task 1 |
| No usage limits | Tasks 1–2 (no limit checks) |
| Normalize trim+lower | Task 1 |
| `finalAmount` floor + min 1 | Task 1 |
| `POST /billing/promo/validate` | Task 2 |
| Subscribe optional `promoCode` + discounted `Payment.amount` | Task 2 |
| Response `amount`/`originalAmount`/`promoCode` | Task 2 |
| No Prisma promo field | Tasks 1–2 |
| Client validate + subscribe | Task 3 |
| UI field + Apply + strikethrough price | Task 4 |
| Edit after apply clears applied | Task 4 |
| Docs | Task 5 |
