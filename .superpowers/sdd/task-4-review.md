# Task 4 Review: `requireAdminKey` middleware

**Reviewer:** task-scoped gate  
**Base:** `d950e2c391d6898d556800de51649f3bd7de0751`  
**Head:** `62ec2bd` — `feat(ai-app): add fail-closed requireAdminKey middleware`

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
| Create `adminAuth.ts` with `export const requireAdminKey: RequestHandler` | ✅ | `adminAuth.ts` L12–24 |
| Fail-closed when `ADMIN_API_KEY` unset | ✅ | L13–16; test L26–31 |
| Validate `X-Admin-Key` via `req.header('x-admin-key')` | ✅ | L18 |
| Reject missing/wrong key → 401 `UNAUTHORIZED` | ✅ | L19–21; test L33–37 |
| Call `next()` on match | ✅ | L23; test L39–44 |
| `timingSafeEqual` on equal-length buffers | ✅ | L5–9 |
| Unit tests per brief (3 cases) | ✅ | `adminAuth.test.ts` — matches brief Step 1 |
| Commit scope: middleware + tests only | ✅ | Diff: 2 files, +69 lines |
| Commit message per brief | ✅ | `feat(ai-app): add fail-closed requireAdminKey middleware` |

**Global constraints**

| Constraint | Verdict | Evidence |
|------------|---------|----------|
| Admin API header `X-Admin-Key` | ✅ | L18 |
| Missing `ADMIN_API_KEY` → reject all (fail-closed) | ✅ | L13–16 (contrast: `requireApiKey` allows when unset) |
| Scope: middleware + tests only | ✅ | No route wiring (deferred to Task 5+) |

**Gaps:** None blocking.  
**Extras:** Blank/whitespace-only `ADMIN_API_KEY` rejected via `.trim()` + `!expected` (report claim); not explicitly tested — see Minor #1.

---

## 2. Task quality: **Approved**

Minimal, security-conscious middleware aligned with brief reference implementation. Uses constant-time comparison (improvement over sibling `requireApiKey` plain `!==`).

### Critical
_None._

### Important
_None._

### Minor

1. **No test for blank `ADMIN_API_KEY`** — Implementation rejects whitespace-only env via trim (L13–14), but tests only cover `delete process.env.ADMIN_API_KEY`. Optional hardening; behavior is correct.

---

## Verification

```
pnpm exec vitest run src/middleware/adminAuth.test.ts
✓ 3 passed (3)

pnpm type-check
✓ pass
```

Reviewer re-ran suite locally — all tests and type-check pass.

---

## Summary

Task 4 delivers fail-closed `requireAdminKey` middleware: unset/blank `ADMIN_API_KEY` and missing/wrong `X-Admin-Key` yield 401; valid key calls `next()`. Implementation matches the brief; tests cover the three specified scenarios. Scope and commit hygiene are clean (2 files only).

**Spec compliance:** ✅  
**Task quality:** Approved
