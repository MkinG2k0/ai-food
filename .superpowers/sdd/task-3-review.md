# Task 3 Review: Billing callers await async price helpers

**Reviewer:** task-scoped gate  
**Base:** `4170170f04841e2c7548d95241dff0eb56506c80`  
**Head:** `d950e2c391d6898d556800de51649f3bd7de0751` — `fix(billing): await async subscription price helpers`

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | **Approved** |
| **Critical** | 0 |
| **Important** | 0 |
| **Minor** | 1 |

---

## 1. Spec compliance: ✅

| Requirement | Verdict | Evidence |
|-------------|---------|----------|
| `resolveSubscribeAmount` async; accepts `prisma`; awaits price helper | ✅ | `billing.ts` L55–63 |
| `/price` awaits `getSubscriptionPriceKopecks` / `getSubscriptionDurationDays` with `getPrisma()` | ✅ | L100–108 |
| `/promo/validate` awaits price with prisma from `requireUser` | ✅ | L115–116 |
| `/subscribe` awaits `resolveSubscribeAmount(prisma, …)` | ✅ | L148–149 |
| `PrismaClient` type import | ✅ | L2 |
| HTTP response shapes / status codes unchanged | ✅ | Same JSON fields; promo/payment logic untouched |
| Test mocks return Promises (`mockResolvedValue`) | ✅ | `billing.test.ts` beforeEach + price/promo/subscribe tests |
| Run `billing.test.ts` + `subscription.test.ts` — PASS | ✅ | Reviewer: 21/21 pass |
| Commit scope: `billing.ts` + `billing.test.ts` only | ✅ | Diff: 2 files, +24/−20 |

**Gaps:** None.  
**Extras:** None.

---

## 2. Task quality: **Approved**

Minimal, correct bridge from Task 2 async helpers to billing routes. Fixes the known sync-call breakage without altering HTTP contracts.

### Critical
_None._

### Important
_None._

### Minor

1. **No assertion that prisma is forwarded to mocks** — Tests confirm numeric responses but do not assert `mockPrice` / `mockDuration` received the prisma instance from `getPrisma()` / `requireUser`. Behavior is correct at runtime; optional hardening only.

---

## Verification

```
pnpm exec vitest run src/routes/billing.test.ts src/lib/subscription.test.ts
✓ 21 passed (21)

pnpm type-check
✓ pass
```

---

## Summary

Task 3 completes the async pricing migration in billing: all three affected routes await helpers and pass prisma where available (`getPrisma()` on public `/price`; authenticated routes reuse `requireUser` prisma). Tests updated to `mockResolvedValue`; existing assertions on amounts, promos, and payment storage still hold. Scope and commit hygiene match the brief.

**Spec compliance:** ✅  
**Task quality:** Approved
