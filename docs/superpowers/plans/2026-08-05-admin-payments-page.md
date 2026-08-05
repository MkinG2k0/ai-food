# Admin Payments Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin «Платежи» page that lists payments and hard-deletes them, revoking the user's subscription when the deleted payment was `confirmed`.

**Architecture:** Extend gateway `/admin` with `GET/DELETE /admin/payments`; proxy through existing `ai-web` BFF (`proxyGatewayAdmin`); new `/admin/payments` page + sidebar entry, matching Subscriptions Table/Popconfirm patterns.

**Tech Stack:** Express + Prisma + Vitest/Supertest (`ai-app`); Next.js 15 App Router, Ant Design 5, TanStack Query (`ai-web`); pnpm.

**Spec:** `docs/superpowers/specs/2026-08-05-admin-payments-page-design.md`

## Global Constraints

- Follow existing admin auth: gateway `X-Admin-Key` via `requireAdminKey`; BFF session cookie + `ADMIN_API_KEY`.
- Payment statuses: `pending` | `confirmed` | `rejected` | `refunded` (Prisma `PaymentStatus`).
- Delete confirmed → hard-delete payment **and** set user `subscriptionStatus: 'none'`, `subscriptionExpiresAt: null` in one transaction.
- Delete non-confirmed → hard-delete payment only; leave subscription untouched.
- List: `orderBy: { createdAt: 'desc' }`, `take: 50`, include user display fields.
- No filters/search/bulk-delete/T-Bank refund in this plan.
- UI copy in Russian; Ant Design dark theme already in place — reuse existing components/styles.
- Verification: `pnpm --filter openrouter-gateway test` for API; `pnpm --filter ai-web type-check` for UI.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/routes/admin.ts` | `GET /payments`, `DELETE /payments/:id` |
| `apps/ai-app/src/routes/admin.test.ts` | Tests for list/delete/revoke/auth |
| `apps/ai-web/src/app/api/admin/gateway/payments/route.ts` | BFF GET proxy |
| `apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts` | BFF DELETE proxy |
| `apps/ai-web/src/components/AdminShell.tsx` | Nav item + header title |
| `apps/ai-web/src/app/admin/payments/page.tsx` | Payments table + delete UI |

---

### Task 1: Gateway `GET /admin/payments`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `requireDb()`, existing `requireAdminKey` on router
- Produces: `GET /admin/payments` → `{ payments: PaymentListItem[] }` where each item has `id`, `amount`, `status`, `paidAt`, `createdAt`, `tbankPaymentId`, `tbankOrderId`, `user: { id, telegramId, username, firstName, lastName }`

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

- [ ] **Step 2: Run tests — expect FAIL**

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

- [ ] **Step 4: Run tests — expect PASS for GET cases**

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

### Task 2: Gateway `DELETE /admin/payments/:id`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `paymentResponse` helper from Task 1 (optional), `requireDb()`, mock `payment.delete` / `user.update` / `$transaction`
- Produces: `DELETE /admin/payments/:id` → `{ ok: true, revokedSubscription: boolean }`

- [ ] **Step 1: Write failing DELETE tests**

Append to `admin.test.ts`:

```ts
it('DELETE /admin/payments/:id deletes confirmed payment and revokes subscription', async () => {
  const response = await request(createApp())
    .delete('/admin/payments/pay-confirmed')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, revokedSubscription: true });
  expect(payments.find((p) => p.id === 'pay-confirmed')).toBeUndefined();
  expect(users.find((u) => u.id === 'user-2')).toMatchObject({
    subscriptionStatus: 'none',
    subscriptionExpiresAt: null,
  });
});

it('DELETE /admin/payments/:id deletes pending payment without revoking', async () => {
  const before = users.find((u) => u.id === 'user-1')!;
  const response = await request(createApp())
    .delete('/admin/payments/pay-pending')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, revokedSubscription: false });
  expect(payments.find((p) => p.id === 'pay-pending')).toBeUndefined();
  expect(users.find((u) => u.id === 'user-1')).toEqual(before);
});

it('DELETE /admin/payments/:id returns 404 for missing payment', async () => {
  const response = await request(createApp())
    .delete('/admin/payments/missing')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(404);
  expect(response.body.code).toBe('NOT_FOUND');
});

