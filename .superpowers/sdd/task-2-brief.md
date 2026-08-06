### Task 2: Gateway `GET /admin/stats/series`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `buildAdminStatsSeries`, `clampSeriesDays` from `../lib/adminStatsSeries.js`; `requireDb()`; Prisma `user.findMany`, `payment.findMany`, `usageEvent.findMany`
- Produces: `GET /admin/stats/series?days=30` → `AdminStatsSeriesResponse` JSON

- [ ] **Step 1: Extend mock prisma for series fetches + add failing route test**

In `apps/ai-app/src/routes/admin.test.ts`:

1. Extend `user.findMany` so when `select: { createdAt: true }` (or equivalent), return `users.map(u => ({ createdAt: u.createdAt }))`. Keep existing behavior for other callers if needed — inspect current `findMany` usages; simplest: implement filtering by returning full users and let route map, OR make findMany return based on `select`.

Recommended mock change for `user.findMany`:

```ts
findMany: vi.fn(async (args: { select?: { createdAt?: boolean }; where?: unknown } = {}) => {
  if (args.select?.createdAt) {
    return users.map((u) => ({ createdAt: u.createdAt }));
  }
  // existing list behavior used by GET /admin/users — keep as today
  return [users[0]];
}),
```

2. Extend `payment.findMany` to honor `where: { status: 'confirmed' }` and `select: { amount, paidAt, createdAt }` — return matching payments (already has findMany; add status filter):

```ts
// inside findMany filter:
const filtered = payments.filter((payment) => {
  if (where?.userId && payment.userId !== where.userId) return false;
  if (where?.status && payment.status !== where.status) return false;
  return true;
});
```

Update the `where` type to include `status?: string`.

3. Extend `usageEvent.findMany` (if missing) to return `usageEvents` filtered by `createdAt.gte` when provided; with `select: { kind, createdAt }`.

Find existing `usageEvent` mock block and ensure `findMany` exists:

```ts
findMany: vi.fn(
  async ({
    where,
    select,
  }: {
    where?: { createdAt?: { gte?: Date } };
    select?: { kind?: boolean; createdAt?: boolean };
  } = {}) => {
    let rows = usageEvents;
    if (where?.createdAt?.gte) {
      const gte = where.createdAt.gte;
      rows = rows.filter((e) => e.createdAt >= gte);
    }
    if (select) {
      return rows.map((e) => ({
        kind: e.kind,
        createdAt: e.createdAt,
      }));
    }
    return rows;
  },
),
```

4. Add test after the existing `/admin/stats` tests:

```ts
it('GET /admin/stats/series returns day series shape', async () => {
  const response = await request(createApp())
    .get('/admin/stats/series?days=7')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body.days).toBe(7);
  expect(response.body.series.users).toHaveLength(7);
  expect(response.body.series.payments).toHaveLength(7);
  expect(response.body.series.usage).toHaveLength(7);
  expect(response.body.series.users[0]).toEqual(
    expect.objectContaining({
      date: expect.any(String),
      new: expect.any(Number),
      total: expect.any(Number),
    }),
  );
});

it('GET /admin/stats/series requires admin key', async () => {
  const response = await request(createApp()).get('/admin/stats/series');
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run route test — expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts -t "stats/series"`

Expected: FAIL (404 / missing route)

- [ ] **Step 3: Implement route**

In `apps/ai-app/src/routes/admin.ts`, add imports:

```ts
import {
  buildAdminStatsSeries,
  clampSeriesDays,
} from '../lib/adminStatsSeries.js';
```

Add handler **after** existing `GET /stats` block:

```ts
adminRouter.get(
  '/stats/series',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const days = clampSeriesDays(req.query.days);
    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [userRows, paymentRows, usageRows] = await Promise.all([
      prisma.user.findMany({ select: { createdAt: true } }),
      prisma.payment.findMany({
        where: { status: 'confirmed' },
        select: { amount: true, paidAt: true, createdAt: true },
      }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { kind: true, createdAt: true },
      }),
    ]);

    res.json(
      buildAdminStatsSeries({
        days,
        now,
        userCreatedAts: userRows.map((u) => u.createdAt),
        payments: paymentRows.map((p) => ({
          amount: p.amount,
          at: p.paidAt ?? p.createdAt,
        })),
        usageEvents: usageRows.map((e) => ({
          kind: e.kind,
          at: e.createdAt,
        })),
      }),
    );
  }),
);
```

Note: users/payments load all rows for absolute cumulative base (admin-scale OK per spec). Usage only needs window (and builder ignores out-of-window).

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts src/lib/adminStatsSeries.test.ts`

Expected: PASS (including existing `/admin/stats` tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): expose GET /admin/stats/series

EOF
)"
```

---

