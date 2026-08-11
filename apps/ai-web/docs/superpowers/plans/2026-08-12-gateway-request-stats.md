# Gateway Request Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every OpenRouter proxy call as `GatewayRequest` with TTFB + total duration, expose count/latency (avg/p50/p95) by type on admin stats, and show a «Запросы» section on `ai-web` overview.

**Architecture:** New Prisma model + `recordGatewayRequest` / timer helper in `ai-app`. Route handlers (food/chat/embeddings/models) start a timer after validation and finish in `finally`. Admin `/stats` and `/stats/series` aggregate in-process. `ai-web` only consumes existing proxies.

**Tech Stack:** Prisma 7 + Postgres, Express, Vitest + supertest, Next.js + Ant Design + TanStack Query (`ai-web`).

**Spec:** `apps/ai-web/docs/superpowers/specs/2026-08-12-gateway-request-stats-design.md`

## Global Constraints

- Separate `GatewayRequest` table — do **not** extend `UsageEvent`.
- Types: `food_analyze` | `food_refine` | `food_ask` | `chat_completions` | `embeddings` | `models`.
- Record only OpenRouter proxy routes; skip validation failures before upstream.
- TTFB = first SSE `res.write` or moment before `res.json`; non-stream success ⇒ `ttfbMs === durationMs`.
- Latency metrics only over `ok === true` rows with non-null fields.
- `byType` on `/admin/stats` = last **30 days**.
- UI cards: requests 7d, requests 30d, errors 7d.
- Recording must never throw into the client path (log + swallow).
- If DB unavailable (`getPrisma()` null) → skip write silently.
- No retention prune, alerts, user-detail latency, or separate Requests page.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/prisma/schema.prisma` | `GatewayRequest` model |
| `apps/ai-app/prisma/migrations/20260812120000_gateway_request/migration.sql` | SQL migration |
| `apps/ai-app/src/lib/gatewayRequestTypes.ts` | Type union + constants |
| `apps/ai-app/src/lib/percentile.ts` | avg + p50/p95 helpers |
| `apps/ai-app/src/lib/percentile.test.ts` | Unit tests |
| `apps/ai-app/src/lib/recordGatewayRequest.ts` | Persist + timer |
| `apps/ai-app/src/lib/recordGatewayRequest.test.ts` | Unit tests |
| `apps/ai-app/src/lib/gatewayRequestStats.ts` | Aggregate stats + series buckets |
| `apps/ai-app/src/lib/gatewayRequestStats.test.ts` | Unit tests |
| `apps/ai-app/src/lib/adminStatsSeries.ts` | Add `requests` series |
| `apps/ai-app/src/lib/adminStatsSeries.test.ts` | Extend series tests |
| `apps/ai-app/src/routes/food.ts` | Instrument analyze/refine/ask |
| `apps/ai-app/src/routes/chat.ts` | Instrument chat completions |
| `apps/ai-app/src/routes/embeddings.ts` | Instrument embeddings |
| `apps/ai-app/src/routes/models.ts` | Instrument models.list |
| `apps/ai-app/src/routes/admin.ts` | Extend `/stats` + `/stats/series` |
| `apps/ai-app/src/routes/admin.test.ts` | Assert `requests` shape |
| `apps/ai-app/src/routes/food.test.ts` | Assert recording on success (mock) |
| `apps/ai-web/src/app/admin/page.tsx` | «Запросы» UI |

---

### Task 1: Prisma `GatewayRequest` model + migration

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260812120000_gateway_request/migration.sql`

**Interfaces:**
- Consumes: none
- Produces: Prisma model `GatewayRequest` with fields below

- [ ] **Step 1: Add model to schema**

Append to `apps/ai-app/prisma/schema.prisma` (no relations required in v1):

```prisma
model GatewayRequest {
  id         String   @id @default(cuid())
  type       String
  stream     Boolean  @default(false)
  ok         Boolean
  ttfbMs     Int?
  durationMs Int?
  userId     String?
  deviceId   String?
  createdAt  DateTime @default(now())

  @@index([createdAt, type])
  @@index([type, createdAt])
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260812120000_gateway_request/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "GatewayRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stream" BOOLEAN NOT NULL DEFAULT false,
    "ok" BOOLEAN NOT NULL,
    "ttfbMs" INTEGER,
    "durationMs" INTEGER,
    "userId" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GatewayRequest_createdAt_type_idx" ON "GatewayRequest"("createdAt", "type");

-- CreateIndex
CREATE INDEX "GatewayRequest_type_createdAt_idx" ON "GatewayRequest"("type", "createdAt");
```

