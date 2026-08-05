'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { Input, Table, Tag, Typography } from 'antd';

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

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

export default function UsersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () =>
      adminApi<UsersResponse>(`users?q=${encodeURIComponent(query)}`),
  });

  const columns: ColumnsType<AdminUser> = [
    {
      key: 'name',
      render: (_, user) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        return (
          <Typography.Text strong>
            {name || user.username || 'Без имени'}
          </Typography.Text>
        );
      },
      title: 'Имя',
      width: 180,
    },
    {
      dataIndex: 'username',
      key: 'username',
      render: (username: string | null) => (username ? `@${username}` : '—'),
      title: 'Username',
      width: 160,
    },
    {
      dataIndex: 'telegramId',
      key: 'telegramId',
      title: 'Telegram ID',
      width: 160,
    },
    {
      key: 'subscription',
      render: (_, user) => (
        <Tag color={user.hasActiveSubscription ? 'success' : 'default'}>
          {user.hasActiveSubscription ? 'Активна' : 'Не активна'}
        </Tag>
      ),
      title: 'Подписка',
      width: 130,
    },
    {
      key: 'consent',
      render: (_, user) => (
        <>
          <Tag color={user.dataConsentAt ? 'success' : 'default'}>
            {user.dataConsentAt ? 'Да' : 'Нет'}
          </Tag>
          {user.dataConsentAt ? formatDate(user.dataConsentAt) : null}
        </>
      ),
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
      render: formatDate,
      title: 'Создан',
      width: 180,
    },
  ];

  const users = usersQuery.data?.users ?? [];

  return (
    <>
      <PageHeader
        subtitle="Аккаунты, согласие и статистика генераций"
        title="Пользователи"
      />
      <Input.Search
        allowClear
        enterButton="Найти"
        onSearch={(value) => setQuery(value.trim())}
        placeholder="ID, Telegram ID или имя пользователя"
        style={{ maxWidth: 420, width: '100%' }}
      />
      <Table<AdminUser>
        columns={columns}
        dataSource={users}
        loading={usersQuery.isLoading}
        locale={{
          emptyText: usersQuery.error
            ? usersQuery.error.message
            : 'Пользователи не найдены',
        }}
        onRow={(user) => ({
          onClick: () => router.push(`/admin/users/${user.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего ${total}`,
        }}
        rowKey="id"
        scroll={{ x: 1700 }}
        size="middle"
      />
    </>
  );
}
