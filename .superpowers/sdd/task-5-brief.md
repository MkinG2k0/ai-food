### Task 5: Wire admin overview page

**Files:**
- Modify: `apps/ai-web/src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `adminApi`; `SparklineCard`; existing `Stats` totals type; series type matching `AdminStatsSeriesResponse`
- Produces: overview with totals + 3 sparklines; Usage section without 7/30 Statistic cards

- [ ] **Step 1: Replace page implementation**

Rewrite `apps/ai-web/src/app/admin/page.tsx` to:

```tsx
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
  usageAnalyzeLast7Days: number;
  usageRefineLast7Days: number;
  usageAnalyzeLast30Days: number;
  usageRefineLast30Days: number;
};

type StatsSeries = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{ date: string; sumKopecks: number; totalKopecks: number }>;
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
    queryKey: ['admin', 'stats', 'series'],
    queryFn: () => adminApi<StatsSeries>('stats/series?days=30'),
  });

  const data = statsQuery.data;
  const series = seriesQuery.data?.series;
  const usageAnalyzeSum =
    series?.usage.reduce((acc, p) => acc + p.analyze, 0) ?? 0;
  const usageRefineSum =
    series?.usage.reduce((acc, p) => acc + p.refine, 0) ?? 0;

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
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Всего пользователей"
                value={data?.usersTotal ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Активные подписки"
                value={data?.activeSubscriptions ?? 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          {!seriesQuery.error ? (
            <Col lg={12} md={24} sm={24} xs={24}>
              <SparklineCard
                data={series?.users ?? []}
                loading={seriesQuery.isLoading}
                title="Пользователи за 30 дней"
                yFields={[
                  { key: 'new', label: 'Новые' },
                  { key: 'total', label: 'Всего' },
                ]}
              />
            </Col>
          ) : null}
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Платежи
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={6} md={12} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={statsQuery.isLoading}
                title="Подтверждённые платежи"
                value={data?.paymentsConfirmedCount ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={12} sm={12} xs={24}>
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
          {!seriesQuery.error ? (
            <Col lg={12} md={24} sm={24} xs={24}>
              <SparklineCard
                data={series?.payments ?? []}
                loading={seriesQuery.isLoading}
                title="Сумма платежей за 30 дней"
                valueFormatter={formatRubles}
                yFields={[
                  { key: 'sumKopecks', label: 'За день' },
                  { key: 'totalKopecks', label: 'Накопительно' },
                ]}
              />
            </Col>
          ) : null}
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Usage
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          {!seriesQuery.error ? (
            <Col span={24}>
              <SparklineCard
                data={series?.usage ?? []}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 30 дней: анализы {usageAnalyzeSum}, уточнения{' '}
                    {usageRefineSum}
                  </Typography.Text>
                }
                title="Usage за 30 дней"
                yFields={[
                  { key: 'analyze', label: 'Анализы' },
                  { key: 'refine', label: 'Уточнения' },
                ]}
              />
            </Col>
          ) : null}
        </Row>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: PASS

- [ ] **Step 3: Manual smoke (when gateway + ai-web running)**

1. Open `/admin` (logged in)
2. See totals + three sparklines; no «Анализы за 7/30 дней» cards
3. Click each sparkline → Modal with large chart; Esc closes

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): show overview sparklines with modal charts

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `GET /admin/stats/series`, days clamp 7–90, UTC days | 1–2 |
| users new+total, payments sum+total, usage analyze+refine | 1 |
| Absolute cumulative includes before window | 1 tests |
| BFF proxy | 3 |
| `@ant-design/plots`, SparklineCard, ChartModal | 4 |
| Overview layout: keep totals, replace Usage 4 cards | 5 |
| Series error Alert without breaking totals | 5 |
| Gateway tests + ai-web type-check | 1–2, 4–5 |

No TBD/placeholder steps remain. Types `AdminStatsSeriesResponse` / page `StatsSeries` aligned on field names `new`, `total`, `sumKopecks`, `totalKopecks`, `analyze`, `refine`.