- [ ] **Step 3: Generate client**

Run from `apps/ai-app`:

```bash
pnpm prisma:generate
```

Expected: exit 0; `GatewayRequest` available on generated client.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260812120000_gateway_request
git commit -m "feat(ai-app): add GatewayRequest model for latency telemetry"
```

---

### Task 2: Percentile + avg helpers

**Files:**
- Create: `apps/ai-app/src/lib/percentile.ts`
- Create: `apps/ai-app/src/lib/percentile.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export function average(values: number[]): number | null`
  - `export function percentileSorted(sortedAsc: number[], p: number): number | null`
  - `export function p50(values: number[]): number | null`
  - `export function p95(values: number[]): number | null`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { average, p50, p95, percentileSorted } from './percentile.js';

describe('percentile helpers', () => {
  it('returns null for empty', () => {
    expect(average([])).toBeNull();
    expect(p50([])).toBeNull();
    expect(p95([])).toBeNull();
  });

  it('average is arithmetic mean', () => {
    expect(average([10, 20, 30])).toBe(20);
  });

  it('p50 / p95 nearest-rank on 1..10', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // index = ceil(p/100 * n) - 1 → p50:4 → 5; p95:9 → 10
    expect(p50(values)).toBe(5);
    expect(p95(values)).toBe(10);
    expect(percentileSorted([...values], 50)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/percentile.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** `sortedAsc` must already be sorted ascending. */
export function percentileSorted(sortedAsc: number[], p: number): number | null {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const idx = Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
  return sortedAsc[idx]!;
}

export function p50(values: number[]): number | null {
  if (values.length === 0) return null;
  return percentileSorted([...values].sort((a, b) => a - b), 50);
}

export function p95(values: number[]): number | null {
  if (values.length === 0) return null;
  return percentileSorted([...values].sort((a, b) => a - b), 95);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/percentile.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/percentile.ts apps/ai-app/src/lib/percentile.test.ts
git commit -m "feat(ai-app): add avg/p50/p95 helpers for gateway latency"
```

---

### Task 3: `recordGatewayRequest` + timer

**Files:**
- Create: `apps/ai-app/src/lib/gatewayRequestTypes.ts`
- Create: `apps/ai-app/src/lib/recordGatewayRequest.ts`
- Create: `apps/ai-app/src/lib/recordGatewayRequest.test.ts`

**Interfaces:**
- Consumes: `getPrisma` from `../lib/prisma.js`
- Produces:
  - `export const GATEWAY_REQUEST_TYPES = [...] as const`
  - `export type GatewayRequestType = (typeof GATEWAY_REQUEST_TYPES)[number]`
  - `export type RecordGatewayRequestInput = { type: GatewayRequestType; stream: boolean; ok: boolean; ttfbMs: number | null; durationMs: number | null; userId?: string | null; deviceId?: string | null }`
  - `export async function recordGatewayRequest(input: RecordGatewayRequestInput): Promise<void>`
  - `export type GatewayRequestTimer = { markTtfb: () => void; finish: (opts: { ok: boolean; type: GatewayRequestType; stream: boolean; userId?: string | null; deviceId?: string | null }) => void }`
  - `export function startGatewayRequestTimer(): GatewayRequestTimer`

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('../lib/prisma.js', () => ({
  getPrisma: () => ({ gatewayRequest: { create } }),
}));

const { recordGatewayRequest, startGatewayRequestTimer } = await import(
  './recordGatewayRequest.js'
);

