'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { SparklineCard } from '@/components/SparklineCard';
import { adminApi } from '@/lib/adminApi';

type RequestWindow = { count: number; okCount: number; errorCount: number };

type RequestTypeStats = RequestWindow & {
  type: string;
  avgTtfbMs: number | null;
  p50TtfbMs: number | null;
  p95TtfbMs: number | null;
  avgDurationMs: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
};

type Stats = {
  requests?: {
    last7Days: RequestWindow;
    last30Days: RequestWindow;
    byType: RequestTypeStats[];
  };
};

type StatsSeries = {
  days: number;
  series: {
    requests?: Array<{
      date: string;
      total: number;
      byType: Record<string, number>;
    }>;
  };
};

type GatewayRequestRow = {
  id: string;
  type: string;
  stream: boolean;
  ok: boolean;
  ttfbMs: number | null;
  durationMs: number | null;
  userId: string | null;
  deviceId: string | null;
  createdAt: string;
};

type GatewayRequestList = {
  items: GatewayRequestRow[];
  total: number;
  page: number;
  pageSize: number;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  food_analyze: 'Анализ еды',
  food_refine: 'Уточнение',
  food_ask: 'Вопрос',
  chat_completions: 'Chat (общий)',
  embeddings: 'Embeddings',
  models: 'Models',
};

const formatMs = (value: number | null) => {
  if (value == null) return '—';
  const seconds = Math.round(value / 100) / 10;
  return `${seconds.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} сек`;
};

