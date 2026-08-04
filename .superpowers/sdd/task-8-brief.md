### Task 8: Gateway client + admin shell + pages

**Files:**
- Create: `apps/ai-web/src/lib/gatewayAdmin.ts`
- Create: `apps/ai-web/src/app/api/admin/proxy/[...path]/route.ts` (optional BFF) **OR** server actions
- Create: `apps/ai-web/src/app/admin/layout.tsx`
- Create: `apps/ai-web/src/app/admin/page.tsx` (stats)
- Create: `apps/ai-web/src/app/admin/pricing/page.tsx`
- Create: `apps/ai-web/src/app/admin/subscriptions/page.tsx`
- Create: `apps/ai-web/src/components/AdminProviders.tsx` (QueryClient + Antd App)

**Preferred BFF pattern (keeps `ADMIN_API_KEY` server-only):**

Route handlers under `src/app/api/admin/gateway/`:
- `GET stats` в†’ gateway `GET /admin/stats`
- `GET/PUT pricing`
- `GET users?q=`
- `POST users/[id]/subscription`

Each handler: verify session cookie first; then `fetch(`${AI_GATEWAY_URL}/admin/...`, { headers: { 'X-Admin-Key': process.env.ADMIN_API_KEY!, 'Content-Type': 'application/json' } })`.

`gatewayAdmin.ts` helpers used by those route handlers.

- [ ] **Step 1: Implement server gateway helpers + BFF routes**

- [ ] **Step 2: Admin layout**

Ant Design `Layout` with `Sider` menu items:
- `/admin` вЂ” РћР±Р·РѕСЂ
- `/admin/pricing` вЂ” Р¦РµРЅС‹
- `/admin/subscriptions` вЂ” РџРѕРґРїРёСЃРєРё  

Header button В«Р’С‹Р№С‚РёВ» в†’ `POST /api/admin/logout` в†’ `/admin/login`.

- [ ] **Step 3: Stats page**

Fetch `/api/admin/gateway/stats`, show `Row`/`Col` of `Statistic` cards matching API fields. Format payment sum as rubles (`sum/100`).

- [ ] **Step 4: Pricing page**

Load pricing; form fields: price in **rubles** (convert Г—100 on save), duration days; show `Tag` with `source`. Save via PUT; `message.success`.

- [ ] **Step 5: Subscriptions page**

Search input в†’ table of users в†’ actions:
- Activate (optional days Modal, default empty = server default)
- Extend (Modal required days)
- Revoke (`Popconfirm`)

- [ ] **Step 6: type-check**

Run: `pnpm --filter ai-web type-check`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/ai-web
git commit -m "feat(ai-web): admin dashboard for stats pricing and subscriptions"
```

---
