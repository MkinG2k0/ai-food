### Task 7: Admin session auth (login / logout / middleware)

**Files:**
- Create: `apps/ai-web/src/lib/adminSession.ts`
- Create: `apps/ai-web/src/app/admin/login/page.tsx`
- Create: `apps/ai-web/src/app/api/admin/login/route.ts`
- Create: `apps/ai-web/src/app/api/admin/logout/route.ts`
- Create: `apps/ai-web/src/middleware.ts`

**Interfaces:**
- Cookie name: `admin_session`
- Token: jose HS256 JWT, claim `{ role: 'admin' }`, exp 7d, secret `ADMIN_SESSION_SECRET`
- `export async function createAdminSessionToken(): Promise<string>`
- `export async function verifyAdminSessionToken(token: string): Promise<boolean>`
- `export function timingSafeEqualString(a: string, b: string): boolean`

- [ ] **Step 1: Implement `adminSession.ts`**

Use `jose` `SignJWT` / `jwtVerify` with `ADMIN_SESSION_SECRET` (min length check в‰Ґ 32). Timing-safe password compare via `crypto.timingSafeEqual` on equal-length buffers (if lengths differ в†’ false).

- [ ] **Step 2: Login API**

`POST /api/admin/login` JSON `{ password: string }`:
- If `ADMIN_PASSWORD` unset в†’ 500
- If mismatch в†’ 401 `{ error: 'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ' }`
- Else set httpOnly cookie `admin_session`, `path=/`, `sameSite=lax`, `secure` in production, maxAge 7d; return `{ ok: true }`

- [ ] **Step 3: Logout API**

`POST /api/admin/logout` вЂ” clear cookie; `{ ok: true }`

- [ ] **Step 4: Login page**

Client component: Ant Design `Card` + `Form` + `Input.Password` + Submit. On success `router.push('/admin')`. On error show `message.error`.

- [ ] **Step 5: Next middleware**

Matcher: `/admin/:path*`.

Logic:
- Allow `/admin/login` without cookie
- If cookie missing/invalid and path в‰  login в†’ redirect `/admin/login`
- If valid cookie and path is login в†’ redirect `/admin`

- [ ] **Step 6: Manual smoke**

Run: `pnpm --filter ai-web dev` в†’ open `http://localhost:3001/admin` в†’ redirect login в†’ password works.

- [ ] **Step 7: Commit**

```bash
git add apps/ai-web/src
git commit -m "feat(ai-web): add admin password login and session middleware"
```

---
