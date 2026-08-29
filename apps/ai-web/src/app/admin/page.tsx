'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Skeleton,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { SparklineCard } from '@/components/SparklineCard';
import { adminApi } from '@/lib/adminApi';
import type { OpenRouterAdminSnapshot } from '@/lib/openrouterAdminTypes';

type OverviewAnalytics = {
  funnel: {
    guestsWithScans: number;
    users: number;
    payingUsers: number;
    userToPayRate: number | null;
  };
  revenue: {
    last7DaysKopecks: number;
    last30DaysKopecks: number;
  };
  paymentsByStatus: {
    pending: number;
    confirmed: number;
    rejected: number;
    refunded: number;
  };
  promo: {
    confirmedCount: number;
    confirmedSumKopecks: number;
  };
  referral: {
    confirmedCount: number;
  };
  subscriptions: {
    active: number;
    expiringSoon7Days: number;
    expiredOrInactive: number;
  };
  product: {
    dau: number;
    wau: number;
    usageMix30d: {
      analyze_photo: number;
      analyze_text: number;
      analyze_photo_text: number;
      analyze: number;
      refine: number;
      barcode: number;
      manual: number;
      other: number;
    };
    analyzeAuthShare30d: {
      withUser: number;
      guestOnly: number;
    };
    quotaExhausted: {
      users: number;
      guests: number;
      limitGuest: number;
      limitAuth: number;
    };
    retention: {
      cohortSize: number;
      d1Count: number;
      d7Count: number;
      d1Rate: number | null;
      d7Rate: number | null;
    };
  };
};

type Stats = {
  usersTotal: number;
  guestsWithScansTotal: number;
  usersAndGuestsTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
  analytics?: OverviewAnalytics;
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

const MIX_ROWS: Array<{
  key: keyof OverviewAnalytics['product']['usageMix30d'];
  label: string;
}> = [
  { key: 'analyze_photo', label: 'Фото' },
  { key: 'analyze_text', label: 'Текст' },
  { key: 'analyze_photo_text', label: 'Фото+текст' },
  { key: 'refine', label: 'Уточнения' },
  { key: 'manual', label: 'Вручную' },
  { key: 'barcode', label: 'Штрихкод' },
  { key: 'analyze', label: 'Legacy' },
  { key: 'other', label: 'Другое' },
];

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

const formatPct = (rate: number | null | undefined) =>
  rate == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 1,
        style: 'percent',
      }).format(rate);

const formatUsd = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(n);

const formatRubMoney = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
      }).format(n);

function formatRunway(runway: OpenRouterAdminSnapshot['runway']): string {
  if (runway.daysLeft != null && runway.monthsLeft != null) {
    const days = Math.round(runway.daysLeft);
    const months =
      runway.monthsLeft < 10
        ? runway.monthsLeft.toFixed(1)
        : String(Math.round(runway.monthsLeft));
    return `≈ ${days} дн. · ${months} мес.`;
  }
  if (runway.avgDailySpendUsd == null) {
    return '—';
  }
  if (runway.daysLeft == null && runway.avgDailySpendUsd < 1e-9) {
    return 'баланс не расходуется';
  }
  return '—';
}

function formatActivityError(code: string): string {
  if (code === 'missing_management_key') {
    return 'Задайте OPENROUTER_MANAGEMENT_API_KEY в ai-app, чтобы видеть расходы и историю.';
  }
  if (code === 'timeout') {
    return 'OpenRouter не ответил вовремя при загрузке истории расходов.';
  }
  return 'Не удалось загрузить историю расходов OpenRouter.';
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section">
      <Typography.Title className="admin-section-title" level={4}>
        {title}
      </Typography.Title>
      {description ? (
        <Typography.Paragraph className="admin-section-desc" type="secondary">
          {description}
        </Typography.Paragraph>
      ) : null}
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'ok' | 'warn';
  compact?: boolean;
}) {
  const valueClass = [
    'admin-metric__value',
    compact ? 'admin-metric__value--sm' : '',
    tone === 'ok' ? 'admin-metric__value--ok' : '',
    tone === 'warn' ? 'admin-metric__value--warn' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="admin-metric">
      <span className="admin-metric__label">{label}</span>
      <span className={valueClass}>{value}</span>
      {hint ? <span className="admin-metric__hint">{hint}</span> : null}
    </div>
  );
}

