# Task 4 Report: Subscribe page promo UI

## Status
**DONE**

## Commits
- `feat(food): promo code field and discounted price on subscribe` — only `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx`

## Changes
- Imported `validatePromo` from `@/features/billing`.
- Added state: `promoInput`, `applying`, `applied` (code, discountPercent, originalAmount, finalAmount).
- `clearAppliedIfEdited` clears applied promo when input diverges from applied code.
- `handleApplyPromo` validates via API, shows toast, normalizes input to server code.
- `handlePay` passes `applied?.code` to `subscribe()`.
- Price section: without promo — existing `useSubscriptionPrice` loading/error/display preserved; with promo — strikethrough `originalAmount/100`, final `finalAmount/100`, `(−N%)`.
- Promo field + Apply button (`variant="secondary"`) inserted before pay button.

## Tests
```
pnpm exec vitest run src/features/billing/api/billingApi.test.ts
✓ 6 passed (6)
```

## Adaptation vs brief
- Did **not** reintroduce hardcoded `PRICE_RUB`; list price still from `useSubscriptionPrice`.
- Duration suffix uses `durationDays` from hook (not hardcoded «/ год»).

## Concerns
- No component-level UI test; manual smoke on `/subscribe` recommended (apply `new80`, verify discounted price and payment amount).
- Pay button not disabled when `priceError` and no promo — pre-existing behavior.

## Manual smoke (optional)
`pnpm dev` → `/subscribe` → apply `new80` → expect discounted price → pay in mock.
