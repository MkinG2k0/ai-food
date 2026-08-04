### Task 9: End-to-end verification checklist

**Files:** none (verification only); fix bugs if found

- [ ] **Step 1: Migrate DB**

Run: `cd apps/ai-app && pnpm exec prisma migrate deploy` (or `migrate dev`) against local `DATABASE_URL`.

- [ ] **Step 2: Start gateway + web**

```bash
pnpm dev:app
pnpm dev:web
```

- [ ] **Step 3: Verify matrix**

| Check | Expected |
|-------|----------|
| `GET http://127.0.0.1:3000/admin/stats` without key | 401 |
| Login at `:3001/admin/login` with generated password | enters dashboard |
| Change price in UI | `GET /billing/price` shows new `amountKopecks` without gateway restart |
| Search user + activate/extend/revoke | user fields update |
| `/` stub | В«РЎРєРѕСЂРѕВ» visible |
| Logged-out `/admin/pricing` | redirect login |

- [ ] **Step 4: Run automated tests**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts src/middleware/adminAuth.test.ts src/routes/admin.test.ts src/routes/billing.test.ts
pnpm --filter ai-web type-check
```

Expected: all PASS

- [ ] **Step 5: Final commit if fixes landed**

```bash
git add -A
git commit -m "fix(admin): address e2e verification findings"
```

(Skip empty commit if nothing to fix.)

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `apps/ai-web` Next.js + Ant Design | 6, 7, 8 |
| `/` stub, `/admin/*` | 6, 7, 8 |
| Password + httpOnly session | 7 |
| `ADMIN_API_KEY` serverв†’gateway | 4, 5, 8 |
| `AppSettings` + env fallback | 1, 2 |
| Async price used by billing | 3 |
| `/admin/stats|pricing|users|subscription` | 5 |
| activate / extend / revoke | 5, 8 |
| Tests for middleware/pricing/subs/stats | 4, 5 |
| `.env.example`, generate secrets | 5, 6 |
| No promo/refund/Capacitor | respected (non-goals) |
