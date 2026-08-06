### Task 4: Chart components + dependency

**Files:**
- Modify: `apps/ai-web/package.json` (via pnpm add)
- Create: `apps/ai-web/src/components/ChartModal.tsx`
- Create: `apps/ai-web/src/components/SparklineCard.tsx`

**Interfaces:**
- Consumes: `Line` from `@ant-design/plots`; Ant Design `Card`, `Modal`, `Typography`
- Produces:
  - `ChartSeriesPoint = { date: string } & Record<string, number>`
  - `ChartModalProps = { open: boolean; onClose: () => void; title: string; data: ChartSeriesPoint[]; yFields: Array<{ key: string; label: string }>; valueFormatter?: (n: number) => string }`
  - `SparklineCardProps = { title: string; summary?: React.ReactNode; data: ChartSeriesPoint[]; yFields: Array<{ key: string; label: string }>; loading?: boolean; valueFormatter?: (n: number) => string; height?: number }`

- [ ] **Step 1: Install dependency**

From repo root:

```bash
pnpm --filter ai-web add @ant-design/plots
```

- [ ] **Step 2: Create `ChartModal.tsx`**

```tsx
'use client';

import { Line } from '@ant-design/plots';
import { Modal } from 'antd';

export type ChartSeriesPoint = { date: string } & Record<string, number>;

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
      destroyOnClose
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
          seriesField="category"
          tooltip={{
            formatter: (datum: { category?: string; value?: number }) => ({
              name: String(datum.category ?? ''),
              value: valueFormatter
                ? valueFormatter(Number(datum.value ?? 0))
                : String(datum.value ?? 0),
            }),
          }}
          xField="date"
          yField="value"
        />
      </div>
    </Modal>
  );
}
```

If `@ant-design/plots` Line API differs (v2 vs Ant Design Charts), adjust props to the installed package’s `Line` docs — keep fields: multi-series by category, x=`date`, y=`value`.

- [ ] **Step 3: Create `SparklineCard.tsx`**

```tsx
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
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: PASS. Fix Line prop types if the package’s typings reject `tooltip={false}` / `xAxis={false}` — use package-supported disable flags.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-web/package.json apps/ai-web/pnpm-lock.yaml pnpm-lock.yaml apps/ai-web/src/components/ChartModal.tsx apps/ai-web/src/components/SparklineCard.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add SparklineCard and ChartModal

EOF
)"
```

(Only stage lockfile paths that actually change.)

---

