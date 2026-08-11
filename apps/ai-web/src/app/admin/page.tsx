'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Card, Col, Row, Statistic, Table, Typography } from 'antd';

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
  usersTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
  requests?: {
    last7Days: RequestWindow;
    last30Days: RequestWindow;
    byType: RequestTypeStats[];
  };
};

type StatsSeries = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{
      date: string;
      sumKopecks: number;
      totalKopecks: number;
    }>;
    usage: Array<{ date: string; analyze: number; refine: number }>;
    requests?: Array<{
      date: string;
      total: number;
      byType: Record<string, number>;
    }>;
  };
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  food_analyze: 'Анализ',
  food_refine: 'Уточнение',
  food_ask: 'Вопрос',
  chat_completions: 'Chat',
  embeddings: 'Embeddings',
  models: 'Models',
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

const formatMs = (value: number | null) =>
  value == null ? '—' : String(Math.round(value));

const requestTypeColumns: ColumnsType<RequestTypeStats> = [
  {
    dataIndex: 'type',
    key: 'type',
    render: (type: string) => REQUEST_TYPE_LABELS[type] ?? type,
    title: 'Тип',
  },
  {
    dataIndex: 'count',
    key: 'count',
    title: 'Всего',
  },
  {
    dataIndex: 'okCount',
    key: 'okCount',
    title: 'OK',
  },
  {
    dataIndex: 'errorCount',
    key: 'errorCount',
    title: 'Ошибки',
  },
  {
    dataIndex: 'avgTtfbMs',
    key: 'avgTtfbMs',
    render: formatMs,
    title: 'TTFB avg',
  },
  {
    dataIndex: 'p50TtfbMs',
    key: 'p50TtfbMs',
    render: formatMs,
    title: 'TTFB p50',
  },
  {
    dataIndex: 'p95TtfbMs',
    key: 'p95TtfbMs',
    render: formatMs,
    title: 'TTFB p95',
  },
  {
    dataIndex: 'avgDurationMs',
    key: 'avgDurationMs',
    render: formatMs,
    title: 'Duration avg',
  },
  {
    dataIndex: 'p50DurationMs',
    key: 'p50DurationMs',
    render: formatMs,
    title: 'Duration p50',
  },
  {
    dataIndex: 'p95DurationMs',
    key: 'p95DurationMs',
    render: formatMs,
    title: 'Duration p95',
  },
];

export default function AdminPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi<Stats>('stats'),
  });
  const seriesQuery = useQuery({
    queryKey: ['admin', 'stats', 'series', 7],
    queryFn: () => adminApi<StatsSeries>('stats/series?days=7'),
  });

  const data = statsQuery.data;
  const series = seriesQuery.data?.series;
  const usersNewSum =
    series?.users.reduce((acc, point) => acc + point.new, 0) ?? 0;
  const usersTotalLatest =
    series?.users[series.users.length - 1]?.total ?? 0;
  const paymentsPeriodSum =
    series?.payments.reduce((acc, point) => acc + point.sumKopecks, 0) ?? 0;
  const paymentsTotalLatest =
    series?.payments[series.payments.length - 1]?.totalKopecks ?? 0;
  const usageAnalyzeSum =
    series?.usage.reduce((acc, point) => acc + point.analyze, 0) ?? 0;
  const usageRefineSum =
    series?.usage.reduce((acc, point) => acc + point.refine, 0) ?? 0;
  const requestSpark =
    series?.requests?.map((row) => ({
      date: row.date,
      total: row.total,
      food_analyze: row.byType.food_analyze ?? 0,
      food_refine: row.byType.food_refine ?? 0,
      chat_completions: row.byType.chat_completions ?? 0,
    })) ?? [];
  const requestSparkTotal =
    requestSpark.reduce((acc, point) => acc + point.total, 0);

  return (
    <>
      <PageHeader
        subtitle="Сводка по пользователям, платежам, запросам и usage"
        title="Обзор"
      />
      {statsQuery.error ? (
        <Alert
          description={statsQuery.error.message}
          message="Не удалось загрузить статистику"
          showIcon
          type="error"
        />
      ) : null}
      {seriesQuery.error ? (
        <Alert
          description={seriesQuery.error.message}
          message="Не удалось загрузить графики"
          showIcon
          style={{ marginTop: statsQuery.error ? 12 : 0 }}
          type="error"
        />
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Пользователи
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={12} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Всего пользователей"
                value={data?.usersTotal ?? 0}
              />
            </Card>
          </Col>
          <Col lg={12} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Активные подписки"
                value={data?.activeSubscriptions ?? 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Платежи
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={12} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Подтверждённые платежи"
                value={data?.paymentsConfirmedCount ?? 0}
              />
            </Card>
          </Col>
          <Col lg={12} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                formatter={() =>
                  data ? formatRubles(data.paymentsConfirmedSumKopecks) : '—'
                }
                loading={statsQuery.isLoading}
                title="Сумма платежей"
                value={data?.paymentsConfirmedSumKopecks ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Запросы
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
        <Table<RequestTypeStats>
          columns={requestTypeColumns}
          dataSource={data?.requests?.byType ?? []}
          loading={statsQuery.isLoading}
          pagination={false}
          rowKey="type"
          scroll={{ x: true }}
          size="small"
          style={{ marginTop: 16 }}
        />
      </div>

      {!seriesQuery.error ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Графики за 7 дней
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col lg={8} md={8} sm={24} xs={24}>
              <SparklineCard
                data={series?.users ?? []}
                height={120}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней: новых {usersNewSum}, всего {usersTotalLatest}
                  </Typography.Text>
                }
                title="Пользователи"
                yFields={[
                  { key: 'new', label: 'Новые' },
                  { key: 'total', label: 'Всего' },
                ]}
              />
            </Col>
            <Col lg={8} md={8} sm={24} xs={24}>
              <SparklineCard
                data={series?.payments ?? []}
                height={120}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней: {formatRubles(paymentsPeriodSum)}, всего{' '}
                    {formatRubles(paymentsTotalLatest)}
                  </Typography.Text>
                }
                title="Сумма платежей"
                valueFormatter={formatRubles}
                yFields={[
                  { key: 'sumKopecks', label: 'За день' },
                  { key: 'totalKopecks', label: 'Накопительно' },
                ]}
              />
            </Col>
            <Col lg={8} md={8} sm={24} xs={24}>
              <SparklineCard
                data={series?.usage ?? []}
                height={120}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней: анализы {usageAnalyzeSum}, уточнения{' '}
                    {usageRefineSum}
                  </Typography.Text>
                }
                title="Usage"
                yFields={[
                  { key: 'analyze', label: 'Анализы' },
                  { key: 'refine', label: 'Уточнения' },
                ]}
              />
            </Col>
            <Col lg={8} md={8} sm={24} xs={24}>
              <SparklineCard
                data={requestSpark}
                height={120}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней: всего {requestSparkTotal}
                  </Typography.Text>
                }
                title="Запросы"
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
    </>
  );
}
