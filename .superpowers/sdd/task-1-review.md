# Task 1 Review: JWT — `phone` → `telegramId`

**Reviewer:** code-reviewer subagent  
**Base:** `f13c76b471e8b827929485816f90dcbb067d8c1a`  
**Head:** `f8b7a608ac79ee8b5a682286b9f325cb9dc675a1`  
**Scope:** 4 files, 12 insertions / 12 deletions

---

## Spec Compliance: ✅

| Requirement | Status |
|-------------|--------|
| Modify `apps/ai-app/src/lib/jwt.ts` — `UserTokenPayload`, sign/verify `telegramId` | ✅ Done |
| Modify `apps/ai-app/src/lib/jwt.test.ts` — round-trip + other `phone` → `telegramId` | ✅ Done |
| Modify `quota.test.ts` — 2 mock payloads | ✅ Done |
| Modify `billing.test.ts` — 1 mock payload | ✅ Done |
| TDD: failing test before implementation | ✅ Reported (Step 2 FAIL) |
| Targeted test run (jwt + quota + billing) | ✅ Reported PASS (15 tests) |
| Commit message per brief | ✅ `refactor(ai-app): JWT claims use telegramId instead of phone` |

**Missing:** None.

**Extra:** None — diff touches exactly the four files listed in the brief; no auth routes, Prisma, or flashcall changes.

**Misunderstood:** None — implementation matches the brief snippet verbatim; claim name is `telegramId` (string), `sub` remains JWT subject.

---

## Task Quality: **Approved**

No Critical or Important issues at confidence ≥ 80.

---

## Strengths

1. **Minimal, focused diff** — mechanical rename of claim/type across JWT module and three test files; no scope creep.
2. **Spec fidelity** — `jwt.ts` matches the brief line-for-line (type, `SignJWT({ telegramId })`, verify guard, error mapping unchanged).
3. **TDD evidence** — report documents expected FAIL on Step 2 and PASS on Step 5 for the three specified suites.
4. **Mock consistency** — all `verifyUserToken` mocks in `quota.test.ts` (×2) and `billing.test.ts` (×1) updated; no stray `phone` in modified files.
5. **Behavior preserved** — HS256, `sub`/`iat`, no `exp`, `AUTH_MISCONFIGURED` / `INVALID_USER_TOKEN` paths unchanged.

---

## Issues

### Critical (confidence ≥ 80)

*None.*

### Important (confidence ≥ 80)

*None.*

### Minor / Expected Follow-ups (out of task scope, not blocking)

| Item | Notes |
|------|-------|
| `auth.ts` still calls `signUserToken({ sub, phone })` | Type/runtime mismatch until Task 2+; explicitly excluded from this task. |
| `auth.flashcall.test.ts` still expects `phone` | Brief says not to run/fix flashcall suite yet. |
| Old JWTs with `phone` claim invalid after deploy | Intentional migration; no backward-compat required in brief. |
| No explicit test for token missing `telegramId` | Same validation pattern as pre-change `phone`; optional hardening, not required. |

---

## Verdict Summary

| Dimension | Result |
|-----------|--------|
| **Spec compliance** | ✅ |
| **Task quality** | **Approved** |
| **Gate** | **PASS** — safe to proceed to dependent tasks (auth route migration). |
