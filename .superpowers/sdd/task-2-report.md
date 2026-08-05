# Task 2 Report: Async promo helpers (DB lookup)

## Status: DONE

## Summary

Replaced hardcoded `Map` in `promos.ts` with async Prisma DB lookup. `lookupPromo` and `resolvePromo` now accept `PrismaClient | null | undefined` as first argument and query `promoCode.findUnique`. `normalizePromoCode` and `applyPromoDiscount` unchanged.

## TDD Evidence

| Step | Action | Result |
|------|--------|--------|
| 1 | Rewrote `promos.test.ts` with mock Prisma | — |
| 2 | `pnpm exec vitest run src/lib/promos.test.ts` | **RED** — 4 failed (sync signature / `raw.trim is not a function`) |
| 3 | Implemented async `promos.ts` | — |
| 4 | Re-ran tests | **GREEN** — 6/6 passed |
| 5 | Commit | `ee9edb3` |

## Files Modified

- `apps/ai-app/src/lib/promos.ts` — removed `PROMOS` Map; added Prisma import; async `lookupPromo` / `resolvePromo`
- `apps/ai-app/src/lib/promos.test.ts` — mock Prisma via `vi.fn`; async test cases

## Self-Review

- Signatures match brief exactly
- Null/empty prisma and code handled before DB call
- `applyPromoDiscount` min-1 clamp preserved
- Only files listed in brief were touched
- `billing.ts` not updated (Task 3) — expected temporary typecheck gap elsewhere

## Concerns

None. Prototype-pollution tests from old sync Map removed per brief (DB lookup has no Map prototype issue).

## Commit

- `ee9edb3` — feat(ai-app): resolve promos from database