describe('recordGatewayRequest', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: '1' });
  });

  it('creates a row', async () => {
    await recordGatewayRequest({
      type: 'food_refine',
      stream: false,
      ok: true,
      ttfbMs: 100,
      durationMs: 100,
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        type: 'food_refine',
        stream: false,
        ok: true,
        ttfbMs: 100,
        durationMs: 100,
        userId: 'u1',
        deviceId: 'd1',
      },
    });
  });

  it('swallows create errors', async () => {
    create.mockRejectedValue(new Error('db down'));
    await expect(
      recordGatewayRequest({
        type: 'models',
        stream: false,
        ok: false,
        ttfbMs: null,
        durationMs: 5,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('startGatewayRequestTimer', () => {
  it('finish records duration and optional ttfb', async () => {
    vi.useFakeTimers();
    const timer = startGatewayRequestTimer();
    vi.advanceTimersByTime(40);
    timer.markTtfb();
    vi.advanceTimersByTime(60);
    timer.finish({
      ok: true,
      type: 'chat_completions',
      stream: true,
    });
    await vi.runAllTimersAsync();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'chat_completions',
        stream: true,
        ok: true,
        ttfbMs: 40,
        durationMs: 100,
      }),
    });
    vi.useRealTimers();
  });
});
```

Note: `finish` should fire-and-forget `void recordGatewayRequest(...)` so callers need not await; in tests use `await vi.runAllTimersAsync()` or make `finish` return the promise for testability — **prefer `finish` returns `Promise<void>`** and routes `void timer.finish(...)`.

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/recordGatewayRequest.test.ts
```

- [ ] **Step 3: Implement types + recorder**

`gatewayRequestTypes.ts`:

```ts
export const GATEWAY_REQUEST_TYPES = [
  'food_analyze',
  'food_refine',
  'food_ask',
  'chat_completions',
  'embeddings',
  'models',
] as const;

export type GatewayRequestType = (typeof GATEWAY_REQUEST_TYPES)[number];
```

`recordGatewayRequest.ts`:

```ts
import { getPrisma } from '../lib/prisma.js';
import type { GatewayRequestType } from './gatewayRequestTypes.js';

export type RecordGatewayRequestInput = {
  type: GatewayRequestType;
  stream: boolean;
  ok: boolean;
  ttfbMs: number | null;
  durationMs: number | null;
  userId?: string | null;
  deviceId?: string | null;
};

export async function recordGatewayRequest(
  input: RecordGatewayRequestInput,
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.gatewayRequest.create({
      data: {
        type: input.type,
        stream: input.stream,
        ok: input.ok,
        ttfbMs: input.ttfbMs,
        durationMs: input.durationMs,
        userId: input.userId ?? null,
        deviceId: input.deviceId ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to record GatewayRequest:', err);
  }
}

export type GatewayRequestTimer = {
  markTtfb: () => void;
  finish: (opts: {
    ok: boolean;
    type: GatewayRequestType;
    stream: boolean;
    userId?: string | null;
    deviceId?: string | null;
  }) => Promise<void>;
};

export function startGatewayRequestTimer(): GatewayRequestTimer {
  const startedAt = Date.now();
  let ttfbMs: number | null = null;
  return {
    markTtfb() {
      if (ttfbMs == null) ttfbMs = Date.now() - startedAt;
    },
    finish(opts) {
      return recordGatewayRequest({
        type: opts.type,
        stream: opts.stream,
        ok: opts.ok,
        ttfbMs,
        durationMs: Date.now() - startedAt,
        userId: opts.userId,
        deviceId: opts.deviceId,
      });
    },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/recordGatewayRequest.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/gatewayRequestTypes.ts apps/ai-app/src/lib/recordGatewayRequest.ts apps/ai-app/src/lib/recordGatewayRequest.test.ts
git commit -m "feat(ai-app): record GatewayRequest with TTFB/total timer"
```

---

### Task 4: Instrument OpenRouter routes

**Files:**
- Modify: `apps/ai-app/src/routes/food.ts`
- Modify: `apps/ai-app/src/routes/chat.ts`
- Modify: `apps/ai-app/src/routes/embeddings.ts`
- Modify: `apps/ai-app/src/routes/models.ts`
- Modify: `apps/ai-app/src/routes/food.test.ts` (and chat if needed)

**Interfaces:**
- Consumes: `startGatewayRequestTimer` from `../lib/recordGatewayRequest.js`
- Produces: each successful/failed upstream attempt writes one `GatewayRequest`

**Pattern (non-stream JSON — refine / ask / embeddings / models / chat non-stream):**

After validation succeeds:

```ts
const timer = startGatewayRequestTimer();
let ok = false;
try {
  const completion = await runOpenAI(/* ... */);
  await finalizeQuotaUsage(req); // where applicable
  timer.markTtfb();
  ok = true;
  res.json(completion);
} catch (error) {
  // existing error mapping
  throw /* or map */;
} finally {
  void timer.finish({
    ok,
    type: 'food_refine',
    stream: false,
    userId: req.quota?.userId,
    deviceId: req.quota?.deviceRowId,
  });
}
```

**Pattern (SSE — `streamCompletion` in food + chat stream):**

- Start timer at beginning of `streamCompletion` / stream branch (after validation already done).
- On first `res.write(...)`, call `timer.markTtfb()` once.
- Track `ok = true` only when stream completes with `[DONE]` + `res.end()` without disconnect.
- In `finally` of the held runner (always), `void timer.finish({ ok, type, stream: true, userId, deviceId })`.
- If disconnect before `create()` returns / before any write: set a local `startedUpstream = false` and **skip** `finish` (spec: no row). If `create()` started, always finish.

For food analyze, pass `type: 'food_analyze'`. For chat stream/non-stream: `chat_completions`.

- [ ] **Step 1: Write / extend failing route test**

In `food.test.ts`, mock `recordGatewayRequest` module OR assert `prisma.gatewayRequest.create` if the suite already mocks prisma. Prefer mocking:

```ts
vi.mock('../lib/recordGatewayRequest.js', () => ({
  startGatewayRequestTimer: () => {
    const calls: unknown[] = [];
    (globalThis as { __gwFinishes?: unknown[] }).__gwFinishes = calls;
    return {
      markTtfb: vi.fn(),
      finish: vi.fn(async (opts) => {
        calls.push(opts);
      }),
    };
  },
}));
```

Assert after successful refine that `finish` was called with `{ ok: true, type: 'food_refine', stream: false }`.

- [ ] **Step 2: Run — expect FAIL** (finish not called)

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/food.test.ts
```

- [ ] **Step 3: Instrument all four route files** using the patterns above.

- [ ] **Step 4: Run food + chat + embeddings/models tests**

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/food.test.ts src/routes/chat.ts src/app.test.ts
```

(If embeddings/models lack tests, add a minimal createApp POST/GET smoke that mocks OpenAI and asserts finish — only if cheap; otherwise rely on food/chat coverage + manual type-check.)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/food.ts apps/ai-app/src/routes/chat.ts apps/ai-app/src/routes/embeddings.ts apps/ai-app/src/routes/models.ts apps/ai-app/src/routes/food.test.ts
git commit -m "feat(ai-app): instrument OpenRouter routes with GatewayRequest timing"
```

---

### Task 5: Stats aggregation helpers + series

**Files:**
- Create: `apps/ai-app/src/lib/gatewayRequestStats.ts`
- Create: `apps/ai-app/src/lib/gatewayRequestStats.test.ts`
- Modify: `apps/ai-app/src/lib/adminStatsSeries.ts`
- Modify: `apps/ai-app/src/lib/adminStatsSeries.test.ts`

**Interfaces:**
- Consumes: `average`, `p50`, `p95` from `./percentile.js`; `GATEWAY_REQUEST_TYPES` from `./gatewayRequestTypes.js`; `utcDayKey` from `./adminStatsSeries.js`
- Produces:
  - `export type GatewayRequestRow = { type: string; ok: boolean; ttfbMs: number | null; durationMs: number | null; createdAt: Date }`
  - `export type RequestWindowCounts = { count: number; okCount: number; errorCount: number }`
  - `export type RequestTypeLatencyStats = RequestWindowCounts & { type: string; avgTtfbMs: number | null; p50TtfbMs: number | null; p95TtfbMs: number | null; avgDurationMs: number | null; p50DurationMs: number | null; p95DurationMs: number | null }`
  - `export function countWindow(rows: GatewayRequestRow[]): RequestWindowCounts`
  - `export function statsByType(rows: GatewayRequestRow[]): RequestTypeLatencyStats[]`
  - Extend `BuildAdminStatsSeriesInput` with `gatewayRequests: Array<{ type: string; at: Date }>`
  - Extend series with `requests: Array<{ date: string; total: number; byType: Record<string, number> }>`

- [ ] **Step 1: Write failing aggregation tests**

```ts
import { describe, expect, it } from 'vitest';
import { countWindow, statsByType } from './gatewayRequestStats.js';

const base = new Date('2026-08-12T12:00:00.000Z');

describe('gatewayRequestStats', () => {
  it('countWindow splits ok/error', () => {
    expect(
      countWindow([
        { type: 'models', ok: true, ttfbMs: 1, durationMs: 1, createdAt: base },
        { type: 'models', ok: false, ttfbMs: null, durationMs: 2, createdAt: base },
      ]),
    ).toEqual({ count: 2, okCount: 1, errorCount: 1 });
  });

  it('statsByType computes latency only from ok samples', () => {
    const rows = [
      { type: 'food_ask', ok: true, ttfbMs: 10, durationMs: 10, createdAt: base },
      { type: 'food_ask', ok: true, ttfbMs: 30, durationMs: 30, createdAt: base },
      { type: 'food_ask', ok: false, ttfbMs: null, durationMs: 99, createdAt: base },
    ];
    const ask = statsByType(rows).find((r) => r.type === 'food_ask')!;
    expect(ask.count).toBe(3);
    expect(ask.okCount).toBe(2);
    expect(ask.errorCount).toBe(1);
    expect(ask.avgDurationMs).toBe(20);
    expect(ask.p50DurationMs).toBe(10); // nearest-rank on [10,30]
    expect(ask.avgTtfbMs).toBe(20);
  });
});
```

Also extend `adminStatsSeries.test.ts` with a case that buckets gateway request types per day into `series.requests`.

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/gatewayRequestStats.test.ts src/lib/adminStatsSeries.test.ts
```

- [ ] **Step 3: Implement `gatewayRequestStats.ts` and extend `buildAdminStatsSeries`**

For series `byType`, initialize each day with `Object.fromEntries(GATEWAY_REQUEST_TYPES.map((t) => [t, 0]))`, then increment known types; unknown types ignored.

Flatten sparkline-friendly fields optionally later in UI (e.g. map `byType.food_analyze` → top-level keys). Series JSON keeps nested `byType`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/gatewayRequestStats.ts apps/ai-app/src/lib/gatewayRequestStats.test.ts apps/ai-app/src/lib/adminStatsSeries.ts apps/ai-app/src/lib/adminStatsSeries.test.ts
git commit -m "feat(ai-app): aggregate GatewayRequest counts and latency by type"
```

---

### Task 6: Admin `/stats` + `/stats/series` endpoints

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `countWindow`, `statsByType` from `../lib/gatewayRequestStats.js`; extended `buildAdminStatsSeries`
- Produces: JSON `requests` on both endpoints per spec

- [ ] **Step 1: Extend failing admin tests**

Update `GET /admin/stats` expectation to include:

```ts
expect(response.body.requests).toMatchObject({
  last7Days: { count: expect.any(Number), okCount: expect.any(Number), errorCount: expect.any(Number) },
  last30Days: { count: expect.any(Number), okCount: expect.any(Number), errorCount: expect.any(Number) },
  byType: expect.any(Array),
});
```

Update series test:

```ts
expect(response.body.series.requests).toHaveLength(7);
expect(response.body.series.requests[0]).toMatchObject({
  date: expect.any(String),
  total: expect.any(Number),
  byType: expect.any(Object),
});
```

Extend the admin test prisma mock with `gatewayRequest: { findMany: vi.fn(), count: ... }` as needed. Prefer `findMany` for 30d window selecting `{ type, ok, ttfbMs, durationMs, createdAt }`, then filter 7d in memory for `last7Days`.

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts
```

- [ ] **Step 3: Implement in `admin.ts`**

In `/stats`:

```ts
const gatewayRows = await prisma.gatewayRequest.findMany({
  where: { createdAt: { gte: last30Days } },
  select: {
    type: true,
    ok: true,
    ttfbMs: true,
    durationMs: true,
    createdAt: true,
  },
});
const last7 = gatewayRows.filter((r) => r.createdAt >= last7Days);
res.json({
  // ...existing fields
  requests: {
    last7Days: countWindow(last7),
    last30Days: countWindow(gatewayRows),
    byType: statsByType(gatewayRows),
  },
});
```

In `/stats/series`, also fetch gateway requests in the window and pass to `buildAdminStatsSeries`.

Ensure admin test mock’s `findMany` / new model methods return `[]` by default so existing tests keep working.

- [ ] **Step 4: Run — expect PASS**

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "feat(ai-app): expose gateway request stats on admin endpoints"
```

---

### Task 7: `ai-web` overview «Запросы» UI

**Files:**
- Modify: `apps/ai-web/src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `adminApi('stats')` and `adminApi('stats/series?days=7')` — existing proxies
- Produces: UI section with cards, table, sparkline

- [ ] **Step 1: Extend TypeScript types on the page**

```ts
type RequestWindow = { count: number; okCount: number; errorCount: number };

type RequestTypeStats = RequestWindow & {
  type: string;
  avgTtfbMs: number | null;
  p50TtfbMs: number | null;
  p95TtfbMs: number | null;
  avgDurationMs: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
};

type Stats = {
  usersTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
  requests?: {
    last7Days: RequestWindow;
    last30Days: RequestWindow;
    byType: RequestTypeStats[];
  };
};

type StatsSeries = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{ date: string; sumKopecks: number; totalKopecks: number }>;
    usage: Array<{ date: string; analyze: number; refine: number }>;
    requests?: Array<{
      date: string;
      total: number;
      byType: Record<string, number>;
    }>;
  };
};
```

- [ ] **Step 2: Add «Запросы» section**

After payments (before or after existing 7-day charts):

1. Three `Statistic` cards: «Запросы за 7 дней», «Запросы за 30 дней», «Ошибки за 7 дней» from `data.requests`.
2. Ant Design `Table` with columns: type, count, ok, errors, avg/p50/p95 TTFB, avg/p50/p95 duration. Format ms as integers via `Math.round(n)` or `—` if null.
3. In the charts row (or extra col), `SparklineCard` with data mapped from `series.requests`:

```ts
const requestSpark =
  series?.requests?.map((row) => ({
    date: row.date,
    total: row.total,
    food_analyze: row.byType.food_analyze ?? 0,
    food_refine: row.byType.food_refine ?? 0,
    chat_completions: row.byType.chat_completions ?? 0,
  })) ?? [];
```

`yFields`: `total`, `food_analyze`, `food_refine`, `chat_completions` (major types; avoid overcrowding with all six).

Type labels (RU): analyze → «Анализ», refine → «Уточнение», ask → «Вопрос», chat → «Chat», embeddings → «Embeddings», models → «Models».

- [ ] **Step 3: Type-check**

```bash
cd apps/ai-web && pnpm type-check
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/page.tsx
git commit -m "feat(ai-web): show gateway request counts and latency on admin overview"
```

---

### Task 8: Full verification

- [ ] **Step 1: Run ai-app tests**

```bash
cd apps/ai-app && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Run ai-app type-check**

```bash
cd apps/ai-app && pnpm type-check
```

Expected: exit 0.

- [ ] **Step 3: Run ai-web type-check**

```bash
cd apps/ai-web && pnpm type-check
```

Expected: exit 0.

- [ ] **Step 4: Manual smoke (optional if DB available)**

Apply migration (`pnpm prisma:migrate` / deploy), hit food analyze or chat once, reload `/admin` — cards and table non-zero.

- [ ] **Step 5: Final commit only if verification fixed anything**; otherwise done.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `GatewayRequest` model + indexes | 1 |
| Types food/chat/embeddings/models | 3–4 |
| TTFB + total timing | 3–4 |
| Error/abort + skip pre-upstream disconnect | 4 |
| Swallow DB errors / no prisma → skip | 3 |
| `/admin/stats` requests block + byType 30d latency | 5–6 |
| `/admin/stats/series` requests volume | 5–6 |
| ai-web cards + table + sparkline | 7 |
| Percentile nearest-rank + avg | 2 |
| Tests | 2–6, 8 |
| Non-goals (no prune/alerts/user page) | — |

## Self-review notes

- No TBD placeholders.
- `finish` returns `Promise<void>`; routes use `void timer.finish(...)`.
- Series keeps nested `byType`; UI flattens selected keys for `SparklineCard`.
- `deviceId` on `GatewayRequest` stores **Device.id** (row id from `req.quota.deviceRowId`), matching quota recording — not the raw `X-Device-Id` header.
