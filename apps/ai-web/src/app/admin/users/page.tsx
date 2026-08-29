'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Checkbox,
  Flex,
  Input,
  InputNumber,
  Space,
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
  usageCounts: UsageCounts;
};

type UsersResponse = {
  users: AdminUser[];
};

const DEFAULT_COST_PER_GENERATION = 0.32;
const PRIVATE_MASK = '••••••';

/** AI-billable generations: photo + text + photo+text + refine (без ручного/ШК/legacy). */
function aiGenerationTotal(counts: UsageCounts): number {
  return (
    counts.analyze_photo +
    counts.analyze_text +
    counts.analyze_photo_text +
    counts.refine
  );
}

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);

export default function UsersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [privateMode, setPrivateMode] = useState(false);
  const [costPerGeneration, setCostPerGeneration] = useState(
    DEFAULT_COST_PER_GENERATION,
  );
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () =>
      adminApi<UsersResponse>(`users?q=${encodeURIComponent(query)}`),
  });

  const rate =
    typeof costPerGeneration === 'number' && Number.isFinite(costPerGeneration)
      ? Math.max(0, costPerGeneration)
      : DEFAULT_COST_PER_GENERATION;

  const columns: ColumnsType<AdminUser> = useMemo(
    () => [
      {
        key: 'name',
        render: (_, user) => {
          if (privateMode) {
            return (
              <Space size={8}>
                <Typography.Text strong>{PRIVATE_MASK}</Typography.Text>
                {user.isGuest ? <Tag>Гость</Tag> : null}
              </Space>
            );
          }
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
          return (
            <Space size={8}>
              <Typography.Text strong>
                {name || user.username || 'Без имени'}
              </Typography.Text>
              {user.isGuest ? <Tag>Гость</Tag> : null}
            </Space>
          );
        },
        title: 'Имя',
        width: 200,
      },
      {
        dataIndex: 'username',
        key: 'username',
        render: (username: string | null) =>
          privateMode
            ? PRIVATE_MASK
            : username
              ? `@${username}`
              : '—',
        title: 'Username',
        width: 160,
      },
      {
        key: 'telegramId',
        render: (_, user) =>
          privateMode
            ? PRIVATE_MASK
            : user.isGuest
              ? user.deviceId || '—'
              : user.telegramId || '—',
        title: 'Telegram / Device',
        width: 180,
      },
      {
        key: 'subscription',
        render: (_, user) =>
          user.isGuest ? (
            <Tag>Гость</Tag>
          ) : (
            <Tag color={user.hasActiveSubscription ? 'success' : 'default'}>
              {user.hasActiveSubscription ? 'Активна' : 'Не активна'}
            </Tag>
          ),
        title: 'Подписка',
        width: 130,
      },
      {
        key: 'aiTotal',
        defaultSortOrder: 'descend',
        render: (_, user) => (
          <Typography.Text strong>
            {aiGenerationTotal(user.usageCounts)}
          </Typography.Text>
        ),
        sorter: (a, b) =>
          aiGenerationTotal(a.usageCounts) - aiGenerationTotal(b.usageCounts),
        title: 'Лимит потрачен',
        width: 130,
      },
      {
        key: 'aiCost',
        render: (_, user) =>
          formatRub(aiGenerationTotal(user.usageCounts) * rate),
        sorter: (a, b) =>
          aiGenerationTotal(a.usageCounts) - aiGenerationTotal(b.usageCounts),
        title: 'Расход ≈',
        width: 120,
      },
      {
        key: 'consent',
        render: (_, user) => {
          if (privateMode) {
            return PRIVATE_MASK;
          }
          if (user.isGuest) {
            return <Tag>Нет</Tag>;
          }
          return (
            <>
              <Tag color={user.dataConsentAt ? 'success' : 'default'}>
                {user.dataConsentAt ? 'Да' : 'Нет'}
              </Tag>
              {user.dataConsentAt ? formatDate(user.dataConsentAt) : null}
            </>
          );
        },
        title: 'Согласие',
        width: 220,
      },
      {
        dataIndex: ['usageCounts', 'analyze_photo'],
        key: 'analyze_photo',
        title: 'Фото',
        width: 80,
      },
      {
        dataIndex: ['usageCounts', 'analyze_text'],
        key: 'analyze_text',
        title: 'Текст',
        width: 80,
      },
      {
        dataIndex: ['usageCounts', 'analyze_photo_text'],
        key: 'analyze_photo_text',
        title: 'Ф+Т',
        width: 70,
      },
      {
        dataIndex: ['usageCounts', 'refine'],
        key: 'refine',
        title: 'Refine',
        width: 80,
      },
      {
        dataIndex: ['usageCounts', 'manual'],
        key: 'manual',
        title: 'Ручн.',
        width: 80,
      },
      {
        dataIndex: ['usageCounts', 'barcode'],
        key: 'barcode',
        title: 'ШК',
        width: 65,
      },
      {
        dataIndex: ['usageCounts', 'analyze'],
        key: 'analyze',
        title: 'Legacy',
        width: 80,
      },
      {
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value?: string | null) =>
          privateMode ? PRIVATE_MASK : formatDate(value),
        title: 'Создан',
        width: 180,
      },
    ],
    [privateMode, rate],
  );

  const users = usersQuery.data?.users ?? [];

  const totals = useMemo(() => {
    const empty: UsageCounts = {
      analyze_photo: 0,
      analyze_text: 0,
      analyze_photo_text: 0,
      refine: 0,
      manual: 0,
      barcode: 0,
      analyze: 0,
    };
    const usage = users.reduce(
      (acc, user) => ({
        analyze_photo: acc.analyze_photo + user.usageCounts.analyze_photo,
        analyze_text: acc.analyze_text + user.usageCounts.analyze_text,
        analyze_photo_text:
          acc.analyze_photo_text + user.usageCounts.analyze_photo_text,
        refine: acc.refine + user.usageCounts.refine,
        manual: acc.manual + user.usageCounts.manual,
        barcode: acc.barcode + user.usageCounts.barcode,
        analyze: acc.analyze + user.usageCounts.analyze,
      }),
      empty,
    );
    const aiTotal = aiGenerationTotal(usage);
    const activeSubscriptions = users.filter(
      (user) => user.hasActiveSubscription,
    ).length;
    return {
      activeSubscriptions,
      aiCost: aiTotal * rate,
      aiTotal,
      usage,
    };
  }, [rate, users]);

  return (
    <>
      <PageHeader
        subtitle="Аккаунты, гости без входа, согласие и расход ИИ-лимитов"
        title="Пользователи"
      />
      <Flex gap={16} wrap="wrap" align="flex-end" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          enterButton="Найти"
          onSearch={(value) => setQuery(value.trim())}
          placeholder="ID, Telegram ID, Device ID или username"
          style={{ maxWidth: 420, width: '100%' }}
        />
        <Space align="center">
          <Typography.Text type="secondary">
            Коэф. ₽ / ИИ-генерация
          </Typography.Text>
          <Space.Compact>
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              value={costPerGeneration}
              onChange={(value) =>
                setCostPerGeneration(
                  typeof value === 'number'
                    ? value
                    : DEFAULT_COST_PER_GENERATION,
                )
              }
              style={{ width: 100 }}
            />
            <Input
              readOnly
              tabIndex={-1}
              value="₽"
              style={{ width: 40, pointerEvents: 'none' }}
            />
          </Space.Compact>
        </Space>
        <Checkbox
          checked={privateMode}
          onChange={(e) => setPrivateMode(e.target.checked)}
        >
          Приватный режим
        </Checkbox>
      </Flex>
      <Table<AdminUser>
        columns={columns}
        dataSource={users}
        loading={usersQuery.isLoading}
        locale={{
          emptyText: usersQuery.error
            ? usersQuery.error.message
            : 'Пользователи не найдены',
        }}
        onRow={(user) =>
          privateMode
            ? {}
            : {
                onClick: () => router.push(`/admin/users/${user.id}`),
                style: { cursor: 'pointer' },
              }
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего ${total}`,
        }}
        rowKey="id"
        scroll={{ x: 2000 }}
        size="middle"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Typography.Text strong>Итого</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3}>
                <Typography.Text strong>
                  {totals.activeSubscriptions} акт.
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Typography.Text strong>{totals.aiTotal}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <Typography.Text strong>
                  {formatRub(totals.aiCost)}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
              <Table.Summary.Cell index={7}>
                <Typography.Text strong>
                  {totals.usage.analyze_photo}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8}>
                <Typography.Text strong>
                  {totals.usage.analyze_text}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9}>
                <Typography.Text strong>
                  {totals.usage.analyze_photo_text}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10}>
                <Typography.Text strong>{totals.usage.refine}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11}>
                <Typography.Text strong>{totals.usage.manual}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={12}>
                <Typography.Text strong>{totals.usage.barcode}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={13}>
                <Typography.Text strong>{totals.usage.analyze}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={14} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </>
  );
}
