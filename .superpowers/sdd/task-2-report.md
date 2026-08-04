# Task 2 Report: Client `fetchSubscriptionPrice` + hook

## Status
**DONE** — TDD cycle completed, all tests pass, committed.

## What was implemented

### API (`billingApi.ts`)
- `SubscriptionPrice` type: `{ amountKopecks, currency, durationDays }`
- `fetchSubscriptionPrice()` — GET `${gatewayBase()}/billing/price`, no auth headers, uses existing `parseError` on failure

### Hook (`model/useSubscriptionPrice.ts`)
- `subscriptionPriceQueryKey = ['billing', 'price'] as const`
- `useSubscriptionPrice()` — `useQuery` always enabled, `staleTime: 5 * 60_000`

### Exports (`index.ts`)
- `fetchSubscriptionPrice`, `SubscriptionPrice`, `useSubscriptionPrice`, `subscriptionPriceQueryKey`

### Test (`billingApi.test.ts`)
- New test: `fetchSubscriptionPrice GETs /billing/price without user headers`
- Matches existing style: `vi.resetModules`, `vi.stubEnv`, `vi.stubGlobal('fetch', fetchMock)`

## TDD cycle

| Step | Result |
|------|--------|
| 1. Failing test added | `fetchSubscriptionPrice is not a function` |
| 2. Implementation | API + hook + exports |
| 3. Re-run tests | 4/4 PASS |

## Commit
```
feat(ai-food): fetch subscription price from gateway
```
Files: `billingApi.ts`, `billingApi.test.ts`, `useSubscriptionPrice.ts`, `index.ts`

## Self-review

| Check | Verdict |
|-------|---------|
| Signatures match brief | ✓ |
| No auth headers on price fetch | ✓ (unlike subscribe/status/sync) |
| Query key matches brief | ✓ `['billing', 'price']` |
| staleTime 5 min | ✓ |
| Hook always enabled (no auth gate) | ✓ |
| Exports complete | ✓ |
| Test style consistent | ✓ |
| No UI changes | ✓ |

## Concerns / follow-ups
- Hook has no dedicated unit test (brief only required API test); hook is thin wrapper over `useQuery` + `fetchSubscriptionPrice`.
- UI task can import from `@/features/billing` and use `useSubscriptionPrice()` directly.

## Test command
```bash
pnpm --filter ai-food test -- src/features/billing/api/billingApi.test.ts
```
Result: **4 passed**
