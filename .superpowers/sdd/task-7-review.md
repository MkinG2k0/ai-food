# Task 7 Review: Admin session auth (login / logout / middleware)

**Reviewer:** task-scoped gate (re-review after RSC fix)  
**Base:** `3fe72f37200df98a9afd6a5e61b19f7b29b6beea`  
**Head:** `fa9752c8` — `fix(ai-web): make admin placeholder compatible with RSC` (includes `a05ced8 feat(ai-web): add admin password login and session middleware`)  
**Brief:** `.superpowers/sdd/task-7-brief.md`  
**Report:** `.superpowers/sdd/task-7-report.md`  
**Diff:** `.superpowers/sdd/review-3fe72f3..fa9752c.diff`

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | **Approved** |
| **Critical** | 0 |
| **Important** | 0 |
| **Minor** | 3 |

---

## 1. Spec compliance: ✅

| Requirement | Verdict | Evidence |
|-------------|---------|----------|
| `adminSession.ts` with `createAdminSessionToken`, `verifyAdminSessionToken`, `timingSafeEqualString` | ✅ | `src/lib/adminSession.ts` re-exports token helpers; `timingSafeEqualString` uses length check + `crypto.timingSafeEqual` |
| JWT HS256, claim `{ role: 'admin' }`, exp 7d, secret `ADMIN_SESSION_SECRET` (≥ 32) | ✅ | `src/lib/adminSessionToken.ts` |
| Cookie name `admin_session` | ✅ | login/logout routes + middleware |
| `POST /api/admin/login` — 500 if `ADMIN_PASSWORD` unset | ✅ | `src/app/api/admin/login/route.ts` L18–22 |
| Mismatch → 401 `{ error: 'Неверный пароль' }` | ✅ | L31, L38 |
| Success → httpOnly cookie, `path=/`, `sameSite=lax`, `secure` in prod, maxAge 7d, `{ ok: true }` | ✅ | L45–51 |
| `POST /api/admin/logout` — clear cookie, `{ ok: true }` | ✅ | `src/app/api/admin/logout/route.ts` |
| Login page: Ant Design Card + Form + Input.Password + Submit | ✅ | `src/app/admin/login/page.tsx` |
| Success → `router.push('/admin')`; error → `message.error` | ✅ | L35–39 (`messageApi.error`) |
| Middleware matcher `/admin/:path*` | ✅ | `src/middleware.ts` L27–28 |
| Allow `/admin/login` without cookie | ✅ | L10, L16–17 |
| Missing/invalid session → redirect `/admin/login` | ✅ | L16–17 |
| Valid session on login → redirect `/admin` | ✅ | L20–21 |
| Commit scope `apps/ai-web/src` | ✅ | 8 files under `apps/ai-web/src` only |
| Password gate on UI | ✅ | Login form posts password to server route only |
| httpOnly session cookie | ✅ | Cookie flags on login/logout |
| Browser never sees `ADMIN_API_KEY` | ✅ | No `NEXT_PUBLIC_*`; grep `apps/ai-web/src` — no `ADMIN_API_KEY` |
| Ant Design for login UI | ✅ | `antd` components on login page (`'use client'`) |
| No Capacitor | ✅ | No Capacitor deps or references |

Brief fully satisfied. Extra `/admin/page.tsx` placeholder is outside the brief but supports the post-login redirect target.

---

## 2. Task quality: **Approved**

Auth stack is coherent and deployable. Prior **Important** (Ant Typography in RSC on `/admin`) is resolved.

### Critical

_None._

### Important

_None._ (prior finding fixed in `fa9752c`)

**Resolved:** `/admin` placeholder no longer imports Ant Design in a Server Component. Plain HTML (`h1`/`p`) with `.landing` styles matches the `/` pattern and prerenders cleanly.

### Minor

1. **`SESSION_COOKIE_NAME` duplicated** in login route, logout route, and middleware — drift risk; should be a shared constant.
2. **Middleware imports `@/lib/adminSessionToken` directly** while API routes use `@/lib/adminSession` barrel — inconsistent with the brief’s single module surface.
3. **Manual smoke not executed** (report L28) — dev redirect/login flow unverified in this session.

---

## Verification

- Read brief, report; diff `3fe72f3..fa9752c`.
- Commits: `a05ced8` (auth) + `fa9752c` (RSC fix); 8 files, +281 lines.
- Inspected `src/app/admin/page.tsx` — no `antd` import; Server Component with plain markup.
- `pnpm --filter ai-web type-check` — **PASS** (after build regenerated `.next/types`)
- `pnpm --filter ai-web build` — **PASS** (compile, lint, type-check, static generation for `/admin`)
- Grep `apps/ai-web/src` for `ADMIN_API_KEY`, `NEXT_PUBLIC`, `capacitor` — **none**

---

## Summary

Auth implementation matches the spec: timing-safe password check, HS256 JWT session in httpOnly cookie, login/logout API routes, Ant Design login UI, and middleware gate on `/admin/*`. Global constraints hold. The RSC fix removes the production build blocker; `/admin` prerenders as static content. Remaining notes are minor hygiene (shared cookie constant, import consistency) and unverified manual smoke.

**Spec compliance:** ✅  
**Task quality:** Approved
