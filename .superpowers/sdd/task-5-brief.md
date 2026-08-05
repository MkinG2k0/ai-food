### Task 5: Payments page UI

**Files:**
- Create: `apps/ai-web/src/app/admin/payments/page.tsx`

**Interfaces:**
- Consumes: `adminApi<T>(path, init?)`, gateway shapes from Tasks 1вЂ“2
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
    : 'вЂ”';

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
          ? 'РџР»Р°С‚С‘Р¶ СѓРґР°Р»С‘РЅ, РїРѕРґРїРёСЃРєР° РѕС‚РѕР·РІР°РЅР°'
          : 'РџР»Р°С‚С‘Р¶ СѓРґР°Р»С‘РЅ',
      );
    },
    onError: (error: Error) => message.error(error.message),
  });

  const columns: ColumnsType<Payment> = [
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
      title: 'РЎРѕР·РґР°РЅ',
      width: 180,
    },
    {
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatRubles(amount),
      title: 'РЎСѓРјРјР°',
      width: 140,
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (status: PaymentStatus) => (
        <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>
      ),
      title: 'РЎС‚Р°С‚СѓСЃ',
      width: 130,
    },
    {
      key: 'user',
      render: (_, payment) => (
        <Typography.Text>
          {formatUser(payment.user)}
          <Typography.Text type="secondary">
            {' '}
            В· {payment.user.telegramId}
          </Typography.Text>
        </Typography.Text>
      ),
      title: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ',
    },
    {
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: formatDate,
      title: 'РћРїР»Р°С‡РµРЅ',
      width: 180,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, payment) => (
        <Popconfirm
          cancelText="РћС‚РјРµРЅР°"
          okButtonProps={{ danger: true }}
          okText="РЈРґР°Р»РёС‚СЊ"
          onConfirm={() => deletePayment.mutate(payment.id)}
          title={
            payment.status === 'confirmed'
              ? 'РЈРґР°Р»РёС‚СЊ РїР»Р°С‚С‘Р¶ Рё РѕС‚РѕР·РІР°С‚СЊ РїРѕРґРїРёСЃРєСѓ?'
              : 'РЈРґР°Р»РёС‚СЊ РїР»Р°С‚С‘Р¶?'
          }
        >
          <Button danger loading={deletePayment.isPending} size="small">
            РЈРґР°Р»РёС‚СЊ
          </Button>
        </Popconfirm>
      ),
      title: 'Р”РµР№СЃС‚РІРёСЏ',
      width: 120,
    },
  ];

  return (
    <>
      <PageHeader
        subtitle="РЎРїРёСЃРѕРє РїР»Р°С‚РµР¶РµР№ Рё СѓРґР°Р»РµРЅРёРµ РґРµРјРѕ-Р·Р°РїРёСЃРµР№"
        title="РџР»Р°С‚РµР¶Рё"
      />
      {paymentsQuery.error ? (
        <Alert
          description={paymentsQuery.error.message}
          message="РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїР»Р°С‚РµР¶Рё"
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
            : 'РџР»Р°С‚РµР¶РµР№ РЅРµС‚',
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Р’СЃРµРіРѕ ${total}`,
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

1. Open `/admin/payments` вЂ” table shows payments.
2. Delete a `pending` payment вЂ” row gone; user subscription unchanged.
3. Delete a `confirmed` payment вЂ” row gone; user subscription revoked; Overview stats update after refresh/navigation.

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
| `DELETE` confirmed в†’ delete + revoke | Task 2 |
| `DELETE` non-confirmed в†’ delete only | Task 2 |
| 404 / 401 | Task 2 tests |
| BFF GET/DELETE proxies | Task 3 |
| Sidebar В«РџР»Р°С‚РµР¶РёВ» | Task 4 |
| Table + status-aware Popconfirm + invalidate stats | Task 5 |
| Gateway tests listed in spec | Tasks 1вЂ“2 |

## Self-review notes

- No TBD/placeholder steps.
- Status enum aligned with Prisma (`rejected`/`refunded`, not `failed`).
- DELETE 404 performed before `$transaction` to avoid Prisma swallowing `ApiError`.
- Package name for gateway filter is `openrouter-gateway` (matches workspace `apps/ai-app`).
