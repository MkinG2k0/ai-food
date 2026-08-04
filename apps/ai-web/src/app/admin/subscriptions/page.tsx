'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type SubscriptionAction = 'activate' | 'extend' | 'revoke';
type StatusFilter = 'all' | 'active' | 'inactive';

type User = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
};

type UsersResponse = {
  users: User[];
};

type ActionModal = {
  action: 'activate' | 'extend';
  user: User;
};

type ActionFormValues = {
  days?: number;
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

export default function SubscriptionsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modal, setModal] = useState<ActionModal | null>(null);
  const [form] = Form.useForm<ActionFormValues>();
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () =>
      adminApi<UsersResponse>(`users?q=${encodeURIComponent(query)}`),
  });
  const changeSubscription = useMutation({
    mutationFn: ({
      action,
      days,
      userId,
    }: {
      action: SubscriptionAction;
      days?: number;
      userId: string;
    }) =>
      adminApi<User>(`users/${encodeURIComponent(userId)}/subscription`, {
        body: JSON.stringify({
          action,
          ...(days === undefined ? {} : { days }),
        }),
        method: 'POST',
      }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<UsersResponse>(
        ['admin', 'users', query],
        (current) =>
          current
            ? {
                users: current.users.map((user) =>
                  user.id === updatedUser.id ? updatedUser : user,
                ),
              }
            : current,
      );
      message.success('Подписка обновлена');
      setModal(null);
      form.resetFields();
    },
    onError: (error) => message.error(error.message),
  });

  const filteredUsers = useMemo(() => {
    const users = usersQuery.data?.users ?? [];
    if (statusFilter === 'active') {
      return users.filter((user) => user.hasActiveSubscription);
    }
    if (statusFilter === 'inactive') {
      return users.filter((user) => !user.hasActiveSubscription);
    }
    return users;
  }, [statusFilter, usersQuery.data?.users]);

  const activeCount = useMemo(
    () => filteredUsers.filter((user) => user.hasActiveSubscription).length,
    [filteredUsers],
  );

  const openAction = (user: User, action: 'activate' | 'extend') => {
    form.resetFields();
    setModal({ action, user });
  };

  const submitAction = ({ days }: ActionFormValues) => {
    if (!modal) return;
    changeSubscription.mutate({
      action: modal.action,
      days,
      userId: modal.user.id,
    });
  };

  const columns: ColumnsType<User> = [
    {
      key: 'user',
      render: (_, user) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {name || user.username || user.telegramId}
            </Typography.Text>
            <Typography.Text type="secondary">
              {user.username ? `@${user.username} · ` : ''}
              Telegram ID: {user.telegramId}
            </Typography.Text>
          </Space>
        );
      },
      title: 'Пользователь',
    },
    {
      key: 'status',
      render: (_, user) => (
        <Tag color={user.hasActiveSubscription ? 'success' : 'default'}>
          {user.hasActiveSubscription ? 'Активна' : 'Не активна'}
        </Tag>
      ),
      title: 'Статус',
      width: 140,
    },
    {
      dataIndex: 'subscriptionExpiresAt',
      key: 'expiresAt',
      render: formatDate,
      title: 'Действует до',
      width: 180,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, user) => (
        <Space wrap>
          <Button onClick={() => openAction(user, 'activate')} size="small">
            Активировать
          </Button>
          <Button onClick={() => openAction(user, 'extend')} size="small">
            Продлить
          </Button>
          <Popconfirm
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            okText="Отозвать"
            onConfirm={() =>
              changeSubscription.mutate({
                action: 'revoke',
                userId: user.id,
              })
            }
            title="Отозвать подписку?"
          >
            <Button danger size="small">
              Отозвать
            </Button>
          </Popconfirm>
        </Space>
      ),
      title: 'Действия',
      width: 310,
    },
  ];

  return (
    <>
      <PageHeader
        subtitle="Поиск пользователей и управление подписками"
        title="Подписки"
      />
      <Flex gap={12} justify="space-between" vertical={false} wrap="wrap">
        <Space wrap>
          <Input.Search
            allowClear
            enterButton="Найти"
            onSearch={(value) => setQuery(value.trim())}
            placeholder="ID, Telegram ID или имя пользователя"
            style={{ maxWidth: 420, width: '100%' }}
          />
          <Segmented<StatusFilter>
            onChange={setStatusFilter}
            options={[
              { label: 'Все', value: 'all' },
              { label: 'Активные', value: 'active' },
              { label: 'Неактивные', value: 'inactive' },
            ]}
            value={statusFilter}
          />
        </Space>
        <Typography.Text type="secondary">
          Найдено {filteredUsers.length} · активных {activeCount}
        </Typography.Text>
      </Flex>
      <Table<User>
        columns={columns}
        dataSource={filteredUsers}
        loading={usersQuery.isLoading}
        locale={{
          emptyText: usersQuery.error
            ? usersQuery.error.message
            : 'Пользователи не найдены',
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего ${total}`,
        }}
        rowKey="id"
        scroll={{ x: 900 }}
        size="middle"
      />
      <Modal
        cancelText="Отмена"
        confirmLoading={changeSubscription.isPending}
        destroyOnHidden
        okText={modal?.action === 'extend' ? 'Продлить' : 'Активировать'}
        onCancel={() => setModal(null)}
        onOk={() => form.submit()}
        open={Boolean(modal)}
        title={
          modal?.action === 'extend'
            ? 'Продлить подписку'
            : 'Активировать подписку'
        }
      >
        <Form<ActionFormValues>
          form={form}
          layout="vertical"
          onFinish={submitAction}
        >
          <Form.Item
            label={
              modal?.action === 'extend'
                ? 'Количество дней'
                : 'Количество дней (необязательно)'
            }
            name="days"
            rules={[
              {
                message: 'Для продления укажите количество дней',
                required: modal?.action === 'extend',
              },
              {
                message: 'Введите целое положительное число',
                min: 1,
                type: 'integer',
              },
            ]}
          >
            <InputNumber
              min={1}
              placeholder={
                modal?.action === 'activate'
                  ? 'Срок по умолчанию'
                  : undefined
              }
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
