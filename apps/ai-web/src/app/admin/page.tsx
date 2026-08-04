'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';

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

  const cards = [
    { title: 'Всего пользователей', value: data?.usersTotal },
    { title: 'Активные подписки', value: data?.activeSubscriptions },
    {
      title: 'Подтверждённые платежи',
      value: data?.paymentsConfirmedCount,
    },
    {
      formatter: () =>
        data ? formatRubles(data.paymentsConfirmedSumKopecks) : '—',
      title: 'Сумма платежей',
      value: data?.paymentsConfirmedSumKopecks,
    },
    { title: 'Анализы за 7 дней', value: data?.usageAnalyzeLast7Days },
    { title: 'Уточнения за 7 дней', value: data?.usageRefineLast7Days },
    { title: 'Анализы за 30 дней', value: data?.usageAnalyzeLast30Days },
    { title: 'Уточнения за 30 дней', value: data?.usageRefineLast30Days },
  ];

  return (
    <>
      <Typography.Title level={2}>Обзор</Typography.Title>
      {error ? (
        <Alert
          description={error.message}
          message="Не удалось загрузить статистику"
          showIcon
          type="error"
        />
      ) : null}
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.title} lg={6} md={8} sm={12} xs={24}>
            <Card>
              <Statistic
                formatter={card.formatter}
                loading={isLoading}
                title={card.title}
                value={card.value ?? 0}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
