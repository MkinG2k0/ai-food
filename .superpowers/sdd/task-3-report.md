# Task 3 Report: Wire billing to async resolvePromo

## Status

DONE

## What was implemented

1. **`billing.ts` callsites** — Updated both `resolveSubscribeAmount` and `POST /promo/validate` to `await resolvePromo(prisma, raw, originalAmount)` instead of the sync hardcoded call.

2. **`billing.test.ts` mock prisma** — Added `promoStore` Map and `promoCode.findUnique` mock; seeded `new80` (80%) and `new50` (50%) in `beforeEach` after clearing stores.

## What was tested

| Check | Result |
|-------|--------|
| `pnpm exec vitest run src/lib/promos.test.ts src/routes/billing.test.ts` | 20/20 PASS (6 promos + 14 billing) |
| Promo validate `new80` | 200, 2000 final amount |
| Subscribe `new50` | 5000 discounted amount stored |
| Unknown/empty promo | 400 INVALID_PROMO, no payment created |

## Files changed (committed)

- `apps/ai-app/src/routes/billing.ts` — 2 lines: async resolvePromo with prisma
- `apps/ai-app/src/routes/billing.test.ts` — promoStore + promoCode mock + seed data

## Commit

- `877b93b` — `feat(ai-app): billing resolves promos via prisma`

## Self-review

- **Completeness:** Both brief steps (callsite updates + test mock) done; tests and commit per brief.
- **Scope:** Only billing.ts and billing.test.ts touched; no admin CRUD (Task 4).
- **HTTP contracts:** Unchanged — same JSON shapes for `/promo/validate` and `/subscribe`.
- **Null prisma:** `resolveSubscribeAmount` already receives prisma from callers; promo validate uses `requireUser` which guarantees prisma.

## Concerns

None.
