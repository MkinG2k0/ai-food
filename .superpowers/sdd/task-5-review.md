# Task 5 Review: Admin pricing, stats, users, and subscriptions (re-review)

**Reviewer:** task-scoped gate  
**Base:** `62ec2bddf822e4bf770b8c1a9e4ced91447c4cf7`  
**Head:** `4b32edb297ae0de57c648800e0c3b955d3296914` — `fix(admin): reject non-positive activate days`  
**Range:** `92a0873` (feat) + `4b32edb` (fix)

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | ✅ |
| **Critical** | 0 |
| **Important** | 0 (1 resolved) |
| **Minor** | 2 |

## 1. Spec compliance: ✅

| Requirement | Verdict | Evidence |
|-------------|---------|----------|
| Router mounted at `/admin`; all routes use `X-Admin-Key` | ✅ | `app.ts`; `admin.ts` L65–67 |
| Missing `ADMIN_API_KEY` rejects access | ✅ | Shared fail-closed middleware; `adminAuth.test.ts` |
| `GET /pricing`: DB → env → defaults, single `source` | ✅ | `admin.ts` L69–75; delegates to `getPricingSnapshot` |
| `PUT /pricing`: validates, upserts singleton, returns effective snapshot | ✅ | L77–135 |
| `GET /stats` exact eight-field shape | ✅ | L137–191 |
| `GET /users?q=` search and limit 20 | ✅ | L193–217 |
| Subscription actions limited to activate/extend/revoke | ✅ | L219–300 |
| Updated user snapshot shape | ✅ | L42–59, L298 |
| CORS supports `PUT` and `X-Admin-Key` | ✅ | `app.ts` |
| Env documentation and Turbo passthrough | ✅ | `.env.example`; `turbo.json` |
| No promo UI or T-Bank refund work | ✅ | Diff scope limited to admin API + SDD report |

The review diff spans two commits on a linear history from the requested base. Fix commit `4b32edb` touches only `admin.ts`, `admin.test.ts`, and the SDD report.

## 2. Task quality: ✅

### Critical

_None._

### Important (resolved)

1. **~~`activate` accepts a positive duration that becomes zero after normalization.~~** **Fixed in `4b32edb`.**  
   When `days` is explicitly provided for `activate`, the handler now requires a positive integer (`Number.isInteger` and `>= 1`); `Math.floor` was removed. Fractional (`0.5`) and zero values return `400 VALIDATION_ERROR` with `days must be a positive integer.` Omitted `days` still falls back to `getSubscriptionDurationDays(prisma)`. Regression coverage: `it.each([0.5, 0])` in `admin.test.ts` L245–257.

### Minor

1. **Stats tests assert output shape but not query semantics.** Mock returns positional values without asserting active-subscription predicate, confirmed-payment filter, or 7/30-day date windows. Implementation is correct; dashboard-definition regressions could still pass.
2. **`task-5-report.md` remains contaminated** with an unrelated older “Task 5: Legal pages” section (L46+). Does not affect code; handoff artifact is misleading.

## Fix verification

- Read brief, report (fix section), prior review, and full diff `62ec2bd..4b32edb`.
- Confirmed `admin.ts` L236–254: integer validation before use; no floor on activate path.
- Confirmed fix commit parent chain: `4b32edb` → `92a0873` → `62ec2bd`.
- Re-ran `pnpm exec vitest run src/routes/admin.test.ts` — **11/11 passed** (includes new invalid-days cases).

## Summary

The admin API meets the spec: fail-closed auth, pricing precedence/source, stats shape, user search, subscription actions, CORS, and env wiring. The prior Important finding (zero-day activation via fractional `days`) is adequately fixed with aligned validation and regression tests. Quality gate passes; only minor test-coverage and documentation hygiene items remain.
