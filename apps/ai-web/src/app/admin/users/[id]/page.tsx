'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

type AdminUser = {
  id: string;
  isGuest?: boolean;
  deviceId?: string | null;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
  dataConsentAt: string | null;
  dataConsentVersion: string | null;
  createdAt?: string;
};

type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded';

type Payment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  tbankPaymentId: string | null;
  tbankOrderId: string;
};

type UsageEvent = {
  id: string;
  kind: string;
  deviceId: string;
  createdAt: string;
};

type UserDetailResponse = {
  user: AdminUser;
  usageCounts: UsageCounts;
  payments: Payment[];
  recentEvents: UsageEvent[];
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

const usageLabels: Record<keyof UsageCounts, string> = {
  analyze_photo: 'Фото',
  analyze_text: 'Текст',
  analyze_photo_text: 'Фото + текст',
  refine: 'Уточнения',
  manual: 'Ручной ввод',
  barcode: 'Штрихкоды',
  analyze: 'Legacy',
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const userQuery = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () =>
      adminApi<UserDetailResponse>(`users/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });

  const paymentColumns: ColumnsType<Payment> = [
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
      width: 140,
    },
    {
      dataIndex: 'tbankOrderId',
      key: 'tbankOrderId',
      title: 'ID заказа',
    },
    {
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: formatDate,
      title: 'Оплачен',
      width: 180,
    },
  ];

  const eventColumns: ColumnsType<UsageEvent> = [
    {
      dataIndex: 'kind',
      key: 'kind',
      title: 'Тип',
    },
    {
      dataIndex: 'deviceId',
      key: 'deviceId',
      title: 'Device ID',
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
      title: 'Создано',
      width: 180,
    },
  ];

  const data = userQuery.data;
  const user = data?.user;
  const isGuest = Boolean(user?.isGuest);
  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <>
      <PageHeader
        extra={
          <Button onClick={() => router.push('/admin/users')}>К списку</Button>
        }
        subtitle={
          user
            ? isGuest
              ? user.deviceId || user.id
              : name || user.username || user.telegramId
            : 'Карточка аккаунта'
        }
        title={isGuest ? 'Гость' : 'Пользователь'}
      />
      {userQuery.error ? (
        <Alert
          description={userQuery.error.message}
          message="Не удалось загрузить пользователя"
          showIcon
          type="error"
        />
      ) : null}
      <Card loading={userQuery.isLoading} title="Профиль">
        {user ? (
          <Descriptions bordered column={{ lg: 2, md: 2, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Пользователь">
              <Avatar src={user.photoUrl ?? undefined} style={{ marginRight: 8 }}>
                {(user.firstName || user.username || '?').slice(0, 1)}
              </Avatar>
              {name || (isGuest ? 'Гость' : 'Без имени')}
              {isGuest ? (
                <Tag style={{ marginLeft: 8 }}>Без входа</Tag>
              ) : null}
            </Descriptions.Item>
            {isGuest ? (
              <Descriptions.Item label="Device ID">
                {user.deviceId || '—'}
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Username">
                {user.username ? `@${user.username}` : '—'}
              </Descriptions.Item>
            )}
            {isGuest ? (
              <Descriptions.Item label="Telegram ID">—</Descriptions.Item>
            ) : (
              <Descriptions.Item label="Telegram ID">
                {user.telegramId}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Внутренний ID">
              {user.id}
            </Descriptions.Item>
            <Descriptions.Item label="Подписка">
              {isGuest ? (
                <Tag>Гость</Tag>
              ) : (
                <>
                  <Tag
                    color={user.hasActiveSubscription ? 'success' : 'default'}
                  >
                    {user.hasActiveSubscription ? 'Активна' : 'Не активна'}
                  </Tag>
                  до {formatDate(user.subscriptionExpiresAt)}
                </>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Согласие">
              {user.dataConsentAt
                ? `Да, ${formatDate(user.dataConsentAt)} (${user.dataConsentVersion ?? 'версия не указана'})`
                : 'Нет'}
            </Descriptions.Item>
            <Descriptions.Item label="Создан">
              {formatDate(user.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Card>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Статистика генераций
        </Typography.Title>
        <Row gutter={[16, 16]}>
          {(Object.keys(usageLabels) as Array<keyof UsageCounts>).map(
            (kind) => (
              <Col key={kind} lg={6} md={8} sm={12} xs={24}>
                <Card className="admin-stat-card" size="small">
                  <Statistic
                    loading={userQuery.isLoading}
                    title={usageLabels[kind]}
                    value={data?.usageCounts[kind] ?? 0}
                  />
                </Card>
              </Col>
            ),
          )}
        </Row>
      </div>

      {!isGuest ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Платежи
          </Typography.Title>
          <Table<Payment>
            columns={paymentColumns}
            dataSource={data?.payments ?? []}
            loading={userQuery.isLoading}
            locale={{ emptyText: 'Платежей нет' }}
            pagination={{ pageSize: 10 }}
            rowKey="id"
            scroll={{ x: 900 }}
            size="middle"
          />
        </div>
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Последние события
        </Typography.Title>
        <Table<UsageEvent>
          columns={eventColumns}
          dataSource={data?.recentEvents ?? []}
          loading={userQuery.isLoading}
          locale={{ emptyText: 'Событий нет' }}
          pagination={{ pageSize: 10 }}
          rowKey="id"
          scroll={{ x: 700 }}
          size="middle"
        />
      </div>
    </>
  );
}
