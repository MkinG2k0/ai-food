# Admin Overview Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 30-day sparkline charts (users, payments, usage) on admin «Обзор» with click-to-open Modal detail charts.

**Architecture:** New gateway `GET /admin/stats/series` builds daily UTC series via a pure helper + Prisma fetches; BFF proxies at `/api/admin/gateway/stats/series`; admin overview uses `@ant-design/plots` Line in `SparklineCard` / `ChartModal`. Existing `/admin/stats` totals stay unchanged; four Usage 7/30 Statistic cards are replaced by one usage chart.

**Tech Stack:** Express + Prisma + Vitest (`openrouter-gateway`); Next.js 15, Ant Design 5, `@ant-design/plots`, TanStack Query (`ai-web`); pnpm.

**Spec:** `docs/superpowers/specs/2026-08-07-admin-overview-charts-design.md`

## Global Constraints

- Period default: **30** days; query `days` clamped to **[7, 90]**.
- Calendar days in **UTC** (`YYYY-MM-DD`); arrays always length === `days`, zeros for empty days.
- Users: `new` (registrations that day) + `total` (absolute cumulative `createdAt <= end of day`, includes before window).
- Payments: confirmed only; day from `paidAt ?? createdAt`; `sumKopecks` daily + `totalKopecks` absolute cumulative.
- Usage: `analyze` = `kind` starts with `analyze`; `refine` = `kind === 'refine'`; two daily series, no cumulative.
- Keep `/admin/stats` response shape unchanged.
- UI copy Russian; dark Ant Design admin theme; no marketing palette.
- Charts via `@ant-design/plots` only (not recharts).
- Verification: `pnpm --filter openrouter-gateway test`; `pnpm --filter ai-web type-check`.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/lib/adminStatsSeries.ts` | Pure day-bucket builder + clamp `days` |
| `apps/ai-app/src/lib/adminStatsSeries.test.ts` | Unit tests for series math |
| `apps/ai-app/src/routes/admin.ts` | `GET /stats/series` handler |
| `apps/ai-app/src/routes/admin.test.ts` | Route smoke + auth for `/stats/series` |
| `apps/ai-web/src/app/api/admin/gateway/stats/series/route.ts` | BFF GET proxy |
| `apps/ai-web/package.json` | Add `@ant-design/plots` |
| `apps/ai-web/src/components/SparklineCard.tsx` | Mini chart card + opens modal |
| `apps/ai-web/src/components/ChartModal.tsx` | Large chart Modal |
| `apps/ai-web/src/app/admin/page.tsx` | Wire stats + series queries and layout |

---

### Task 1: Pure series builder + unit tests

**Files:**
- Create: `apps/ai-app/src/lib/adminStatsSeries.ts`
- Create: `apps/ai-app/src/lib/adminStatsSeries.test.ts`

**Interfaces:**
- Consumes: none (pure)
- Produces:
  - `clampSeriesDays(raw: unknown): number` — default 30, clamp 7–90
  - `utcDayKey(d: Date): string` — `YYYY-MM-DD` UTC
  - `buildAdminStatsSeries(input: BuildAdminStatsSeriesInput): AdminStatsSeriesResponse`

```ts
export type AdminStatsSeriesResponse = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{ date: string; sumKopecks: number; totalKopecks: number }>;
    usage: Array<{ date: string; analyze: number; refine: number }>;
  };
};

export type BuildAdminStatsSeriesInput = {
  days: number;
  now: Date;
  userCreatedAts: Date[];
  payments: Array<{ amount: number; at: Date }>;
  usageEvents: Array<{ kind: string; at: Date }>;
};
```

- [ ] **Step 1: Write failing unit tests**

Create `apps/ai-app/src/lib/adminStatsSeries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildAdminStatsSeries,
  clampSeriesDays,
  utcDayKey,
} from './adminStatsSeries.js';

