### Task 3: SubscribePage uses API price

**Files:**
- Modify: `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx`

**Interfaces:**
- Consumes: `useSubscriptionPrice()` from `@/features/billing`
- Produces: UI shows `amountKopecks / 100` ₽ and `durationDays`; loading and error states without hardcoded `PRICE_RUB`

- [ ] **Step 1: Replace hardcoded price**

Remove `const PRICE_RUB = 100`.

Import `useSubscriptionPrice` from `@/features/billing`.

In the main subscribe view (not success/fail):

```tsx
  const { data: price, isLoading: priceLoading, isError: priceError } =
    useSubscriptionPrice();
  const priceRub =
    price != null ? Math.round(price.amountKopecks / 100) : null;
  const durationDays = price?.durationDays;
```

Replace the price block:

```tsx
        <p className="text-3xl font-semibold tabular-nums">
          {priceLoading && (
            <span className="text-base font-normal text-muted-foreground">
              Загрузка цены…
            </span>
          )}
          {priceError && (
            <span className="text-base font-normal text-muted-foreground">
              Цена недоступна
            </span>
          )}
          {priceRub != null && (
            <>
              {priceRub.toLocaleString('ru-RU')} ₽
              <span className="ml-2 text-base font-normal text-muted-foreground">
                / {durationDays != null ? `${durationDays} дн.` : 'срок'}
              </span>
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Разовая оплата — доступ к AI на{' '}
          {durationDays != null ? `${durationDays} дней` : 'срок лицензии'}.
          Без автосписаний.
        </p>
```

Disable «Оплатить» while `priceLoading` if desired (optional: keep enabled — payment amount is still set server-side).

Note: hooks must be called unconditionally at top of component (before early returns for success/fail). Call `useSubscriptionPrice()` near other hooks at the top of `SubscribePage`.

- [ ] **Step 2: Manual smoke (optional) / typecheck**

Run: `pnpm --filter ai-food exec tsc --noEmit`  
Expected: no errors related to SubscribePage.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
git commit -m "feat(ai-food): show subscription price from API on subscribe page"
```
