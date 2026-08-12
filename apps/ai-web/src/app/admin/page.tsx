'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { SparklineCard } from '@/components/SparklineCard';
import { adminApi } from '@/lib/adminApi';

type Stats = {
  usersTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
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
  };
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

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

  return (
    <>
      <PageHeader
        subtitle="Сводка по пользователям, платежам и usage"
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

      {!seriesQuery.error ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Графики за 7 дней
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col lg={8} md={8} sm={24} xs={24}>
              <SparklineCard
                data={series?.users ?? []}
                height={160}
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
                height={160}
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
                height={160}
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
          </Row>
        </div>
      ) : null}
    </>
  );
}