describe('clampSeriesDays', () => {
  it('defaults to 30', () => {
    expect(clampSeriesDays(undefined)).toBe(30);
    expect(clampSeriesDays('')).toBe(30);
    expect(clampSeriesDays('nope')).toBe(30);
  });

  it('clamps to 7..90', () => {
    expect(clampSeriesDays(3)).toBe(7);
    expect(clampSeriesDays(7)).toBe(7);
    expect(clampSeriesDays(30)).toBe(30);
    expect(clampSeriesDays(90)).toBe(90);
    expect(clampSeriesDays(100)).toBe(90);
    expect(clampSeriesDays('45')).toBe(45);
  });
});

describe('buildAdminStatsSeries', () => {
  // Fixed "now": 2026-08-07T12:00:00.000Z → last day key 2026-08-07
  const now = new Date('2026-08-07T12:00:00.000Z');

  it('returns days-length arrays with UTC keys ending at today', () => {
    const result = buildAdminStatsSeries({
      days: 7,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
    });
    expect(result.days).toBe(7);
    expect(result.series.users).toHaveLength(7);
    expect(result.series.users[6]?.date).toBe('2026-08-07');
    expect(result.series.users[0]?.date).toBe('2026-08-01');
    expect(result.series.users.every((p) => p.new === 0 && p.total === 0)).toBe(
      true,
    );
  });

  it('counts new users and absolute cumulative totals', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [
        new Date('2026-07-01T00:00:00.000Z'), // before window → total base
        new Date('2026-08-05T10:00:00.000Z'),
        new Date('2026-08-07T01:00:00.000Z'),
        new Date('2026-08-07T23:00:00.000Z'),
      ],
      payments: [],
      usageEvents: [],
    });
    // days: 08-05, 08-06, 08-07
    expect(result.series.users).toEqual([
      { date: '2026-08-05', new: 1, total: 2 },
      { date: '2026-08-06', new: 0, total: 2 },
      { date: '2026-08-07', new: 2, total: 4 },
    ]);
  });

  it('sums confirmed payment day amounts and absolute cumulative', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [],
      payments: [
        { amount: 1000, at: new Date('2026-07-01T00:00:00.000Z') },
        { amount: 500, at: new Date('2026-08-06T12:00:00.000Z') },
        { amount: 200, at: new Date('2026-08-07T12:00:00.000Z') },
      ],
      usageEvents: [],
    });
    expect(result.series.payments).toEqual([
      { date: '2026-08-05', sumKopecks: 0, totalKopecks: 1000 },
      { date: '2026-08-06', sumKopecks: 500, totalKopecks: 1500 },
      { date: '2026-08-07', sumKopecks: 200, totalKopecks: 1700 },
    ]);
  });

  it('buckets analyze* and refine usage separately', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [
        { kind: 'analyze_photo', at: new Date('2026-08-06T01:00:00.000Z') },
        { kind: 'analyze', at: new Date('2026-08-07T01:00:00.000Z') },
        { kind: 'refine', at: new Date('2026-08-07T02:00:00.000Z') },
        { kind: 'manual', at: new Date('2026-08-07T03:00:00.000Z') },
      ],
    });
    expect(result.series.usage).toEqual([
      { date: '2026-08-06', analyze: 1, refine: 0 },
      { date: '2026-08-07', analyze: 1, refine: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/adminStatsSeries.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement `adminStatsSeries.ts`**

Create `apps/ai-app/src/lib/adminStatsSeries.ts`:

```ts
export type AdminStatsSeriesResponse = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{ date: string; sumKopecks: number; totalKopecks: number }>;
    usage: Array<{ date: string; analyze: number; refine: number }>;
  };
};

export type BuildAdminStatsSeriesInput = {
  days: number;
  now: Date;
  userCreatedAts: Date[];
  payments: Array<{ amount: number; at: Date }>;
  usageEvents: Array<{ kind: string; at: Date }>;
};

export function clampSeriesDays(raw: unknown): number {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(7, Math.trunc(n)));
}

export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDayStart(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function addUtcDays(key: string, delta: number): string {
  const d = utcDayStart(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDayKey(d);
}

function enumerateUtcDays(now: Date, days: number): string[] {
  const end = utcDayKey(now);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(addUtcDays(end, -i));
  }
  return keys;
}

export function buildAdminStatsSeries(
  input: BuildAdminStatsSeriesInput,
): AdminStatsSeriesResponse {
  const days = clampSeriesDays(input.days);
  const keys = enumerateUtcDays(input.now, days);
  const firstStart = utcDayStart(keys[0]!);

  const newByDay = new Map<string, number>();
  let totalBefore = 0;
  for (const at of input.userCreatedAts) {
    const key = utcDayKey(at);
    if (at < firstStart) {
      totalBefore += 1;
      continue;
    }
    if (!keys.includes(key)) continue;
    newByDay.set(key, (newByDay.get(key) ?? 0) + 1);
  }

  const sumByDay = new Map<string, number>();
  let payBefore = 0;
  for (const p of input.payments) {
    const key = utcDayKey(p.at);
    if (p.at < firstStart) {
      payBefore += p.amount;
      continue;
    }
    if (!keys.includes(key)) continue;
    sumByDay.set(key, (sumByDay.get(key) ?? 0) + p.amount);
  }

  const analyzeByDay = new Map<string, number>();
  const refineByDay = new Map<string, number>();
  for (const e of input.usageEvents) {
    const key = utcDayKey(e.at);
    if (!keys.includes(key)) continue;
    if (e.kind.startsWith('analyze')) {
      analyzeByDay.set(key, (analyzeByDay.get(key) ?? 0) + 1);
    } else if (e.kind === 'refine') {
      refineByDay.set(key, (refineByDay.get(key) ?? 0) + 1);
    }
  }

  let runningUsers = totalBefore;
  let runningPay = payBefore;
  const users = keys.map((date) => {
    const neu = newByDay.get(date) ?? 0;
    runningUsers += neu;
    return { date, new: neu, total: runningUsers };
  });
  const payments = keys.map((date) => {
    const sumKopecks = sumByDay.get(date) ?? 0;
    runningPay += sumKopecks;
    return { date, sumKopecks, totalKopecks: runningPay };
  });
  const usage = keys.map((date) => ({
    date,
    analyze: analyzeByDay.get(date) ?? 0,
    refine: refineByDay.get(date) ?? 0,
  }));

  return { days, series: { users, payments, usage } };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/adminStatsSeries.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/adminStatsSeries.ts apps/ai-app/src/lib/adminStatsSeries.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): add pure stats series day-bucket builder

EOF
)"
```

---

### Task 2: Gateway `GET /admin/stats/series`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `buildAdminStatsSeries`, `clampSeriesDays` from `../lib/adminStatsSeries.js`; `requireDb()`; Prisma `user.findMany`, `payment.findMany`, `usageEvent.findMany`
- Produces: `GET /admin/stats/series?days=30` → `AdminStatsSeriesResponse` JSON

- [ ] **Step 1: Extend mock prisma for series fetches + add failing route test**

In `apps/ai-app/src/routes/admin.test.ts`:

1. Extend `user.findMany` so when `select: { createdAt: true }` (or equivalent), return `users.map(u => ({ createdAt: u.createdAt }))`. Keep existing behavior for other callers if needed — inspect current `findMany` usages; simplest: implement filtering by returning full users and let route map, OR make findMany return based on `select`.

Recommended mock change for `user.findMany`:

```ts
findMany: vi.fn(async (args: { select?: { createdAt?: boolean }; where?: unknown } = {}) => {
  if (args.select?.createdAt) {
    return users.map((u) => ({ createdAt: u.createdAt }));
  }
  // existing list behavior used by GET /admin/users — keep as today
  return [users[0]];
}),
```

2. Extend `payment.findMany` to honor `where: { status: 'confirmed' }` and `select: { amount, paidAt, createdAt }` — return matching payments (already has findMany; add status filter):

```ts
// inside findMany filter:
const filtered = payments.filter((payment) => {
  if (where?.userId && payment.userId !== where.userId) return false;
  if (where?.status && payment.status !== where.status) return false;
  return true;
});
```

Update the `where` type to include `status?: string`.

3. Extend `usageEvent.findMany` (if missing) to return `usageEvents` filtered by `createdAt.gte` when provided; with `select: { kind, createdAt }`.

Find existing `usageEvent` mock block and ensure `findMany` exists:

```ts
findMany: vi.fn(
  async ({
    where,
    select,
  }: {
    where?: { createdAt?: { gte?: Date } };
    select?: { kind?: boolean; createdAt?: boolean };
  } = {}) => {
    let rows = usageEvents;
    if (where?.createdAt?.gte) {
      const gte = where.createdAt.gte;
      rows = rows.filter((e) => e.createdAt >= gte);
    }
    if (select) {
      return rows.map((e) => ({
        kind: e.kind,
        createdAt: e.createdAt,
      }));
    }
    return rows;
  },
),
```

4. Add test after the existing `/admin/stats` tests:

```ts
it('GET /admin/stats/series returns day series shape', async () => {
  const response = await request(createApp())
    .get('/admin/stats/series?days=7')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body.days).toBe(7);
  expect(response.body.series.users).toHaveLength(7);
  expect(response.body.series.payments).toHaveLength(7);
  expect(response.body.series.usage).toHaveLength(7);
  expect(response.body.series.users[0]).toEqual(
    expect.objectContaining({
      date: expect.any(String),
      new: expect.any(Number),
      total: expect.any(Number),
    }),
  );
});

it('GET /admin/stats/series requires admin key', async () => {
  const response = await request(createApp()).get('/admin/stats/series');
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run route test — expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts -t "stats/series"`

Expected: FAIL (404 / missing route)

- [ ] **Step 3: Implement route**

In `apps/ai-app/src/routes/admin.ts`, add imports:

```ts
import {
  buildAdminStatsSeries,
  clampSeriesDays,
} from '../lib/adminStatsSeries.js';
```

Add handler **after** existing `GET /stats` block:

```ts
adminRouter.get(
  '/stats/series',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const days = clampSeriesDays(req.query.days);
    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [userRows, paymentRows, usageRows] = await Promise.all([
      prisma.user.findMany({ select: { createdAt: true } }),
      prisma.payment.findMany({
        where: { status: 'confirmed' },
        select: { amount: true, paidAt: true, createdAt: true },
      }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { kind: true, createdAt: true },
      }),
    ]);

    res.json(
      buildAdminStatsSeries({
        days,
        now,
        userCreatedAts: userRows.map((u) => u.createdAt),
        payments: paymentRows.map((p) => ({
          amount: p.amount,
          at: p.paidAt ?? p.createdAt,
        })),
        usageEvents: usageRows.map((e) => ({
          kind: e.kind,
          at: e.createdAt,
        })),
      }),
    );
  }),
);
```

Note: users/payments load all rows for absolute cumulative base (admin-scale OK per spec). Usage only needs window (and builder ignores out-of-window).

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts src/lib/adminStatsSeries.test.ts`

Expected: PASS (including existing `/admin/stats` tests)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): expose GET /admin/stats/series

EOF
)"
```

---

### Task 3: BFF proxy for stats series

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/stats/series/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin` from `@/lib/gatewayAdmin`
- Produces: `GET /api/admin/gateway/stats/series` → gateway `/admin/stats/series?days=…`

- [ ] **Step 1: Create route**

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get('days') ?? '30';
  return proxyGatewayAdmin(`stats/series?days=${encodeURIComponent(days)}`);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: PASS (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/stats/series/route.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): proxy admin stats series endpoint

EOF
)"
```

---

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