it('DELETE /admin/payments/:id rejects requests without admin key', async () => {
  const response = await request(createApp()).delete(
    '/admin/payments/pay-pending',
  );
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: FAIL on DELETE cases (404 / missing route).

- [ ] **Step 3: Implement `DELETE /admin/payments/:id`**

Append to `apps/ai-app/src/routes/admin.ts`:

```ts
adminRouter.delete(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const paymentId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new ApiError(404, 'NOT_FOUND', 'Payment not found.');
      }

      await tx.payment.delete({ where: { id: payment.id } });

      const revokedSubscription = payment.status === 'confirmed';
      if (revokedSubscription) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'none',
            subscriptionExpiresAt: null,
          },
        });
      }

      return { ok: true as const, revokedSubscription };
    });

    res.json(result);
  }),
);
```

Note: if `ApiError` thrown inside `$transaction` is not rethrown cleanly by Prisma in this codebase, catch after findUnique outside the transaction instead — preferred equivalent:

```ts
adminRouter.delete(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });
    if (!payment) {
      throw new ApiError(404, 'NOT_FOUND', 'Payment not found.');
    }

    const revokedSubscription = payment.status === 'confirmed';

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: payment.id } });
      if (revokedSubscription) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'none',
            subscriptionExpiresAt: null,
          },
        });
      }
    });

    res.json({ ok: true, revokedSubscription });
  }),
);
```

Use the **second** (preferred) form so 404 stays outside the transaction.

- [ ] **Step 4: Run full admin tests — expect PASS**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(ai-app): delete admin payments and revoke on confirmed

EOF
)"
```

---

### Task 3: BFF proxy routes for payments

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/payments/route.ts`
- Create: `apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin(path, init?)` from `@/lib/gatewayAdmin`
- Produces: `GET /api/admin/gateway/payments` → gateway list; `DELETE /api/admin/gateway/payments/:id` → gateway delete
- Client helper already used: `adminApi('payments')` and `adminApi('payments/' + id, { method: 'DELETE' })`

- [ ] **Step 1: Create list proxy**

Create `apps/ai-web/src/app/api/admin/gateway/payments/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('payments');
}
```

- [ ] **Step 2: Create delete proxy**

Create `apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(`payments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
```

- [ ] **Step 3: Type-check**

Run:

```bash
pnpm --filter ai-web type-check
```

Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/payments/route.ts apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): proxy admin payments list and delete

EOF
)"
```

---

### Task 4: Sidebar nav entry «Платежи»

**Files:**
- Modify: `apps/ai-web/src/components/AdminShell.tsx`

**Interfaces:**
- Produces: menu key `/admin/payments`, label «Платежи», header title «Платежи»
- Consumes: existing `menuItems` / `pageTitles` pattern

- [ ] **Step 1: Update AdminShell menu and titles**

In `apps/ai-web/src/components/AdminShell.tsx`:

1. Add import `WalletOutlined` from `@ant-design/icons` (keep `CreditCardOutlined` for Подписки).
2. Insert menu item between «Цены» and «Подписки»:

```tsx
const menuItems = [
  { icon: <BarChartOutlined />, key: '/admin', label: 'Обзор' },
  { icon: <TagsOutlined />, key: '/admin/pricing', label: 'Цены' },
  { icon: <WalletOutlined />, key: '/admin/payments', label: 'Платежи' },
  {
    icon: <CreditCardOutlined />,
    key: '/admin/subscriptions',
    label: 'Подписки',
  },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Обзор',
  '/admin/pricing': 'Цены',
  '/admin/payments': 'Платежи',
  '/admin/subscriptions': 'Подписки',
};
```

- [ ] **Step 2: Type-check**

Run:

```bash
pnpm --filter ai-web type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/components/AdminShell.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add Платежи nav item to admin shell

EOF
)"
```

---

### Task 5: Payments page UI

**Files:**
- Create: `apps/ai-web/src/app/admin/payments/page.tsx`

**Interfaces:**
- Consumes: `adminApi<T>(path, init?)`, gateway shapes from Tasks 1–2
- Produces: `/admin/payments` client page with table + delete Popconfirm

- [ ] **Step 1: Create the page**

Create `apps/ai-web/src/app/admin/payments/page.tsx`:

```tsx
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  App,
  Button,
  Popconfirm,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded';

type PaymentUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Payment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  tbankPaymentId: string | null;
  tbankOrderId: string;
  user: PaymentUser;
};

type PaymentsResponse = {
  payments: Payment[];
};

type DeleteResponse = {
  ok: true;
  revokedSubscription: boolean;
};

const statusColor: Record<PaymentStatus, string> = {
  pending: 'processing',
  confirmed: 'success',
  rejected: 'error',
  refunded: 'warning',
};

const statusLabel: Record<PaymentStatus, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  rejected: 'rejected',
  refunded: 'refunded',
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

const formatUser = (user: PaymentUser) => {
  if (user.username) return `@${user.username}`;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.telegramId;
};

export default function PaymentsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: () => adminApi<PaymentsResponse>('payments'),
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) =>
      adminApi<DeleteResponse>(`payments/${encodeURIComponent(paymentId)}`, {
        method: 'DELETE',
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      message.success(
        result.revokedSubscription
          ? 'Платёж удалён, подписка отозвана'
          : 'Платёж удалён',
      );
    },
    onError: (error: Error) => message.error(error.message),
  });

  const columns: ColumnsType<Payment> = [
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
      title: 'Создан',
      width: 180,
    },
    {
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatRubles(amount),
      title: 'Сумма',
      width: 140,
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (status: PaymentStatus) => (
        <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>
      ),
      title: 'Статус',
      width: 130,
    },
    {
      key: 'user',
      render: (_, payment) => (
        <Typography.Text>
          {formatUser(payment.user)}
          <Typography.Text type="secondary">
            {' '}
            · {payment.user.telegramId}
          </Typography.Text>
        </Typography.Text>
      ),
      title: 'Пользователь',
    },
    {
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: formatDate,
      title: 'Оплачен',
      width: 180,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, payment) => (
        <Popconfirm
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
          okText="Удалить"
          onConfirm={() => deletePayment.mutate(payment.id)}
          title={
            payment.status === 'confirmed'
              ? 'Удалить платёж и отозвать подписку?'
              : 'Удалить платёж?'
          }
        >
          <Button danger loading={deletePayment.isPending} size="small">
            Удалить
          </Button>
        </Popconfirm>
      ),
      title: 'Действия',
      width: 120,
    },
  ];

  return (
    <>
      <PageHeader
        subtitle="Список платежей и удаление демо-записей"
        title="Платежи"
      />
      {paymentsQuery.error ? (
        <Alert
          description={paymentsQuery.error.message}
          message="Не удалось загрузить платежи"
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Table<Payment>
        columns={columns}
        dataSource={paymentsQuery.data?.payments ?? []}
        loading={paymentsQuery.isLoading}
        locale={{
          emptyText: paymentsQuery.error
            ? paymentsQuery.error.message
            : 'Платежей нет',
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего ${total}`,
        }}
        rowKey="id"
        scroll={{ x: 960 }}
        size="middle"
      />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
pnpm --filter ai-web type-check
```

Expected: PASS.

- [ ] **Step 3: Manual smoke (optional if gateway+web running)**

1. Open `/admin/payments` — table shows payments.
2. Delete a `pending` payment — row gone; user subscription unchanged.
3. Delete a `confirmed` payment — row gone; user subscription revoked; Overview stats update after refresh/navigation.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/payments/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add admin payments list and delete page

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `GET /admin/payments` list take 50 + user fields | Task 1 |
| `DELETE` confirmed → delete + revoke | Task 2 |
| `DELETE` non-confirmed → delete only | Task 2 |
| 404 / 401 | Task 2 tests |
| BFF GET/DELETE proxies | Task 3 |
| Sidebar «Платежи» | Task 4 |
| Table + status-aware Popconfirm + invalidate stats | Task 5 |
| Gateway tests listed in spec | Tasks 1–2 |

## Self-review notes

- No TBD/placeholder steps.
- Status enum aligned with Prisma (`rejected`/`refunded`, not `failed`).
- DELETE 404 performed before `$transaction` to avoid Prisma swallowing `ApiError`.
- Package name for gateway filter is `openrouter-gateway` (matches workspace `apps/ai-app`).
