# Gateway request stats (count + latency)

**Date:** 2026-08-12  
**Status:** Approved — awaiting implementation plan  
**Repos:** `ai-app` (gateway telemetry + admin API) + `ai-web` (admin overview UI)  
**Approach:** A — separate `GatewayRequest` table; do not extend `UsageEvent`

## Goal

Show admin overview statistics for **all OpenRouter proxy requests**: request counts and latency (avg / p50 / p95), split by request type, with separate **TTFB** and **total duration**.

## Non-goals

- Alerts / SLOs
- Per-user latency on the user detail page
- Dedicated “Requests” admin page (v1 lives on overview)
- TTL / prune job for old rows (v1 keeps all rows, like `UsageEvent`)
- Changing quota / `UsageEvent` billing semantics

## Request types

| `type` | Route |
|--------|--------|
| `food_analyze` | `POST /v1/food/analyze` |
| `food_refine` | `POST /v1/food/refine` |
| `food_ask` | `POST /v1/food/ask` |
| `chat_completions` | `POST /v1/chat/completions` |
| `embeddings` | `POST /v1/embeddings` |
| `models` | `GET /v1/models` (and related models proxy) |

Only routes that call OpenRouter are recorded. Auth, billing, usage snapshot, admin, health, telegram webhook are **out**.

Validation failures **before** upstream are **not** recorded.

## Data model

```prisma
model GatewayRequest {
  id          String   @id @default(cuid())
  type        String
  stream      Boolean  @default(false)
  ok          Boolean
  ttfbMs      Int?
  durationMs  Int?
  userId      String?
  deviceId    String?
  createdAt   DateTime @default(now())

  @@index([createdAt, type])
  @@index([type, createdAt])
}
```

- `UsageEvent` unchanged (quota only).
- Optional `userId` / `deviceId` when already on the request; missing values do not block recording.

## Timing definitions

- **Start:** after request body validation succeeds, at entry to OpenRouter proxy work.
- **TTFB (`ttfbMs`):** time until first SSE `res.write` (stream) or immediately before `res.json` (non-stream). For non-stream success, `ttfbMs === durationMs`.
- **Total (`durationMs`):** time until successful `res.end` / JSON send, or until failure / client abort after work started.

### Error / abort cases

| Case | `ok` | `ttfbMs` | `durationMs` |
|------|------|----------|--------------|
| Success | `true` | set | set |
| Fail before first byte | `false` | `null` | time until error |
| Abort/error after TTFB | `false` | set | time until abort/error |
| Disconnect before upstream starts | skip write (no row) | — | — |

Always attempt write from `finally` when proxy work started. Recording must not throw into the client path (log and swallow DB errors).

## Collection

Helper `recordGatewayRequest(...)` in `ai-app`, called from:

- `routes/food.ts` (analyze stream, refine, ask)
- `routes/chat.ts` (stream + non-stream)
- `routes/embeddings.ts`
- `routes/models.ts`

No shared Express middleware for timing in v1 — timers live next to existing stream/`runOpenAI` paths so TTFB is accurate.

## Admin API

### `GET /admin/stats`

Extend JSON with:

```ts
requests: {
  last7Days: { count: number; okCount: number; errorCount: number };
  last30Days: { count: number; okCount: number; errorCount: number };
  byType: Array<{
    type: string;
    count: number;
    okCount: number;
    errorCount: number;
    // latency only over ok rows with non-null duration/ttfb
    avgTtfbMs: number | null;
    p50TtfbMs: number | null;
    p95TtfbMs: number | null;
    avgDurationMs: number | null;
    p50DurationMs: number | null;
    p95DurationMs: number | null;
  }>;
}
```

Windows: 7 and 30 days (same as existing usage counters). `byType` aggregates over **last 30 days**. Latency percentiles computed in-process from ok samples in that 30-day window.

### `GET /admin/stats/series?days=`

Extend `series` with:

```ts
requests: Array<{
  date: string; // YYYY-MM-DD
  total: number;
  byType: Record<string, number>; // counts per type that day
}>;
```

No per-day latency averages or percentiles in v1; volume series + table percentiles are enough.

`ai-web` proxy routes (`/api/admin/gateway/stats`, `.../series`) unchanged — they already forward.

## Admin UI (`ai-web` overview)

New section **«Запросы»** on `/admin`:

1. Cards: requests 7d, requests 30d, errors 7d.
2. Table by type (30d): count, ok/errors, avg/p50/p95 TTFB, avg/p50/p95 duration (ms).
3. Sparkline (7 days): request volume — `total` plus major type lines via existing `SparklineCard` patterns.

Existing users / payments / usage charts stay as they are.

## Percentiles

Shared helper (e.g. `percentileSorted(sortedAsc, p)`):

- p50 / p95 on sorted ascending arrays.
- Empty sample → `null` for avg and percentiles.
- Avg = arithmetic mean of samples.

## Tests

- Unit: percentile helper + stats aggregation by type.
- Route/integration: recording from food/chat creates `GatewayRequest` (mocked Prisma).
- Admin: `/admin/stats` and `/admin/stats/series` include `requests` shape.
- ai-web: types + section render against fixture (lightweight).

## Out of scope (explicit)

- Retention prune
- Alerting
- User-detail latency
- Separate Requests page
