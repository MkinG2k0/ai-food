# Task 3 Review: In-memory Telegram login challenges

**Reviewer:** code-reviewer subagent  
**Date:** 2026-08-04  
**Scope:** `cdde860..8db7ba6` (2 files)  
**Brief:** `.superpowers/sdd/task-3-brief.md`  
**Report:** `.superpowers/sdd/task-3-report.md`

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | **Approved** |
| **Critical** | 0 |
| **Important** | 0 |
| **Minor** | 0 |

---

## Scope reviewed

- `apps/ai-app/src/lib/telegramLoginChallenge.ts` — in-memory challenge store
- `apps/ai-app/src/lib/telegramLoginChallenge.test.ts` — lifecycle + expiry tests
- Commit `8db7ba6` — `feat(ai-app): add Telegram login challenge store`

Constraints applied: in-memory APIs per brief; one-shot consume; `ttlMs: -1` expiry acceptable.

---

## Spec compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `LoginChallengeStatus = 'pending' \| 'confirmed' \| 'consumed'` | ✅ | `telegramLoginChallenge.ts` L5 |
| `createLoginChallenge(opts?)` → `{ id, nonce, expiresAt: Date }` | ✅ | L35–52; default TTL 5 min; optional `deviceId` |
| `getLoginChallengeById(id)` | ✅ | L54–56; lazy purge on access |
| `getLoginChallengeByNonce(nonce)` | ✅ | L58–62; dual-index lookup |
| `confirmLoginChallenge(nonce, { userId, token })` → `boolean` | ✅ | L64–74; pending-only |
| `consumeLoginChallenge(id)` → `{ token, userId } \| null` | ✅ | L76–86; one-shot delete |
| `clearAllLoginChallengesForTests()` | ✅ | L88–91 |
| Challenge shape `{ id, nonce, status, deviceId?, userId?, token?, expiresAt }` | ✅ | `LoginChallenge` type L7–15 |
| Tests: create → confirm → consume → second consume null | ✅ | test L15–26 |
| Tests: reject unknown nonce | ✅ | test L28–32 |
| Tests: expiry rejects confirm/consume | ✅ | test L34–40; `ttlMs: -1` per brief |
| Commit message per brief | ✅ | `feat(ai-app): add Telegram login challenge store` |
| Implementation matches brief Step 3 | ✅ | Byte-for-byte match with brief reference implementation |

---

## Verification

```
pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts
✓ 3 passed (3)
```

Reviewer re-ran suite locally — all tests pass.

---

## Quality assessment

**Lifecycle:** Status transitions `pending → confirmed → consumed` enforced. Double consume returns `null` (entry removed on first consume). Unknown nonce confirm returns `false`.

**Expiry:** `isExpired` uses `now >= expiresAt`; expired entries purged lazily on get/confirm/consume. `ttlMs: -1` creates immediately expired challenge — confirm and consume both correctly reject without spin-wait flakiness.

**Concurrency:** Synchronous, single-threaded Node API — no await gaps between check and mutate; one-shot consume is safe within one process.

**Conventions:** Matches sibling `apps/ai-app/src/lib/*.test.ts` patterns (vitest, `.js` import suffix, `afterEach` cleanup).

**Scope discipline:** Diff contains exactly the two brief files; no drive-by changes.

---

## Issues (confidence ≥ 80)

None.

---

## Informational (below review threshold)

- In-memory store — challenges lost on restart; acceptable for MVP (noted in task report).
- No background sweeper for expired pending challenges; lazy purge on access only — acceptable per brief/design.
- Brief interface doc aliases type as `Challenge`; exported type is `LoginChallenge` — consistent with brief Step 3 code; no downstream impact.

---

## Summary

Task 3 fully satisfies the brief: all exported APIs, challenge shape, lifecycle semantics, and tests implemented as specified. One-shot consume and `ttlMs: -1` expiry behave correctly. **Approved** with no requested changes.
