# Task 2 Review: Async subscription price/duration helpers

**Reviewer:** task-scoped gate  
**Base:** `5718f17d9403b40796b704e1f3da0dcd863b4b0f`  
**Head:** `4170170` — `feat(ai-app): read subscription price/duration from AppSettings with env fallback`

---

## 1. Spec compliance: ✅

| Requirement | Verdict | Evidence |
|-------------|---------|----------|
| `PricingSource`, `PricingSnapshot` types exported | ✅ | Diff adds exact shapes (`'db' \| 'env'`, four snapshot fields) |
| `getSubscriptionPriceKopecks(prisma?)` async | ✅ | `loadSettings` → positive DB → `envPriceKopecks()` |
| `getSubscriptionDurationDays(prisma?)` async | ✅ | Same chain with `envDurationDays()` |
| `getPricingSnapshot(prisma?)` async with per-field sources | ✅ | Single `loadSettings`; `priceSource` / `durationSource` tracked independently |
| Precedence DB → env → defaults 10000 / 365 | ✅ | `db > 0` guard; env helpers floor positive finite values; defaults 10_000 / 365 |
| `loadSettings`: `id: 1`, try/catch on missing table | ✅ | `findUnique({ where: { id: 1 } })`; catch → `null` |
| `activateYearLicense` awaits `getSubscriptionDurationDays(prisma)` | ✅ | Line change in diff |
| `hasActiveSubscription` / `subscriptionPublicFields` unchanged | ✅ | No diff in those functions |
| Tests: async defaults, DB price override, snapshot sources, activateYearLicense mock | ✅ | Matches brief test blocks verbatim |
| TDD red → green on `subscription.test.ts` | ✅ | Report: 2 failed → 7/7 pass; scope-appropriate |
| Commit only `subscription.ts` + `subscription.test.ts` | ✅ | Diff: 2 files, +99/−10, brief commit message |
| No admin routes / Next.js scope creep | ✅ | Only lib + tests touched |

**Gaps:** None in committed scope.  
**Extras:** None.

---

## 2. Task quality: **Approved**

Focused implementation aligned with the brief. TDD evidence and commit hygiene are solid.

### Critical
_None._

### Important
_None blocking for this task._

1. **`billing.ts` callers still sync (deferred)** — `apps/ai-app/src/routes/billing.ts` calls `getSubscriptionPriceKopecks()` / `getSubscriptionDurationDays()` without `await` or `prisma`. At runtime this yields `Promise` objects where numbers are expected; `tsc --noEmit` fails on those sites. Brief limits Task 2 to lib + tests only; report correctly flags Task 3 as the fix. **Not a Task 2 defect**, but the branch stays type-unsafe until Task 3 lands.

### Minor

1. **No dedicated duration DB-override test** — Brief specifies price DB override + mixed snapshot; duration DB path is only implied via snapshot when price is from DB. Acceptable; optional hardening in a follow-up.

2. **`PricingSource: 'env'` includes hardcoded defaults** — When env vars are unset, `envPriceKopecks` / `envDurationDays` return 10_000 / 365 but snapshot labels source as `'env'`. Matches brief test expectation; no separate `'default'` source in the type.

3. **Repeated `loadSettings` per getter** — `getSubscriptionPriceKopecks` and `getSubscriptionDurationDays` each query independently; `getPricingSnapshot` loads once. Fine for current call patterns; optimize only if hot-path profiling warrants it.

4. **Non-null assertions in snapshot** — `dbPrice!` / `dbDays!` guarded by `priceFromDb` / `daysFromDb`; safe but could be rewritten without `!` for style.

---

## Summary

Task 2 delivers the specified async helpers, DB→env→defaults chain, `getPricingSnapshot`, and updated `activateYearLicense` with matching tests and an isolated commit. Implementation matches the brief code and interfaces. Known `billing.ts` breakage is intentional intermediate state for Task 3, not scope creep.

**Spec compliance:** ✅  
**Task quality:** Approved