export default function AdminPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi<Stats>('stats'),
  });
  const seriesQuery = useQuery({
    queryKey: ['admin', 'stats', 'series', 7],
    queryFn: () => adminApi<StatsSeries>('stats/series?days=7'),
  });
  const openrouterQuery = useQuery({
    queryKey: ['admin', 'openrouter'],
    queryFn: () => adminApi<OpenRouterAdminSnapshot>('openrouter'),
    refetchInterval: 60_000,
  });

  const data = statsQuery.data;
  const or = openrouterQuery.data;
  const a = data?.analytics;
  const series = seriesQuery.data?.series;
  const loading = statsQuery.isLoading;

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

  const mix = a?.product.usageMix30d;
  const mixTotal = mix
    ? MIX_ROWS.reduce((sum, row) => sum + (mix[row.key] ?? 0), 0)
    : 0;
  const authShare = a?.product.analyzeAuthShare30d;
  const authTotal = (authShare?.withUser ?? 0) + (authShare?.guestOnly ?? 0);
  const authPct = authTotal
    ? Math.round(((authShare?.withUser ?? 0) / authTotal) * 1000) / 10
    : 0;
  const quotaHit =
    (a?.product.quotaExhausted.users ?? 0) +
    (a?.product.quotaExhausted.guests ?? 0);
  const activeSubs = data?.activeSubscriptions ?? 0;
  const expiring = a?.subscriptions.expiringSoon7Days ?? 0;
  const availableUsd = or?.credits?.available;
  const availableRub =
    availableUsd != null && or?.fx?.usdRub != null
      ? availableUsd * or.fx.usdRub
      : null;

  return (
    <div className="admin-overview">
      <PageHeader
        subtitle="Пользователи, продажи и продукт"
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

      <Section title="Пользователи">
        <Card className="admin-stat-card" loading={loading} size="small">
          <div className="admin-metric-grid admin-metric-grid--4">
            <Metric label="С аккаунтом" value={data?.usersTotal ?? 0} />
            <Metric
              label="Гости со сканами"
              value={data?.guestsWithScansTotal ?? 0}
            />
            <Metric label="Всего" value={data?.usersAndGuestsTotal ?? 0} />
            <Metric
              hint={
                activeSubs === 0 ? 'Нет активных лицензий' : undefined
              }
              label="Активные подписки"
              tone={activeSubs > 0 ? 'ok' : undefined}
              value={activeSubs}
            />
          </div>
        </Card>
      </Section>

      <Section title="Продажи">
        <Row gutter={[12, 12]}>
          <Col lg={14} md={24} xs={24}>
            <Card
              className="admin-stat-card"
              loading={loading}
              size="small"
              title="Воронка · гости → аккаунты → платящие"
            >
              {a ? (
                <div className="admin-funnel">
                  <div className="admin-funnel__step">
                    <span className="admin-funnel__label">Гости</span>
                    <span className="admin-funnel__value">
                      {a.funnel.guestsWithScans}
                    </span>
                  </div>
                  <div className="admin-funnel__step">
                    <span className="admin-funnel__label">Аккаунты</span>
                    <span className="admin-funnel__value">
                      {a.funnel.users}
                    </span>
                  </div>
                  <div className="admin-funnel__step">
                    <span className="admin-funnel__label">Платящие</span>
                    <span className="admin-funnel__value">
                      {a.funnel.payingUsers}
                    </span>
                    <span className="admin-funnel__rate">
                      конверсия {formatPct(a.funnel.userToPayRate)}
                    </span>
                  </div>
                </div>
              ) : (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              )}
            </Card>
          </Col>
          <Col lg={10} md={24} xs={24}>
            <Card
              className="admin-stat-card"
              loading={loading}
              size="small"
              title="Выручка"
            >
              <div className="admin-kv">
                <div className="admin-kv__row">
                  <span className="admin-kv__label">За 7 дней</span>
                  <span className="admin-kv__value">
                    {a ? formatRubles(a.revenue.last7DaysKopecks) : '—'}
                  </span>
                </div>
                <div className="admin-kv__row">
                  <span className="admin-kv__label">За 30 дней</span>
                  <span className="admin-kv__value">
                    {a ? formatRubles(a.revenue.last30DaysKopecks) : '—'}
                  </span>
                </div>
                <div className="admin-kv__row">
                  <span className="admin-kv__label">Всего подтверждено</span>
                  <span className="admin-kv__value">
                    {data
                      ? formatRubles(data.paymentsConfirmedSumKopecks)
                      : '—'}
                    <span className="admin-kv__sub">
                      платежей: {data?.paymentsConfirmedCount ?? 0}
                    </span>
                  </span>
                </div>
              </div>
            </Card>
          </Col>

          <Col span={24}>
            <Card className="admin-stat-card" loading={loading} size="small">
              <div className="admin-metric-grid admin-metric-grid--3">
                <div className="admin-metric">
                  <span className="admin-metric__label">Статусы платежей</span>
                  <div className="admin-status-row" style={{ marginTop: 6 }}>
                    <Tag color="success">
                      Ок {a?.paymentsByStatus.confirmed ?? 0}
                    </Tag>
                    <Tag color="processing">
                      Ожидают {a?.paymentsByStatus.pending ?? 0}
                    </Tag>
                    <Tag color="error">
                      Отказ {a?.paymentsByStatus.rejected ?? 0}
                    </Tag>
                    <Tag>
                      Возврат {a?.paymentsByStatus.refunded ?? 0}
                    </Tag>
                  </div>
                </div>
                <Metric
                  compact
                  hint={
                    a
                      ? `С промо ${formatRubles(a.promo.confirmedSumKopecks)} · рефералы ${a.referral.confirmedCount}`
                      : undefined
                  }
                  label="Промокоды"
                  value={a?.promo.confirmedCount ?? 0}
                />
                <Metric
                  compact
                  hint={`Истекают ≤7д: ${expiring} · истекли: ${a?.subscriptions.expiredOrInactive ?? 0}`}
                  label="Подписки активные"
                  tone={(a?.subscriptions.active ?? 0) > 0 ? 'ok' : undefined}
                  value={a?.subscriptions.active ?? 0}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Section>

      <Section title="Продукт">
        <Row gutter={[12, 12]}>
          <Col lg={12} md={24} xs={24}>
            <Card className="admin-stat-card" loading={loading} size="small">
              <div className="admin-metric-grid">
                <Metric
                  hint={`WAU: ${a?.product.wau ?? 0}`}
                  label="DAU (анализы)"
                  value={a?.product.dau ?? 0}
                />
                <Metric
                  hint={`Когорта ${a?.product.retention.cohortSize ?? 0}`}
                  label="Retention D1 / D7"
                  value={`${formatPct(a?.product.retention.d1Rate)} / ${formatPct(a?.product.retention.d7Rate)}`}
                />
                <Metric
                  hint={`Аккаунты ${a?.product.quotaExhausted.users ?? 0} · гости ${a?.product.quotaExhausted.guests ?? 0} · лимит ${a?.product.quotaExhausted.limitGuest ?? '—'}/${a?.product.quotaExhausted.limitAuth ?? '—'}`}
                  label="Упёрлись в лимит"
                  tone={quotaHit > 0 ? 'warn' : undefined}
                  value={quotaHit}
                />
                <div className="admin-metric">
                  <span className="admin-metric__label">
                    Доля с аккаунтом (30д)
                  </span>
                  <span className="admin-metric__value">
                    {authTotal ? `${authPct}%` : '—'}
                  </span>
                  <Progress
                    percent={authTotal ? authPct : 0}
                    showInfo={false}
                    size="small"
                    strokeColor="#1677ff"
                    style={{ margin: '4px 0' }}
                  />
                  <span className="admin-metric__hint">
                    С аккаунтом {authShare?.withUser ?? 0} · гости{' '}
                    {authShare?.guestOnly ?? 0}
                  </span>
                </div>
              </div>
            </Card>
          </Col>
          <Col lg={12} md={24} xs={24}>
            <Card
              className="admin-stat-card"
              loading={loading}
              size="small"
              title="Как пользуются · 30 дней"
            >
              {mix && mixTotal > 0 ? (
                <div className="admin-mix">
                  {MIX_ROWS.filter((row) => (mix[row.key] ?? 0) > 0).map(
                    (row) => {
                      const count = mix[row.key] ?? 0;
                      const pct = Math.round((count / mixTotal) * 1000) / 10;
                      return (
                        <div className="admin-mix__row" key={row.key}>
                          <div className="admin-mix__head">
                            <span className="admin-mix__label">
                              {row.label}
                            </span>
                            <span className="admin-mix__count">
                              {count}
                              <Typography.Text
                                type="secondary"
                                style={{ fontWeight: 400, marginLeft: 6 }}
                              >
                                {pct}%
                              </Typography.Text>
                            </span>
                          </div>
                          <Progress
                            className="admin-mix__bar"
                            percent={pct}
                            showInfo={false}
                            size="small"
                            strokeColor="#69b1ff"
                          />
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <Typography.Text type="secondary">
                  За 30 дней usage-событий пока нет
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>
      </Section>

      <Section title="OpenRouter">
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
        {or?.errors?.activity ? (
          <Alert
            description={formatActivityError(or.errors.activity)}
            message="Данные расходов недоступны"
            showIcon
            style={{ marginBottom: 12 }}
            type="warning"
          />
        ) : null}
        <Card
          className="admin-stat-card"
          loading={openrouterQuery.isLoading}
          size="small"
        >
          <Row gutter={[12, 12]}>
            <Col lg={6} md={12} xs={24}>
              <Metric
                hint={formatRubMoney(availableRub)}
                label="Доступный баланс"
                value={formatUsd(availableUsd)}
              />
            </Col>
            <Col lg={6} md={12} xs={24}>
              <div className="admin-kv">
                <div className="admin-kv__row">
                  <span className="admin-kv__label">Расход 7 дней</span>
                  <span className="admin-kv__value">
                    {formatUsd(or?.spend.last7DaysUsd)}
                    <span className="admin-kv__sub">
                      {formatRubMoney(or?.spend.last7DaysRub)}
                    </span>
                  </span>
                </div>
                <div className="admin-kv__row">
                  <span className="admin-kv__label">Расход 30 дней</span>
                  <span className="admin-kv__value">
                    {formatUsd(or?.spend.last30DaysUsd)}
                    <span className="admin-kv__sub">
                      {formatRubMoney(or?.spend.last30DaysRub)}
                    </span>
                  </span>
                </div>
              </div>
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Metric
                hint={
                  or
                    ? `${formatRubMoney(or.avgCostPerGeneration.rub)} · ${or.avgCostPerGeneration.generations30d} ген.`
                    : undefined
                }
                label="Средняя стоимость / ген."
                value={formatUsd(or?.avgCostPerGeneration.usd)}
              />
            </Col>
            <Col lg={6} md={12} xs={24}>
              <Metric
                hint={
                  or?.runway.basedOn
                    ? `Средний расход/день ${formatUsd(or.runway.avgDailySpendUsd)} · по ${or.runway.basedOn === '7d' ? '7 дням' : '30 дням'}`
                    : undefined
                }
                label="Прогноз (runway)"
                value={or ? formatRunway(or.runway) : '—'}
              />
            </Col>
          </Row>
          <Typography.Link href="/admin/openrouter" style={{ marginTop: 12 }}>
            Подробная аналитика OpenRouter →
          </Typography.Link>
        </Card>
      </Section>

      {!seriesQuery.error ? (
        <Section title="Динамика за 7 дней">
          <Row gutter={[12, 12]}>
            <Col lg={8} md={24} xs={24}>
              <SparklineCard
                data={series?.users ?? []}
                height={180}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    Новых {usersNewSum} · всего {usersTotalLatest}
                  </Typography.Text>
                }
                title="Пользователи"
                yFields={[
                  { key: 'new', label: 'Новые' },
                  { key: 'total', label: 'Всего' },
                ]}
              />
            </Col>
            <Col lg={8} md={24} xs={24}>
              <SparklineCard
                data={series?.payments ?? []}
                height={180}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    Период {formatRubles(paymentsPeriodSum)} · всего{' '}
                    {formatRubles(paymentsTotalLatest)}
                  </Typography.Text>
                }
                title="Выручка"
                valueFormatter={formatRubles}
                yFields={[
                  { key: 'sumKopecks', label: 'За день' },
                  { key: 'totalKopecks', label: 'Накопительно' },
                ]}
              />
            </Col>
            <Col lg={8} md={24} xs={24}>
              <SparklineCard
                data={series?.usage ?? []}
                height={180}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    Анализы {usageAnalyzeSum} · уточнения {usageRefineSum}
                  </Typography.Text>
                }
                title="Анализы"
                yFields={[
                  { key: 'analyze', label: 'Анализы' },
                  { key: 'refine', label: 'Уточнения' },
                ]}
              />
            </Col>
          </Row>
        </Section>
      ) : null}
    </div>
  );
}
