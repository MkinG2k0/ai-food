### Task 2: Client `fetchSubscriptionPrice` + hook

**Files:**
- Modify: `apps/ai-food/src/features/billing/api/billingApi.ts`
- Modify: `apps/ai-food/src/features/billing/api/billingApi.test.ts`
- Create: `apps/ai-food/src/features/billing/model/useSubscriptionPrice.ts`
- Modify: `apps/ai-food/src/features/billing/index.ts`

**Interfaces:**
- Consumes: `VITE_AI_GATEWAY_URL`, `gatewayBase()` pattern in `billingApi.ts`
- Produces:
  - `SubscriptionPrice = { amountKopecks: number; currency: string; durationDays: number }`
  - `fetchSubscriptionPrice(): Promise<SubscriptionPrice>`
  - `useSubscriptionPrice()` → `useQuery` (always enabled, no auth)
  - `subscriptionPriceQueryKey = ['billing', 'price'] as const`

- [ ] **Step 1: Write failing client test**

Append to `billingApi.test.ts`:

```ts
  it('fetchSubscriptionPrice GETs /billing/price without user headers', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        amountKopecks: 10_000,
        currency: 'RUB',
        durationDays: 365,
      }),
    });
    const { fetchSubscriptionPrice } = await import('./billingApi');
    const result = await fetchSubscriptionPrice();
    expect(result).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://gw.test/billing/price',
      expect.objectContaining({ method: 'GET' }),
    );
  });
```

Follow existing test file patterns for `vi.resetModules` / env stubs if present. Prefer `vi.stubGlobal('fetch', fetchMock)` like the other tests in this file if that is more consistent.

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter ai-food test -- src/features/billing/api/billingApi.test.ts`

Expected: FAIL (`fetchSubscriptionPrice` not exported).

- [ ] **Step 3: Implement API + hook**

In `billingApi.ts`:

```ts
export type SubscriptionPrice = {
  amountKopecks: number;
  currency: string;
  durationDays: number;
};

export async function fetchSubscriptionPrice(): Promise<SubscriptionPrice> {
  const res = await fetch(`${gatewayBase()}/billing/price`, {
    method: 'GET',
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SubscriptionPrice;
}
```

Create `useSubscriptionPrice.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchSubscriptionPrice,
  type SubscriptionPrice,
} from '../api/billingApi';

export const subscriptionPriceQueryKey = ['billing', 'price'] as const;

export function useSubscriptionPrice() {
  return useQuery<SubscriptionPrice, Error>({
    queryKey: subscriptionPriceQueryKey,
    queryFn: fetchSubscriptionPrice,
    staleTime: 5 * 60_000,
  });
}
```

Export from `index.ts`: `fetchSubscriptionPrice`, `SubscriptionPrice`, `useSubscriptionPrice`, `subscriptionPriceQueryKey`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter ai-food test -- src/features/billing/api/billingApi.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/billing
git commit -m "feat(ai-food): fetch subscription price from gateway"
```
