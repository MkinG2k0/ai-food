# Task 2 Report: Async subscription price/duration helpers

**Status:** DONE_WITH_CONCERNS  
**Branch:** `feat/admin-web`  
**Commit:** `4170170` — `feat(ai-app): read subscription price/duration from AppSettings with env fallback`

## What was done

### Step 1 — Failing tests (TDD)

Updated `apps/ai-app/src/lib/subscription.test.ts`:

- Replaced sync price/duration tests with async versions + `null` prisma
- Added `getSubscriptionPriceKopecks prefers positive DB value`
- Added `getPricingSnapshot reports db vs env sources`
- Updated `activateYearLicense` mock with `appSettings.findUnique` → `null`

### Step 2 — Red run

```text
pnpm exec vitest run src/lib/subscription.test.ts
2 failed | 5 passed (7)
```

Failures: DB override (sync ignored prisma), `getPricingSnapshot is not a function` — as expected.

### Step 3 — Implementation

Updated `apps/ai-app/src/lib/subscription.ts`:

- Added `PricingSource`, `PricingSnapshot` types
- Added `envPriceKopecks`, `envDurationDays`, `loadSettings` (DB id=1 with try/catch fallback)
- Made `getSubscriptionPriceKopecks` / `getSubscriptionDurationDays` async with DB → env → defaults chain
- Added `getPricingSnapshot` with per-field source tracking
- `activateYearLicense` now `await getSubscriptionDurationDays(prisma)`
- `hasActiveSubscription` / `subscriptionPublicFields` unchanged

### Step 4 — Green run

```text
pnpm exec vitest run src/lib/subscription.test.ts
✓ 7 passed (7)
```

### Step 5 — Commit

Staged and committed **only**:

- `apps/ai-app/src/lib/subscription.ts`
- `apps/ai-app/src/lib/subscription.test.ts`

Unrelated `apps/ai-food` legal changes were **not** staged.

## Self-review

| Check | Result |
|-------|--------|
| Types/exports match brief | PASS |
| DB → env → defaults precedence | PASS |
| `loadSettings` try/catch on missing table | PASS |
| `activateYearLicense` awaits duration with prisma | PASS |
| All 7 subscription tests pass | PASS |
| Commit message matches brief | PASS |
| No unrelated files in commit | PASS |

## Notes / concerns

1. **`billing.ts` callers not updated (expected):** `getSubscriptionPriceKopecks()` / `getSubscriptionDurationDays()` in `apps/ai-app/src/routes/billing.ts` still call sync-style (no `await`, no prisma). `tsc --noEmit` reports 4 errors in billing.ts. Plan Task 3 should migrate billing routes to `await` + prisma.
2. **Intentional scope:** Task brief limits changes to `subscription.ts` + `subscription.test.ts` only.

## Files changed (committed)

- `apps/ai-app/src/lib/subscription.ts`
- `apps/ai-app/src/lib/subscription.test.ts`

## Test summary

`vitest run src/lib/subscription.test.ts` — **7/7 PASS** (TDD red → green confirmed).
