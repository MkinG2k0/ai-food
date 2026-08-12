'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Card,
  Col,
  Row,
  Statistic,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { SparklineCard } from '@/components/SparklineCard';
import { adminApi } from '@/lib/adminApi';

type AdminRuntimeHealth = {
  status: 'ok' | 'degraded';
  uptimeSec: number;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  db: {
    ok: boolean;
    latencyMs: number | null;
  };
  eventLoopLagMs: number;
};

type ReliabilityPoint = {
  date: string;
  total: number;
  errorCount: number;
  errorRate: number;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
  p50TtfbMs: number | null;
  p95TtfbMs: number | null;
};

type StatsSeries = {
  days: number;
  series: {
    reliability?: ReliabilityPoint[];
  };
};

const formatBytes = (value: number) => {
  const mb = value / (1024 * 1024);
  return `${mb.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} МБ`;
};

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} с`;
  return `${s} с`;
};

const formatMs = (value: number | null | undefined) => {
  if (value == null) return '—';
  return `${Math.round(value).toLocaleString('ru-RU')} мс`;
};

const formatRate = (value: number) =>
  `${(value * 100).toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;

export default function AdminHealthPage() {
  const healthQuery = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => adminApi<AdminRuntimeHealth>('health'),
    refetchInterval: 15_000,
  });
  const seriesQuery = useQuery({
    queryKey: ['admin', 'stats', 'series', 7, 'reliability'],
    queryFn: () => adminApi<StatsSeries>('stats/series?days=7'),
  });

  const health = healthQuery.data;
  const reliability = seriesQuery.data?.series.reliability ?? [];
  const volumeSpark = reliability.map((row) => ({
    date: row.date,
    total: row.total,
  }));
  const errorRateSpark = reliability.map((row) => ({
    date: row.date,
    errorRate: Math.round(row.errorRate * 1000) / 10,
  }));
  const latencySpark = reliability.map((row) => ({
    date: row.date,
    p50DurationMs: row.p50DurationMs ?? 0,
    p95DurationMs: row.p95DurationMs ?? 0,
  }));
  const ttfbSpark = reliability.map((row) => ({
    date: row.date,
    p50TtfbMs: row.p50TtfbMs ?? 0,
    p95TtfbMs: row.p95TtfbMs ?? 0,
  }));
  const totalVolume = volumeSpark.reduce((acc, p) => acc + p.total, 0);
  const lastErrorRate = reliability[reliability.length - 1]?.errorRate ?? 0;

  return (
    <>
      <PageHeader
        subtitle="Живое состояние шлюза и тренды latency / ошибок"
        title="Стабильность"
      />
      {healthQuery.error ? (
        <Alert
          description={healthQuery.error.message}
          message="Не удалось загрузить живое состояние"
          showIcon
          type="error"
        />
      ) : null}
      {seriesQuery.error ? (
        <Alert
          description={seriesQuery.error.message}
          message="Не удалось загрузить тренды надёжности"
          showIcon
          style={{ marginTop: healthQuery.error ? 12 : 0 }}
          type="error"
        />
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Сейчас
        </Typography.Title>
        <Row className="admin-stat-row" gutter={[16, 16]}>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" loading={healthQuery.isLoading} size="small">
              <Statistic
                title="Статус"
                valueRender={() =>
                  health?.status === 'ok' ? (
                    <Tag color="success">OK</Tag>
                  ) : health?.status === 'degraded' ? (
                    <Tag color="warning">Деградация</Tag>
                  ) : (
                    <Tag>—</Tag>
                  )
                }
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="Аптайм"
                value={health ? formatUptime(health.uptimeSec) : '—'}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="DB ping"
                value={
                  health
                    ? health.db.ok
                      ? formatMs(health.db.latencyMs)
                      : 'недоступна'
                    : '—'
                }
                valueStyle={
                  health && !health.db.ok ? { color: '#cf1322' } : undefined
                }
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="Event loop lag"
                value={formatMs(health?.eventLoopLagMs)}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="RSS"
                value={health ? formatBytes(health.memory.rssBytes) : '—'}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="Heap used"
                value={health ? formatBytes(health.memory.heapUsedBytes) : '—'}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} sm={12} xs={24}>
            <Card className="admin-stat-card" size="small">
              <Statistic
                loading={healthQuery.isLoading}
                title="Heap total"
                value={health ? formatBytes(health.memory.heapTotalBytes) : '—'}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {!seriesQuery.error ? (
        <div>
          <Typography.Title className="admin-section-title" level={4}>
            Тренды за 7 дней
          </Typography.Title>
          <Row className="admin-stat-row" gutter={[16, 16]}>
            <Col lg={12} md={12} sm={24} xs={24}>
              <SparklineCard
                data={volumeSpark}
                height={140}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    За 7 дней: всего {totalVolume.toLocaleString('ru-RU')}
                  </Typography.Text>
                }
                title="Объём запросов"
                yFields={[{ key: 'total', label: 'Всего' }]}
              />
            </Col>
            <Col lg={12} md={12} sm={24} xs={24}>
              <SparklineCard
                data={errorRateSpark}
                height={140}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    Последний день: {formatRate(lastErrorRate)}
                  </Typography.Text>
                }
                title="Доля ошибок, %"
                valueFormatter={(n) => `${n}%`}
                yFields={[{ key: 'errorRate', label: 'Ошибки %' }]}
              />
            </Col>
            <Col lg={12} md={12} sm={24} xs={24}>
              <SparklineCard
                data={latencySpark}
                height={140}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    Duration p50 / p95 (мс)
                  </Typography.Text>
                }
                title="Duration p50 / p95"
                valueFormatter={(n) => `${Math.round(n)} мс`}
                yFields={[
                  { key: 'p50DurationMs', label: 'p50' },
                  { key: 'p95DurationMs', label: 'p95' },
                ]}
              />
            </Col>
            <Col lg={12} md={12} sm={24} xs={24}>
              <SparklineCard
                data={ttfbSpark}
                height={140}
                loading={seriesQuery.isLoading}
                summary={
                  <Typography.Text type="secondary">
                    TTFB p50 / p95 (мс)
                  </Typography.Text>
                }
                title="TTFB p50 / p95"
                valueFormatter={(n) => `${Math.round(n)} мс`}
                yFields={[
                  { key: 'p50TtfbMs', label: 'p50' },
                  { key: 'p95TtfbMs', label: 'p95' },
                ]}
              />
            </Col>
          </Row>
        </div>
      ) : null}
    </>
  );
}
