### Task 3: Wire billing to async `resolvePromo`

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `resolvePromo(prisma, raw, originalAmount): Promise<ResolvedPromo | null>`
- Produces: unchanged HTTP contracts for `/promo/validate` and `/subscribe`

- [ ] **Step 1: Update billing callsites**

In `apps/ai-app/src/routes/billing.ts`:

1. In `resolveSubscribeAmount`, change:

```ts
  const resolved = resolvePromo(promoCodeRaw, originalAmount);
```

to:

```ts
  const resolved = await resolvePromo(prisma, promoCodeRaw, originalAmount);
```

2. In `POST /promo/validate`, change:

```ts
    const resolved = resolvePromo(raw, originalAmount);
```

to:

```ts
    const resolved = await resolvePromo(prisma, raw, originalAmount);
```

- [ ] **Step 2: Extend billing test mock prisma with `promoCode`**

In `apps/ai-app/src/routes/billing.test.ts`, inside `mockPrisma()`, add a store and `promoCode` API. At the top of the describe (near `paymentStore`), add:

```ts
  const promoStore = new Map<string, { id: string; code: string; discountPercent: number }>();
```

Inside `mockPrisma()` return object, add:

```ts
      promoCode: {
        findUnique: vi.fn(
          async ({ where }: { where: { code: string } }) =>
            promoStore.get(where.code) ?? null,
        ),
      },
```

In `beforeEach`, after `paymentStore.clear()`:

```ts
    promoStore.clear();
    promoStore.set('new80', {
      id: 'promo-new80',
      code: 'new80',
      discountPercent: 80,
    });
    promoStore.set('new50', {
      id: 'promo-new50',
      code: 'new50',
      discountPercent: 50,
    });
```

Keep existing promo test names/expectations (`new80` / `new50`) вЂ” they now hit the mock store, not hardcoded map.

- [ ] **Step 3: Run billing + promos tests**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts src/routes/billing.test.ts
```

Expected: all PASS. Existing promo cases still green via mock DB rows.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "feat(ai-app): billing resolves promos via prisma"
```

---

