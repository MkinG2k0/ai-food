'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { SparklineCard } from '@/components/SparklineCard';
import { adminApi } from '@/lib/adminApi';
import type { OpenRouterAdminSnapshot } from '@/lib/openrouterAdminTypes';

const formatUsd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 4,
      }).format(n);

const formatRubMoney = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
      }).format(n);

const formatPct = (rate: number | null | undefined) =>
  rate == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 1,
        style: 'percent',
      }).format(rate);

const formatInt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('ru-RU');

function formatRunway(runway: OpenRouterAdminSnapshot['runway']): string {
  if (runway.daysLeft != null && runway.monthsLeft != null) {
    const days = Math.round(runway.daysLeft);
    const months =
      runway.monthsLeft < 10
        ? runway.monthsLeft.toFixed(1)
        : String(Math.round(runway.monthsLeft));
    return `≈ ${days} дн. · ${months} мес.`;
  }
  if (runway.avgDailySpendUsd == null || runway.avgDailySpendUsd < 1e-9) {
    return 'баланс не расходуется';
  }
  return '—';
}

function formatFxSource(source: 'frankfurter-cbr'): string {
  if (source === 'frankfurter-cbr') return 'Frankfurter / ЦБ';
  return source;
}

export default function AdminOpenRouterPage() {
  const openrouterQuery = useQuery({
    queryKey: ['admin', 'openrouter'],
    queryFn: () => adminApi<OpenRouterAdminSnapshot>('openrouter'),
    refetchInterval: 60_000,
  });

  const or = openrouterQuery.data;
  const availableUsd = or?.credits?.available;
  const availableRub =
    availableUsd != null && or?.fx?.usdRub != null
      ? availableUsd * or.fx.usdRub
      : null;

  const seriesDaily = or?.seriesDaily ?? [];
  const spendSpark = seriesDaily.map((row) => ({
    date: row.date,
    usageUsd: row.usageUsd,
  }));
  const totalSpend30d = seriesDaily.reduce((acc, p) => acc + p.usageUsd, 0);
  const totalRequests30d = seriesDaily.reduce((acc, p) => acc + p.requests, 0);

  const fxFooter =
    or?.fx != null
      ? `Курс ${or.fx.usdRub.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ₽/$ на ${or.fx.asOf} · ${formatFxSource(or.fx.source)}`
      : or?.errors?.fx
        ? `Курс недоступен (${or.errors.fx})`
        : null;

  return (
    <>
      <PageHeader
        subtitle="Баланс, расходы и прогноз OpenRouter"
        title="OpenRouter"
      />

      {openrouterQuery.error ? (
        <Alert
          description={openrouterQuery.error.message}
          message="Не удалось загрузить данные OpenRouter"
          showIcon
          type="error"
        />
      ) : null}

      {or?.errors?.credits === 'missing_management_key' ? (
        <Alert
          description="Задайте OPENROUTER_MANAGEMENT_API_KEY в ai-app, чтобы видеть баланс и расходы."
          message="Management API key не настроен"
          showIcon
          style={{ marginBottom: 12 }}
          type="warning"
        />
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          KPI
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={6} md={12} xs={24}>
            <Card
              className="admin-stat-card"
              loading={openrouterQuery.isLoading}
              size="small"
            >
              <Statistic
                title="Доступный баланс"
                value={formatUsd(availableUsd)}
              />
              {availableRub != null ? (
                <Typography.Text type="secondary">
                  {formatRubMoney(availableRub)}
                </Typography.Text>
              ) : null}
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card
              className="admin-stat-card"
              loading={openrouterQuery.isLoading}
              size="small"
            >
              <Statistic
                title="Расход 7 дней"
                value={formatUsd(or?.spend.last7DaysUsd)}
              />
              <Typography.Text type="secondary">
                {formatRubMoney(or?.spend.last7DaysRub)}
              </Typography.Text>
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card
              className="admin-stat-card"
              loading={openrouterQuery.isLoading}
              size="small"
            >
              <Statistic
                title="Расход 30 дней"
                value={formatUsd(or?.spend.last30DaysUsd)}
              />
              <Typography.Text type="secondary">
                {formatRubMoney(or?.spend.last30DaysRub)}
              </Typography.Text>
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card
              className="admin-stat-card"
              loading={openrouterQuery.isLoading}
              size="small"
            >
              <Statistic
                title="Средняя стоимость / ген."
                value={formatUsd(or?.avgCostPerGeneration.usd)}
              />
              <Typography.Text type="secondary">
                {formatRubMoney(or?.avgCostPerGeneration.rub)} ·{' '}
                {formatInt(or?.avgCostPerGeneration.generations30d)} ген.
              </Typography.Text>
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card
              className="admin-stat-card"
              loading={openrouterQuery.isLoading}
              size="small"
            >
              <Statistic
                title="Прогноз (runway)"
                value={or ? formatRunway(or.runway) : '—'}
              />
              {or?.runway.basedOn ? (
                <Typography.Text type="secondary">
                  Средний расход/день {formatUsd(or.runway.avgDailySpendUsd)} ·
                  по {or.runway.basedOn === '7d' ? '7 дням' : '30 дням'}
                </Typography.Text>
              ) : null}
            </Card>
          </Col>
        </Row>
      </div>

      {or?.key ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Ключ API
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col lg={6} md={12} xs={24}>
              <Card className="admin-stat-card" size="small">
                <Statistic title="Метка" value={or.key.label || '—'} />
              </Card>
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Card className="admin-stat-card" size="small">
                <Statistic
                  title="Расход за день"
                  value={formatUsd(or.key.usageDaily)}
                />
              </Card>
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Card className="admin-stat-card" size="small">
                <Statistic
                  title="Расход за неделю"
                  value={formatUsd(or.key.usageWeekly)}
                />
              </Card>
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Card className="admin-stat-card" size="small">
                <Statistic
                  title="Расход за месяц"
                  value={formatUsd(or.key.usageMonthly)}
                />
              </Card>
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Card className="admin-stat-card" size="small">
                <Statistic
                  title="Остаток лимита"
                  value={
                    or.key.limitRemaining != null
                      ? formatUsd(or.key.limitRemaining)
                      : '—'
                  }
                />
                {or.key.limit != null ? (
                  <Typography.Text type="secondary">
                    Лимит {formatUsd(or.key.limit)}
                    {or.key.limitReset
                      ? ` · сброс ${or.key.limitReset}`
                      : null}
                  </Typography.Text>
                ) : null}
              </Card>
            </Col>
          </Row>
        </div>
      ) : or?.errors?.key ? (
        <Alert
          description={or.errors.key}
          message="Не удалось загрузить данные ключа"
          showIcon
          style={{ marginTop: 16 }}
          type="warning"
        />
      ) : null}

      {!openrouterQuery.error ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Расход по дням (30 дней)
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col span={24}>
              <SparklineCard
                data={spendSpark}
                height={180}
                loading={openrouterQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 30 дней: {formatUsd(totalSpend30d)} · запросов{' '}
                    {formatInt(totalRequests30d)}
                  </Typography.Text>
                }
                title="Расход, USD"
                valueFormatter={formatUsd}
                yFields={[{ key: 'usageUsd', label: 'Расход' }]}
              />
            </Col>
          </Row>
        </div>
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          По моделям (30 дней)
        </Typography.Title>
        <Card className="admin-stat-card" size="small">
          <Table
            columns={[
              {
                dataIndex: 'model',
                key: 'model',
                title: 'Модель',
              },
              {
                align: 'right',
                dataIndex: 'usageUsd',
                key: 'usageUsd',
                render: (v: number) => formatUsd(v),
                title: 'Расход',
              },
              {
                align: 'right',
                dataIndex: 'requests',
                key: 'requests',
                render: (v: number) => formatInt(v),
                title: 'Запросы',
              },
              {
                align: 'right',
                dataIndex: 'share',
                key: 'share',
                render: (v: number) => formatPct(v),
                title: 'Доля',
              },
            ]}
            dataSource={or?.byModel ?? []}
            loading={openrouterQuery.isLoading}
            pagination={false}
            rowKey="model"
            size="small"
          />
        </Card>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Токены (30 дней)
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={8} md={8} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={openrouterQuery.isLoading}
                title="Prompt"
                value={formatInt(or?.spend.promptTokens30d)}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={openrouterQuery.isLoading}
                title="Completion"
                value={formatInt(or?.spend.completionTokens30d)}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={openrouterQuery.isLoading}
                title="Reasoning"
                value={formatInt(or?.spend.reasoningTokens30d)}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {fxFooter ? (
        <Typography.Paragraph
          style={{ marginTop: 24, marginBottom: 0 }}
          type="secondary"
        >
          {fxFooter}
        </Typography.Paragraph>
      ) : null}
    </>
  );
}
