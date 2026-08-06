'use client';

import { useState } from 'react';
import { Line } from '@ant-design/plots';
import { Card } from 'antd';

import {
  ChartModal,
  type ChartSeriesPoint,
  type ChartYField,
} from '@/components/ChartModal';

export type SparklineCardProps = {
  title: string;
  summary?: React.ReactNode;
  data: ChartSeriesPoint[];
  yFields: ChartYField[];
  loading?: boolean;
  valueFormatter?: (n: number) => string;
  height?: number;
};

export function SparklineCard({
  title,
  summary,
  data,
  yFields,
  loading,
  valueFormatter,
  height = 96,
}: SparklineCardProps) {
  const [open, setOpen] = useState(false);
  const plotData = data.flatMap((row) =>
    yFields.map((f) => ({
      date: row.date,
      value: Number(row[f.key] ?? 0),
      category: f.label,
    })),
  );

  return (
    <>
      <Card
        className="admin-stat-card"
        loading={loading}
        size="small"
        styles={{ body: { paddingBottom: 8 } }}
        title={title}
      >
        {summary ? <div style={{ marginBottom: 8 }}>{summary}</div> : null}
        <div
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', height }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <Line
            autoFit
            data={plotData}
            height={height}
            legend={false}
            seriesField="category"
            theme="classicDark"
            tooltip={false}
            xField="date"
            xAxis={false}
            yField="value"
            yAxis={false}
          />
        </div>
      </Card>
      <ChartModal
        data={data}
        open={open}
        title={title}
        valueFormatter={valueFormatter}
        yFields={yFields}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
