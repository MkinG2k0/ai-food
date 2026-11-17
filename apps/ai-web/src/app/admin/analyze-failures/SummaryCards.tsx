import { Card, Col, Row, Statistic } from 'antd';

import type { AnalyzeFailureList } from './types';

interface SummaryCardsProps {
  summary: AnalyzeFailureList['summary'] | undefined;
  summaryWindowDays: number;
  loading: boolean;
}

export function SummaryCards({
  summary,
  summaryWindowDays,
  loading,
}: SummaryCardsProps) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title={`Всего (${summaryWindowDays}д)`}
            value={summary?.total ?? 0}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="In-flight / stale"
            value={summary?.inFlightCount ?? 0}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Terminal"
            value={summary?.terminalCount ?? 0}
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card>
          <Statistic
            title="Уник. users / devices"
            value={`${summary?.uniqueUsers ?? 0} / ${summary?.uniqueDevices ?? 0}`}
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  );
}
