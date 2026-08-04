# Task 3 Report: Billing callers await async price helpers

**Status:** DONE_WITH_CONCERNS  
**Branch:** `feat/admin-web`  
**Commit:** `d950e2c` — `fix(billing): await async subscription price helpers`

## What was done

- Made `resolveSubscribeAmount` async and passed its Prisma client to the price helper.
- Updated `/price`, `/promo/validate`, and `/subscribe` to await async pricing helpers.
- Passed the available Prisma client into price and duration lookups.
- Changed billing price/duration mocks to `mockResolvedValue`.
- Preserved existing response shapes, status codes, and promo/payment behavior.

## Verification

- Red: `pnpm exec vitest run src/routes/billing.test.ts` — 5 expected failures with Promise-valued mocks before the route fix.
- Green: `pnpm exec vitest run src/routes/billing.test.ts src/lib/subscription.test.ts` — 2 files, 21/21 tests passed.
- `pnpm type-check` — passed.
- IDE diagnostics for both modified files — no errors.
- `git diff --check` for both modified files — passed.

## Scope

The commit contains only:

- `apps/ai-app/src/routes/billing.ts`
- `apps/ai-app/src/routes/billing.test.ts`

Unrelated `apps/ai-food` legal changes and existing SDD workspace changes were not staged or committed.

## Concerns

Implementation has no known concern. The report path was concurrently appended with an unrelated SubscribePage report after this report was created; that content was preserved to avoid overwriting another worker's changes.
# Task 3 Report: SubscribePage uses API price

## Status
**DONE** — hardcoded price removed, API hook wired, tsc clean, committed.

## What was implemented

### `SubscribePage.tsx`
- Removed `const PRICE_RUB = 100`
- Imported `useSubscriptionPrice` from `@/features/billing`
- Hook called at top of component (before success/fail early returns)
- Price block shows loading (`Загрузка цены…`), error (`Цена недоступна`), or API data
- `priceRub = Math.round(amountKopecks / 100)` with `toLocaleString('ru-RU')`
- Duration from `price.durationDays` in both price line and description
- «Оплатить» left enabled during price load (server sets payment amount)

## Verification

| Step | Result |
|------|--------|
| `pnpm --filter ai-food exec tsc --noEmit` | PASS (exit 0) |
| Linter (SubscribePage.tsx) | No issues |

## Commit
```
4692d31 feat(ai-food): show subscription price from API on subscribe page
```
Files: `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx` only

## Self-review

| Check | Verdict |
|-------|---------|
| Rules of Hooks — hook before early returns | OK |
| No hardcoded PRICE_RUB | OK |
| Loading/error/success UI states | OK |
| durationDays fallback text | OK |

## Concerns
- None blocking. Manual smoke on `/subscribe` with live gateway recommended to confirm price display.
