# Task 1 Report: Promo catalog helpers

## Status

DONE

## TDD Evidence

### RED (Step 2)

Command: `pnpm exec vitest run src/lib/promos.test.ts` (from `apps/ai-app`)

```
 FAIL  src/lib/promos.test.ts [ src/lib/promos.test.ts ]
Error: Failed to load url ./promos.js (resolved id: ./promos.js) in .../promos.test.ts. Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

Expected failure: module `./promos.js` not found before implementation.

### GREEN (Step 4)

Command: `pnpm exec vitest run src/lib/promos.test.ts`

```
 ✓ src/lib/promos.test.ts (6 tests) 3ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

All six test cases pass:
- `normalizePromoCode` trims and lowercases
- `lookupPromo` finds `new80` and `new50`
- `lookupPromo` returns null for unknown/empty/whitespace
- `applyPromoDiscount` floors and clamps to minimum 1 kopeck
- `resolvePromo` returns full resolved amounts for valid code
- `resolvePromo` returns null for invalid code

## Files Changed

| File | Action |
|------|--------|
| `apps/ai-app/src/lib/promos.ts` | Created |
| `apps/ai-app/src/lib/promos.test.ts` | Created |

## Commit

- `8caf7f0` — feat(billing): add in-code promo catalog helpers

Only the two task files were staged and committed; no unrelated WIP included.

## Self-Review

- Implementation matches the brief verbatim: in-code catalog (`new80` 80%, `new50` 50%), normalization, lookup, discount with `Math.floor` and `Math.max(1, ...)`, and `resolvePromo` composition.
- Pure helpers with no route or DB dependencies — appropriate for Task 1 scope.
- Test import uses `./promos.js` extension, consistent with other `apps/ai-app/src/lib/*.test.ts` files.
- Edge cases covered: empty/whitespace codes, small amounts clamped to 1 kopeck, case-insensitive lookup.
- No concerns; ready for downstream billing route integration.

---

# Final Fix Report: Review findings (Critical + Important)

## Status

DONE

## Commit

- `18d3d01` — fix(billing): harden promo lookup and reject empty promoCode on subscribe

## Changes

| Finding | Fix |
|---------|-----|
| Critical: prototype pollution in promo lookup | `PROMOS` → `Map<string, PromoDefinition>` with `.get(key)` |
| Important: empty string on subscribe | `resolveSubscribeAmount`: only `null`/`undefined` → full price; `''` → INVALID_PROMO |

## Test Results

Command: `cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts src/routes/billing.test.ts`

```
 ✓ src/lib/promos.test.ts (7 tests)
 ✓ src/routes/billing.test.ts (14 tests)
 Test Files  2 passed (2)
      Tests  21 passed (21)
```

New regression tests:
- `lookupPromo('__proto__')` / `lookupPromo('constructor')` → null
- `resolvePromo('__proto__', 10000)` → null
- `POST /billing/subscribe` with `{ promoCode: '' }` → 400 INVALID_PROMO, paymentStore unchanged

## Concerns

None.
