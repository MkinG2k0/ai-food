### Task 3: Billing callers await async price helpers

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: async `getSubscriptionPriceKopecks` / `getSubscriptionDurationDays` / `getPrisma`
- Produces: same HTTP contracts; internals use `await`

- [ ] **Step 1: Make `resolveSubscribeAmount` async**

```ts
async function resolveSubscribeAmount(
  prisma: PrismaClient | null,
  promoCodeRaw: unknown,
): Promise<{
  amount: number;
  originalAmount: number;
  promoCode: string | null;
}> {
  const originalAmount = await getSubscriptionPriceKopecks(prisma);
  // ... same promo logic as today, using originalAmount
}
```

Import `PrismaClient` type if needed. Pass `getPrisma()` / `requireDb()` into callers.

- [ ] **Step 2: Update `/price`, `/promo/validate`, `/subscribe`**

```ts
billingRouter.get(
  '/price',
  asyncHandler(async (_req, res) => {
    const prisma = getPrisma();
    res.json({
      amountKopecks: await getSubscriptionPriceKopecks(prisma),
      currency: 'RUB',
      durationDays: await getSubscriptionDurationDays(prisma),
    });
  }),
);
```

In validate/subscribe: `const prisma = вЂ¦;` then `await resolveSubscribeAmount(prisma, вЂ¦)` / `await getSubscriptionPriceKopecks(prisma)`.

- [ ] **Step 3: Fix billing.test.ts mocks**

Ensure mocks return Promises:

```ts
getSubscriptionPriceKopecks: (...args: unknown[]) => mockPrice(...args),
```

And in `beforeEach` / tests: `mockPrice.mockResolvedValue(10_000)` (not `mockReturnValue`). Same for `mockDuration.mockResolvedValue(365)`.

- [ ] **Step 4: Run billing tests**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/billing.test.ts src/lib/subscription.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "fix(billing): await async subscription price helpers"
```

---
