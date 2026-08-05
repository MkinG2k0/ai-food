### Task 5: Admin users aggregates + detail + stats

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Produces empty counts helper:

```ts
export type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

function emptyUsageCounts(): UsageCounts {
  return {
    analyze_photo: 0,
    analyze_text: 0,
    analyze_photo_text: 0,
    refine: 0,
    manual: 0,
    barcode: 0,
    analyze: 0,
  };
}
```

- `userResponse` adds `dataConsentAt`, `dataConsentVersion`, `photoUrl?` (optional for list вЂ” include if already on model)
- `GET /admin/users` в†’ `{ users: Array<userResponse & { usageCounts: UsageCounts }> }`
- `GET /admin/users/:id` в†’ `{ user, usageCounts, payments, recentEvents }`
- Stats: analyze counts use `kind: { startsWith: 'analyze' }`

**Note:** Register `GET /users/:id` **before** `POST /users/:id/subscription` is fine (different methods); do not shadow subscription route.

- [ ] **Step 1: Failing admin tests**

Extend mock prisma with `usageEvent.groupBy`, `usageEvent.findMany`, consent fields on users.

```ts
it('GET /admin/users includes usageCounts and consent', async () => { /* ... */ });
it('GET /admin/users/:id returns payments and recentEvents', async () => { /* ... */ });
it('GET /admin/users/:id 404', async () => { /* ... */ });
it('GET /admin/stats counts analyze* prefix', async () => { /* mock count where startsWith */ });
```

- [ ] **Step 2: Run вЂ” FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts`

- [ ] **Step 3: Implement**

Update `userResponse`:

```ts
function userResponse(user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl?: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
  dataConsentAt?: Date | null;
  dataConsentVersion?: string | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl ?? null,
    dataConsentAt: user.dataConsentAt?.toISOString() ?? null,
    dataConsentVersion: user.dataConsentVersion ?? null,
    createdAt: user.createdAt?.toISOString() ?? undefined,
    ...subscriptionPublicFields(user),
  };
}

async function usageCountsForUserIds(
  prisma: ReturnType<typeof requireDb>,
  userIds: string[],
): Promise<Map<string, UsageCounts>> {
  const map = new Map<string, UsageCounts>();
  for (const id of userIds) map.set(id, emptyUsageCounts());
  if (userIds.length === 0) return map;
  const rows = await prisma.usageEvent.groupBy({
    by: ['userId', 'kind'],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  });
  for (const row of rows) {
    if (!row.userId) continue;
    const counts = map.get(row.userId) ?? emptyUsageCounts();
    if (row.kind in counts) {
      counts[row.kind as keyof UsageCounts] = row._count._all;
    }
    map.set(row.userId, counts);
  }
  return map;
}
```

List handler: after findMany, `usageCountsForUserIds`, map users with counts + include `createdAt`/`photoUrl`/`dataConsent*` in select (findMany returns full model by default).

Detail:

```ts
adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    const countsMap = await usageCountsForUserIds(prisma, [user.id]);
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    const recentEvents = await prisma.usageEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        deviceId: true,
        createdAt: true,
      },
    });
    // map deviceId (DB row id) вЂ” optionally join Device.deviceId client string:
    // prefer include device: { select: { deviceId: true } } and expose clientDeviceId
    res.json({
      user: userResponse(user),
      usageCounts: countsMap.get(user.id) ?? emptyUsageCounts(),
      payments: payments.map(paymentResponse),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        kind: e.kind,
        deviceId: e.deviceId,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }),
);
```

Prefer `include: { device: { select: { deviceId: true } } }` and return `deviceId: e.device.deviceId` (client id) in recentEvents.

Stats analyze counts:

```ts
prisma.usageEvent.count({
  where: { kind: { startsWith: 'analyze' }, createdAt: { gte: last7Days } },
}),
```

- [ ] **Step 4: Run вЂ” PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "feat(ai-app): admin users usage counts and detail"
```

---

