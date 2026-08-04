'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type Stats = {
  usersTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
  usageAnalyzeLast7Days: number;
  usageRefineLast7Days: number;
  usageAnalyzeLast30Days: number;
  usageRefineLast30Days: number;
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

export default function AdminPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi<Stats>('stats'),
  });

  return (
    <>
      <PageHeader
        subtitle="Сводка по пользователям, платежам и usage"
        title="Обзор"
      />
      {error ? (
        <Alert
          description={error.message}
          message="Не удалось загрузить статистику"
          showIcon
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
                loading={isLoading}
                title="Всего пользователей"
                value={data?.usersTotal ?? 0}
              />
            </Card>
          </Col>
          <Col lg={12} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={isLoading}
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
                loading={isLoading}
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
                loading={isLoading}
                title="Сумма платежей"
                value={data?.paymentsConfirmedSumKopecks ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Usage
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={isLoading}
                title="Анализы за 7 дней"
                value={data?.usageAnalyzeLast7Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={isLoading}
                title="Уточнения за 7 дней"
                value={data?.usageRefineLast7Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={isLoading}
                title="Анализы за 30 дней"
                value={data?.usageAnalyzeLast30Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={isLoading}
                title="Уточнения за 30 дней"
                value={data?.usageRefineLast30Days ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}
