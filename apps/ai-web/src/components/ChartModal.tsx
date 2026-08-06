'use client';

import { Line } from '@ant-design/plots';
import { Modal } from 'antd';

export type ChartSeriesPoint = {
  date: string;
  [key: string]: string | number;
};

export type ChartYField = { key: string; label: string };

export type ChartModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  data: ChartSeriesPoint[];
  yFields: ChartYField[];
  valueFormatter?: (n: number) => string;
};

export function ChartModal({
  open,
  onClose,
  title,
  data,
  yFields,
  valueFormatter,
}: ChartModalProps) {
  const plotData = data.flatMap((row) =>
    yFields.map((f) => ({
      date: row.date,
      value: Number(row[f.key] ?? 0),
      category: f.label,
    })),
  );

  return (
    <Modal
      centered
      footer={null}
      open={open}
      title={title}
      width={840}
      onCancel={onClose}
    >
      <div style={{ height: 360 }}>
        <Line
          autoFit
          data={plotData}
          height={360}
          legend={{ position: 'top' }}
          colorField="category"
          seriesField="category"
          theme="classicDark"
          tooltip={{
            items: [
              {
                channel: 'y',
                valueFormatter: (value) =>
                  valueFormatter ? valueFormatter(Number(value)) : String(value),
              },
            ],
          }}
          xField="date"
          yField="value"
        />
      </div>
    </Modal>
  );
}
