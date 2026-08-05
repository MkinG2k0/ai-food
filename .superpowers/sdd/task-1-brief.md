### Task 1: Gateway `GET /admin/payments`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `requireDb()`, existing `requireAdminKey` on router
- Produces: `GET /admin/payments` в†’ `{ payments: PaymentListItem[] }` where each item has `id`, `amount`, `status`, `paidAt`, `createdAt`, `tbankPaymentId`, `tbankOrderId`, `user: { id, telegramId, username, firstName, lastName }`

- [ ] **Step 1: Extend mock prisma + add failing GET test**

In `apps/ai-app/src/routes/admin.test.ts`, inside `createMockPrisma`, extend `payment` and add `$transaction` + in-memory payments store.

Add near the top of the `describe` (alongside `users` / `settings`):

```ts
type MockPayment = {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  tbankPaymentId: string | null;
  tbankOrderId: string;
  paidAt: Date | null;
  createdAt: Date;
};

let payments: MockPayment[];
```

In `createMockPrisma`, replace the `payment` block and add `$transaction`:

```ts
payment: {
  aggregate: vi.fn(async () => ({
    _count: 3,
    _sum: { amount: 45_000 },
  })),
  findMany: vi.fn(
    async ({
      include,
      orderBy,
      take,
    }: {
      include?: { user?: { select: Record<string, boolean> } };
      orderBy?: { createdAt: 'desc' | 'asc' };
      take?: number;
    } = {}) => {
      const sorted = [...payments].sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const sliced = typeof take === 'number' ? sorted.slice(0, take) : sorted;
      return sliced.map((payment) => {
        const user = users.find((u) => u.id === payment.userId);
        if (!include?.user || !user) return payment;
        return {
          ...payment,
          user: {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        };
      });
    },
  ),
  findUnique: vi.fn(
    async ({ where }: { where: { id: string } }) =>
      payments.find((p) => p.id === where.id) ?? null,
  ),
  delete: vi.fn(async ({ where }: { where: { id: string } }) => {
    const index = payments.findIndex((p) => p.id === where.id);
    if (index < 0) throw new Error('Payment not found');
    const [removed] = payments.splice(index, 1);
    return removed;
  }),
},
$transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
  fn(prisma),
),
```

In `beforeEach`, initialize:

```ts
payments = [
  {
    id: 'pay-confirmed',
    userId: 'user-2',
    amount: 90_000,
    status: 'confirmed',
    tbankPaymentId: 'tb-1',
    tbankOrderId: 'pay-confirmed',
    paidAt: new Date('2026-08-01T12:00:00.000Z'),
    createdAt: new Date('2026-08-01T11:00:00.000Z'),
  },
  {
    id: 'pay-pending',
    userId: 'user-1',
    amount: 90_000,
    status: 'pending',
    tbankPaymentId: null,
    tbankOrderId: 'pay-pending',
    paidAt: null,
    createdAt: new Date('2026-08-02T11:00:00.000Z'),
  },
];
```

Add test at end of `describe` (before closing):

```ts
it('GET /admin/payments returns payments with user fields', async () => {
  const response = await request(createApp())
    .get('/admin/payments')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body.payments).toHaveLength(2);
  expect(response.body.payments[0].id).toBe('pay-pending');
  expect(response.body.payments[0].user).toEqual({
    id: 'user-1',
    telegramId: '1001',
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Admin',
  });
  expect(response.body.payments[1].status).toBe('confirmed');
});

it('GET /admin/payments rejects requests without admin key', async () => {
  const response = await request(createApp()).get('/admin/payments');
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: FAIL (404 or missing route for `/admin/payments`).

- [ ] **Step 3: Implement `GET /admin/payments`**

Append to `apps/ai-app/src/routes/admin.ts` (after `/stats` or before `/users` is fine; after `userResponse` helpers stay as-is):

```ts
function paymentResponse(payment: {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  paidAt: Date | null;
  createdAt: Date;
  tbankPaymentId: string | null;
  tbankOrderId: string;
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return {
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    tbankPaymentId: payment.tbankPaymentId,
    tbankOrderId: payment.tbankOrderId,
    user: {
      id: payment.user.id,
      telegramId: payment.user.telegramId,
      username: payment.user.username,
      firstName: payment.user.firstName,
      lastName: payment.user.lastName,
    },
  };
}

adminRouter.get(
  '/payments',
  asyncHandler(async (_req, res) => {
    const prisma = requireDb();
    const payments = await prisma.payment.findMany({
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
    res.json({ payments: payments.map(paymentResponse) });
  }),
);
```

- [ ] **Step 4: Run tests вЂ” expect PASS for GET cases**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: existing tests + new GET tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(ai-app): add admin GET /payments list

EOF
)"
```

---