export default function AdminRequestsPage() {
  const [detailType, setDetailType] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(50);

  const openType = (type: string) => {
    setDetailType(type);
    setListPage(1);
    setListPageSize(50);
  };

  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi<Stats>('stats'),
  });
  const seriesQuery = useQuery({
    queryKey: ['admin', 'stats', 'series', 7],
    queryFn: () => adminApi<StatsSeries>('stats/series?days=7'),
  });
  const detailQuery = useQuery({
    queryKey: [
      'admin',
      'gateway-requests',
      detailType,
      listPage,
      listPageSize,
    ],
    enabled: Boolean(detailType),
    queryFn: () =>
      adminApi<GatewayRequestList>(
        `gateway-requests?type=${encodeURIComponent(detailType!)}&page=${listPage}&pageSize=${listPageSize}`,
      ),
  });

  const requestTypeColumns = useMemo<ColumnsType<RequestTypeStats>>(
    () => [
      {
        dataIndex: 'type',
        key: 'type',
        title: 'Тип',
        render: (type: string) => (
          <Button
            type="link"
            style={{ paddingInline: 0 }}
            onClick={() => openType(type)}
          >
            {REQUEST_TYPE_LABELS[type] ?? type}
          </Button>
        ),
      },
      {
        dataIndex: 'count',
        key: 'count',
        title: 'Всего',
      },
      {
        dataIndex: 'okCount',
        key: 'okCount',
        title: 'Успешно',
      },
      {
        dataIndex: 'errorCount',
        key: 'errorCount',
        title: 'Ошибки',
      },
      {
        title: 'Старт ответа',
        children: [
          {
            dataIndex: 'avgTtfbMs',
            key: 'avgTtfbMs',
            render: formatMs,
            title: 'среднее',
          },
          {
            dataIndex: 'p50TtfbMs',
            key: 'p50TtfbMs',
            render: formatMs,
            title: 'типичный',
          },
          {
            dataIndex: 'p95TtfbMs',
            key: 'p95TtfbMs',
            render: formatMs,
            title: 'медл. 5%',
          },
        ],
      },
      {
        title: 'Полное время',
        children: [
          {
            dataIndex: 'avgDurationMs',
            key: 'avgDurationMs',
            render: formatMs,
            title: 'среднее',
          },
          {
            dataIndex: 'p50DurationMs',
            key: 'p50DurationMs',
            render: formatMs,
            title: 'типичный',
          },
          {
            dataIndex: 'p95DurationMs',
            key: 'p95DurationMs',
            render: formatMs,
            title: 'медл. 5%',
          },
        ],
      },
    ],
    [],
  );

  const detailColumns: ColumnsType<GatewayRequestRow> = [
    {
      title: 'Когда',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('ru-RU'),
    },
    {
      title: 'Статус',
      dataIndex: 'ok',
      key: 'ok',
      render: (ok: boolean) =>
        ok ? (
          <Tag color="success">Успешно</Tag>
        ) : (
          <Tag color="error">Ошибка</Tag>
        ),
    },
    {
      title: 'Старт ответа',
      dataIndex: 'ttfbMs',
      key: 'ttfbMs',
      render: formatMs,
    },
    {
      title: 'Полное время',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: formatMs,
    },
    {
      title: 'Поток (SSE)',
      dataIndex: 'stream',
      key: 'stream',
      render: (v: boolean) => (v ? 'да' : 'нет'),
    },
    {
      title: 'Пользователь',
      dataIndex: 'userId',
      key: 'userId',
      render: (v) => v ?? '—',
    },
    {
      title: 'Устройство',
      dataIndex: 'deviceId',
      key: 'deviceId',
      render: (v) => v ?? '—',
    },
    { title: 'id', dataIndex: 'id', key: 'id' },
  ];

  const data = statsQuery.data;
  const series = seriesQuery.data?.series;
  const requestSpark =
    series?.requests?.map((row) => ({
      date: row.date,
      total: row.total,
      food_analyze: row.byType?.food_analyze ?? 0,
      food_refine: row.byType?.food_refine ?? 0,
      chat_completions: row.byType?.chat_completions ?? 0,
    })) ?? [];
  const requestSparkTotal =
    requestSpark.reduce((acc, point) => acc + point.total, 0);

  return (
    <>
      <PageHeader
        subtitle="Сколько вызовов AI ушло через gateway и как долго они отвечали"
        title="Запросы"
      />
      {statsQuery.error ? (
        <Alert
          description={statsQuery.error.message}
          message="Не удалось загрузить статистику запросов"
          showIcon
          type="error"
        />
      ) : null}
      {seriesQuery.error ? (
        <Alert
          description={seriesQuery.error.message}
          message="Не удалось загрузить график запросов"
          showIcon
          style={{ marginTop: statsQuery.error ? 12 : 0 }}
          type="error"
        />
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Сводка
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Запросы за 7 дней"
                value={data?.requests?.last7Days.count ?? 0}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Запросы за 30 дней"
                value={data?.requests?.last30Days.count ?? 0}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Ошибки за 7 дней"
                value={data?.requests?.last7Days.errorCount ?? 0}
                valueStyle={
                  (data?.requests?.last7Days.errorCount ?? 0) > 0
                    ? { color: '#cf1322' }
                    : undefined
                }
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          По типам за 30 дней
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
          Старт ответа — до первого байта; полное время — до конца. Типичный =
          половина запросов не медленнее; медл. 5% — хвост самых долгих.
        </Typography.Paragraph>
        <Table<RequestTypeStats>
          bordered
          columns={requestTypeColumns}
          dataSource={data?.requests?.byType ?? []}
          loading={statsQuery.isLoading}
          pagination={false}
          rowKey="type"
          scroll={{ x: true }}
          size="small"
        />
      </div>

      {!seriesQuery.error ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Сколько запросов в день
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col lg={12} md={16} sm={24} xs={24}>
              <SparklineCard
                data={requestSpark}
                height={140}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней суммарно: {requestSparkTotal}
                  </Typography.Text>
                }
                title="Число запросов по дням"
                yFields={[
                  { key: 'total', label: 'Всего' },
                  { key: 'food_analyze', label: 'Анализ' },
                  { key: 'food_refine', label: 'Уточнение' },
                  { key: 'chat_completions', label: 'Chat' },
                ]}
              />
            </Col>
          </Row>
        </div>
      ) : null}

      <Modal
        centered
        destroyOnHidden
        footer={null}
        open={Boolean(detailType)}
        title={
          detailType
            ? (REQUEST_TYPE_LABELS[detailType] ?? detailType)
            : 'Запросы'
        }
        width={1080}
        onCancel={() => setDetailType(null)}
      >
        {detailQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Не удалось загрузить запросы"
            description={detailQuery.error.message}
            style={{ marginBottom: 12 }}
          />
        ) : null}
        <Table<GatewayRequestRow>
          columns={detailColumns}
          dataSource={detailQuery.data?.items ?? []}
          loading={detailQuery.isLoading}
          rowKey="id"
          size="small"
          scroll={{ x: true }}
          pagination={{
            current: listPage,
            pageSize: listPageSize,
            total: detailQuery.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (page, pageSize) => {
              setListPage(page);
              setListPageSize(pageSize);
            },
          }}
        />
      </Modal>
    </>
  );
}
