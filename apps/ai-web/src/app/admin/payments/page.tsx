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
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  rejected: 'Отклонён',
  refunded: 'Возвращён',
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
