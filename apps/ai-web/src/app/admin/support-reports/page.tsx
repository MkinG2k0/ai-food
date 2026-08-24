'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  Descriptions,
  Image,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type SupportReportType = 'bug' | 'feature' | 'question' | 'other';
type SupportReportStatus = 'new' | 'read' | 'resolved';

type SupportReportUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
};

type SupportReportListItem = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  type: SupportReportType;
  message: string;
  appVersion: string | null;
  platform: string | null;
  status: SupportReportStatus;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  user: SupportReportUser | null;
};

type SupportReportDetail = SupportReportListItem & {
  images: string[];
};

type SupportReportList = {
  items: SupportReportListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const TYPE_LABELS: Record<SupportReportType, string> = {
  bug: 'Ошибка',
  feature: 'Предложение',
  question: 'Вопрос',
  other: 'Другое',
};

const STATUS_LABELS: Record<SupportReportStatus, string> = {
  new: 'Новое',
  read: 'Прочитано',
  resolved: 'Решено',
};

const STATUS_COLORS: Record<SupportReportStatus, string> = {
  new: 'blue',
  read: 'gold',
  resolved: 'green',
};

function formatUserLabel(user: SupportReportUser | null, deviceId: string | null) {
  if (user) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (name) return name;
    if (user.username) return `@${user.username}`;
    return user.telegramId;
  }
  return deviceId ? `Гость · ${deviceId.slice(0, 8)}…` : '—';
}

export default function AdminSupportReportsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SupportReportStatus | 'all'>(
    'all',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'support-reports', page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      return adminApi<SupportReportList>(`support-reports?${params.toString()}`);
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'support-reports', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      adminApi<SupportReportDetail>(`support-reports/${selectedId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: SupportReportStatus }) =>
      adminApi<SupportReportDetail>(`support-reports/${payload.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'support-reports'] });
    },
  });

  const columns: ColumnsType<SupportReportListItem> = useMemo(
    () => [
      {
        title: 'Дата',
        dataIndex: 'createdAt',
        width: 170,
        render: (value: string) => new Date(value).toLocaleString('ru-RU'),
      },
      {
        title: 'Тип',
        dataIndex: 'type',
        width: 120,
        render: (value: SupportReportType) => TYPE_LABELS[value],
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        width: 120,
        render: (value: SupportReportStatus) => (
          <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value]}</Tag>
        ),
      },
      {
        title: 'Пользователь',
        key: 'user',
        width: 180,
        render: (_, row) => formatUserLabel(row.user, row.deviceId),
      },
      {
        title: 'Сообщение',
        dataIndex: 'message',
        ellipsis: true,
      },
      {
        title: 'Фото',
        dataIndex: 'imageCount',
        width: 70,
        align: 'center',
      },
      {
        title: 'Платформа',
        key: 'platform',
        width: 120,
        render: (_, row) =>
          [row.platform, row.appVersion].filter(Boolean).join(' · ') || '—',
      },
    ],
    [],
  );

  return (
    <div className="admin-stack">
      <PageHeader
        title="Обращения"
        subtitle="Сообщения об ошибках и обратная связь из приложения."
      />

      {listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить обращения"
        />
      ) : null}

      <Space wrap>
        <Select
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Все статусы' },
            { value: 'new', label: STATUS_LABELS.new },
            { value: 'read', label: STATUS_LABELS.read },
            { value: 'resolved', label: STATUS_LABELS.resolved },
          ]}
          style={{ width: 180 }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={listQuery.isLoading}
        columns={columns}
        dataSource={listQuery.data?.items ?? []}
        pagination={{
          current: page,
          pageSize: 20,
          total: listQuery.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        onRow={(row) => ({
          onClick: () => setSelectedId(row.id),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        centered
        open={Boolean(selectedId)}
        title="Обращение"
        width={720}
        onCancel={() => setSelectedId(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedId(null)}>
            Закрыть
          </Button>,
        ]}
      >
        {detailQuery.isLoading ? (
          <Typography.Text type="secondary">Загрузка…</Typography.Text>
        ) : detailQuery.data ? (
          <div className="support-report-detail">
            <div className="support-report-detail__meta">
              <Space wrap size={[8, 8]}>
                <Tag>{TYPE_LABELS[detailQuery.data.type]}</Tag>
                <Tag color={STATUS_COLORS[detailQuery.data.status]}>
                  {STATUS_LABELS[detailQuery.data.status]}
                </Tag>
              </Space>
              <Typography.Text type="secondary">
                {new Date(detailQuery.data.createdAt).toLocaleString('ru-RU')}
              </Typography.Text>
            </div>

            <Descriptions
              size="small"
              column={1}
              colon={false}
              className="support-report-detail__info"
            >
              <Descriptions.Item label="Пользователь">
                {formatUserLabel(detailQuery.data.user, detailQuery.data.deviceId)}
              </Descriptions.Item>
              {(detailQuery.data.platform || detailQuery.data.appVersion) && (
                <Descriptions.Item label="Клиент">
                  {[detailQuery.data.platform, detailQuery.data.appVersion]
                    .filter(Boolean)
                    .join(' · ')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <section className="support-report-detail__section">
              <Typography.Text
                type="secondary"
                className="support-report-detail__label"
              >
                Сообщение
              </Typography.Text>
              <div className="support-report-detail__message">
                {detailQuery.data.message}
              </div>
            </section>

            <section className="support-report-detail__section">
              <Typography.Text
                type="secondary"
                className="support-report-detail__label"
              >
                Фото
                {detailQuery.data.images.length > 0
                  ? ` · ${detailQuery.data.images.length}`
                  : ''}
              </Typography.Text>
              {detailQuery.data.images.length > 0 ? (
                <Image.PreviewGroup>
                  <div className="support-report-detail__photos">
                    {detailQuery.data.images.map((src, index) => (
                      <Image
                        key={`${detailQuery.data!.id}-${index}`}
                        src={src}
                        alt={`Фото ${index + 1}`}
                        width={160}
                        height={160}
                        className="support-report-detail__photo"
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              ) : (
                <Typography.Text type="secondary">
                  Фото не прикреплены
                </Typography.Text>
              )}
            </section>

            <section className="support-report-detail__section support-report-detail__status">
              <Typography.Text
                type="secondary"
                className="support-report-detail__label"
              >
                Статус
              </Typography.Text>
              <Segmented<SupportReportStatus>
                block
                value={detailQuery.data.status}
                disabled={statusMutation.isPending}
                options={(
                  ['new', 'read', 'resolved'] as const
                ).map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                }))}
                onChange={(status) => {
                  if (!selectedId || status === detailQuery.data?.status) return;
                  statusMutation.mutate({ id: selectedId, status });
                }}
              />
            </section>
          </div>
        ) : (
          <Alert type="error" showIcon message="Обращение не найдено" />
        )}
      </Modal>
    </div>
  );
}
