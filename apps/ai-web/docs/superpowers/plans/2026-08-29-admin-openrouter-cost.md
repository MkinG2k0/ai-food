# Admin OpenRouter Cost & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose real OpenRouter balance, spend analytics, FX (USD→RUB via Frankfurter/CBR), avg cost/gen, and runway forecast in admin Overview, a dedicated `/admin/openrouter` page, and Users (replace manual cost input).

**Architecture:** Single aggregating `GET /admin/openrouter` in `ai-app` (management key for credits/activity, runtime key for `/key`, Frankfurter for FX, Prisma for billable generation counts). In-memory 5‑minute cache. `ai-web` proxies via existing gateway pattern and renders three surfaces.

**Tech Stack:** Express + Vitest (`ai-app`), Next.js App Router + Ant Design + TanStack Query (`ai-web`), Frankfurter public FX API, OpenRouter REST.

**Spec:** `apps/ai-web/docs/superpowers/specs/2026-08-29-admin-openrouter-cost-design.md`

## Global Constraints

- Env: `OPENROUTER_MANAGEMENT_API_KEY` (credits + activity); existing `OPENROUTER_API_KEY` for `GET /key`; no FX key.
- Balance `available = totalCredits - totalUsage` (OpenRouter `/credits`).
- Spend = sum of activity `usage` (USD), not estimated rates.
- Billable gens = Prisma `usageEvent` where `kind` starts with `analyze` OR `kind === 'refine'`, last 30 UTC days.
- Runway: prefer `last7DaysUsd/7`; if ~0 (`< 1e-9`) use `last30DaysUsd/30`; else null days/months.
- Partial upstream failure → HTTP **200**, `null` fields + `errors.*`.
- Cache TTL **5 minutes** in-process; never return raw API secrets.
- No OpenRouter analytics DSL, per-user generation cost, top-up, or Postgres spend history.
- UI language: Russian labels (match admin).

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/lib/openrouterAdminTypes.ts` | Shared response types |
| `apps/ai-app/src/lib/openrouterAdminAnalytics.ts` | Pure: spend windows, series, byModel, avg, runway |
| `apps/ai-app/src/lib/openrouterAdminAnalytics.test.ts` | Unit tests for pure math |
| `apps/ai-app/src/lib/openrouterAdminClient.ts` | Fetch credits/activity/key + FX + assemble snapshot + cache |
| `apps/ai-app/src/lib/openrouterAdminClient.test.ts` | Client/snapshot tests with mocked fetch |
| `apps/ai-app/src/routes/admin.ts` | `GET /openrouter` |
| `apps/ai-app/src/routes/admin.test.ts` | Route shape + missing key |
| `apps/ai-app/.env.example` | Document management key |
| `apps/ai-web/src/app/api/admin/gateway/openrouter/route.ts` | Proxy |
| `apps/ai-web/src/lib/openrouterAdminTypes.ts` | Mirror types for UI (or inline in pages — prefer shared file under `ai-web/src/lib`) |
| `apps/ai-web/src/components/AdminShell.tsx` | Nav item |
| `apps/ai-web/src/app/admin/page.tsx` | Overview section |
| `apps/ai-web/src/app/admin/openrouter/page.tsx` | Dedicated page |
| `apps/ai-web/src/app/admin/users/page.tsx` | Real avg cost/gen |

---

### Task 1: Pure analytics helpers (TDD)

**Files:**
- Create: `apps/ai-app/src/lib/openrouterAdminTypes.ts`
- Create: `apps/ai-app/src/lib/openrouterAdminAnalytics.ts`
- Create: `apps/ai-app/src/lib/openrouterAdminAnalytics.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type OpenRouterActivityItem = { date: string; model: string; usage: number; requests: number; prompt_tokens: number; completion_tokens: number; reasoning_tokens: number; ... }`
  - `export type OpenRouterAdminSnapshot` (full response shape from spec)
  - `export function buildSpendFromActivity(items: OpenRouterActivityItem[], now: Date, usdRub: number | null): { spend; seriesDaily; byModel }`
  - `export function buildAvgCostPerGeneration(spend30dUsd: number, generations30d: number, usdRub: number | null)`
  - `export function buildRunway(available: number | null, last7DaysUsd: number, last30DaysUsd: number)`

- [ ] **Step 1: Write failing unit tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildAvgCostPerGeneration,
  buildRunway,
  buildSpendFromActivity,
} from './openrouterAdminAnalytics.js';

describe('buildSpendFromActivity', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('sums 7d and 30d USD and converts RUB', () => {
    const items = [
      {
        date: '2026-08-28',
        model: 'google/gemini-3-flash-preview',
        usage: 1.5,
        requests: 10,
        prompt_tokens: 100,
        completion_tokens: 50,
        reasoning_tokens: 0,
      },
      {
        date: '2026-08-01',
        model: 'google/gemini-3-flash-preview',
        usage: 2.0,
        requests: 5,
        prompt_tokens: 80,
        completion_tokens: 40,
        reasoning_tokens: 0,
      },
      {
        date: '2026-08-28',
        model: 'openai/gpt-4.1-mini',
        usage: 0.5,
        requests: 2,
        prompt_tokens: 20,
        completion_tokens: 10,
        reasoning_tokens: 5,
      },
    ];
    const { spend, byModel, seriesDaily } = buildSpendFromActivity(
      items,
      now,
      90,
    );
    expect(spend.last7DaysUsd).toBe(2);
    expect(spend.last30DaysUsd).toBe(4);
    expect(spend.last7DaysRub).toBe(180);
    expect(spend.requests30d).toBe(17);
    expect(byModel[0].model).toBe('google/gemini-3-flash-preview');
    expect(byModel[0].usageUsd).toBe(3.5);
    expect(seriesDaily.find((d) => d.date === '2026-08-28')?.usageUsd).toBe(2);
  });
});

describe('buildAvgCostPerGeneration', () => {
  it('divides spend by generations', () => {
    expect(buildAvgCostPerGeneration(4, 100, 90)).toEqual({
      usd: 0.04,
      rub: 3.6,
      generations30d: 100,
    });
  });
  it('returns null costs when generations is 0', () => {
    expect(buildAvgCostPerGeneration(4, 0, 90).usd).toBeNull();
  });
});

describe('buildRunway', () => {
  it('uses 7d average when positive', () => {
    expect(buildRunway(7.36, 1.4, 3)).toMatchObject({
      basedOn: '7d',
      avgDailySpendUsd: 0.2,
      daysLeft: 36.8,
      monthsLeft: 36.8 / 30,
    });
  });
  it('falls back to 30d when 7d is ~0', () => {
    expect(buildRunway(30, 0, 3)).toMatchObject({
      basedOn: '30d',
      avgDailySpendUsd: 0.1,
      daysLeft: 300,
    });
  });
  it('returns null days when spend is zero', () => {
    expect(buildRunway(10, 0, 0).daysLeft).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/openrouterAdminAnalytics.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement types + pure helpers**

`openrouterAdminTypes.ts` — export snapshot types matching the spec exactly (camelCase in our API).

`openrouterAdminAnalytics.ts`:

```ts
const EPS = 1e-9;

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoKey(now: Date, days: number): string {
  const t = new Date(now);
  t.setUTCDate(t.getUTCDate() - days);
  return utcDayKey(t);
}

export function buildSpendFromActivity(
  items: Array<{
    date: string;
    model: string;
    usage: number;
    requests: number;
    prompt_tokens: number;
    completion_tokens: number;
    reasoning_tokens: number;
  }>,
  now: Date,
  usdRub: number | null,
) {
  const start7 = daysAgoKey(now, 7);
  const start30 = daysAgoKey(now, 30);
  const today = utcDayKey(now);
  // Include dates in [start7, today) for 7d and [start30, today) for 30d
  // (completed days; if OpenRouter returns today, include it in both windows)
  // ... aggregate spend, tokens, requests; zero-fill seriesDaily for each UTC day from start30..today
  // byModel top 10 by usageUsd, share = usageUsd / last30DaysUsd || 0
}

export function buildAvgCostPerGeneration(
  spend30dUsd: number,
  generations30d: number,
  usdRub: number | null,
) {
  if (generations30d <= 0) {
    return { usd: null, rub: null, generations30d };
  }
  const usd = spend30dUsd / generations30d;
  return {
    usd,
    rub: usdRub == null ? null : usd * usdRub,
    generations30d,
  };
}

export function buildRunway(
  available: number | null,
  last7DaysUsd: number,
  last30DaysUsd: number,
) {
  if (available == null) {
    return {
      avgDailySpendUsd: null,
      daysLeft: null,
      monthsLeft: null,
      basedOn: null as const,
    };
  }
  let avg = last7DaysUsd / 7;
  let basedOn: '7d' | '30d' | null = '7d';
  if (avg < EPS) {
    avg = last30DaysUsd / 30;
    basedOn = '30d';
  }
  if (avg < EPS) {
    return {
      avgDailySpendUsd: 0,
      daysLeft: null,
      monthsLeft: null,
      basedOn: null,
    };
  }
  const daysLeft = available / avg;
  return {
    avgDailySpendUsd: avg,
    daysLeft,
    monthsLeft: daysLeft / 30,
    basedOn,
  };
}
```

Implement date windows carefully: for a given `now` of `2026-08-29`, 7d window includes `2026-08-22`..`2026-08-29` inclusive of activity dates returned (match tests in Step 1). Prefer: `date >= start7 && date <= today` for 7d and `date >= start30 && date <= today` for 30d where `startN = daysAgoKey(now, N)`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/openrouterAdminAnalytics.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/openrouterAdminTypes.ts apps/ai-app/src/lib/openrouterAdminAnalytics.ts apps/ai-app/src/lib/openrouterAdminAnalytics.test.ts
git commit -m "$(cat <<'EOF'
feat(ai-app): add OpenRouter spend/runway analytics helpers

EOF
)"
```

---

### Task 2: Snapshot client (fetch + cache + Prisma count)

**Files:**
- Create: `apps/ai-app/src/lib/openrouterAdminClient.ts`
- Create: `apps/ai-app/src/lib/openrouterAdminClient.test.ts`
- Modify: `apps/ai-app/.env.example` (add `OPENROUTER_MANAGEMENT_API_KEY`)

**Interfaces:**
- Consumes: `buildSpendFromActivity`, `buildAvgCostPerGeneration`, `buildRunway`, types from Task 1
- Produces:
  - `export const OPENROUTER_ADMIN_CACHE_TTL_MS = 5 * 60 * 1000`
  - `export async function collectOpenRouterAdminSnapshot(options: { fetchImpl?: typeof fetch; now?: () => Date; getEnv?: (k: string) => string | undefined; countBillableGenerations30d: () => Promise<number>; cache?: { get(): Snapshot | null; set(s: Snapshot): void } }): Promise<OpenRouterAdminSnapshot>`

- [ ] **Step 1: Write failing client tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectOpenRouterAdminSnapshot,
  resetOpenRouterAdminCacheForTests,
} from './openrouterAdminClient.js';

afterEach(() => {
  resetOpenRouterAdminCacheForTests();
  vi.unstubAllGlobals();
});

describe('collectOpenRouterAdminSnapshot', () => {
  it('assembles credits, activity spend, fx, key, runway', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/credits')) {
        return new Response(
          JSON.stringify({ data: { total_credits: 23.0, total_usage: 15.64 } }),
          { status: 200 },
        );
      }
      if (String(url).includes('/activity')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                date: '2026-08-28',
                model: 'google/gemini-3-flash-preview',
                model_permaslug: 'x',
                endpoint_id: 'e',
                provider_name: 'Google',
                usage: 1.4,
                byok_usage_inference: 0,
                requests: 10,
                prompt_tokens: 100,
                completion_tokens: 50,
                reasoning_tokens: 0,
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (String(url).includes('/key')) {
        return new Response(
          JSON.stringify({
            data: {
              label: 'sk-or-v1-abc...xyz',
              usage: 1,
              usage_daily: 0.1,
              usage_weekly: 0.5,
              usage_monthly: 1,
              byok_usage: 0,
              byok_usage_daily: 0,
              byok_usage_weekly: 0,
              byok_usage_monthly: 0,
              limit: null,
              limit_remaining: null,
              limit_reset: null,
              include_byok_in_limit: false,
              is_free_tier: false,
              is_management_key: false,
              is_provisioning_key: false,
              creator_user_id: null,
              rate_limit: { requests: -1, interval: '1h', note: '' },
            },
          }),
          { status: 200 },
        );
      }
      if (String(url).includes('frankfurter')) {
        return new Response(
          JSON.stringify({
            date: '2026-08-29',
            base: 'USD',
            quote: 'RUB',
            rate: 90,
          }),
          { status: 200 },
        );
      }
      return new Response('not found', { status: 404 });
    });

    const snap = await collectOpenRouterAdminSnapshot({
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-08-29T12:00:00.000Z'),
      getEnv: (k) =>
        k === 'OPENROUTER_MANAGEMENT_API_KEY'
          ? 'mgmt'
          : k === 'OPENROUTER_API_KEY'
            ? 'runtime'
            : undefined,
      countBillableGenerations30d: async () => 70,
    });

    expect(snap.credits?.available).toBeCloseTo(7.36);
    expect(snap.fx?.usdRub).toBe(90);
    expect(snap.spend.last7DaysUsd).toBe(1.4);
    expect(snap.avgCostPerGeneration.generations30d).toBe(70);
    expect(snap.runway.basedOn).toBe('7d');
    expect(snap.errors).toBeUndefined();
  });

  it('sets errors.credits when management key missing', async () => {
    const snap = await collectOpenRouterAdminSnapshot({
      fetchImpl: vi.fn() as unknown as typeof fetch,
      getEnv: (k) =>
        k === 'OPENROUTER_API_KEY' ? 'runtime' : undefined,
      countBillableGenerations30d: async () => 0,
      now: () => new Date('2026-08-29T12:00:00.000Z'),
    });
    expect(snap.credits).toBeNull();
    expect(snap.errors?.credits).toBe('missing_management_key');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/openrouterAdminClient.test.ts`

- [ ] **Step 3: Implement client**

URLs:
- `https://openrouter.ai/api/v1/credits` — `Authorization: Bearer ${MANAGEMENT}`
- `https://openrouter.ai/api/v1/activity` — same
- `https://openrouter.ai/api/v1/key` — `Authorization: Bearer ${OPENROUTER_API_KEY}`
- `https://api.frankfurter.dev/v2/rate/USD/RUB?providers=CBR`

Timeout: use `AbortSignal.timeout(10_000)` (Node 20+).

On each failure set corresponding `errors.*` (`upstream_error` or `timeout`) and leave field null.

Module-level cache:

```ts
let cache: { at: number; value: OpenRouterAdminSnapshot } | null = null;

export function resetOpenRouterAdminCacheForTests() {
  cache = null;
}
```

If cache hit within TTL, return cached value without refetch.

Map key response to camelCase `key` object (no secrets).

- [ ] **Step 4: Update `.env.example`**

After `OPENROUTER_API_KEY` block add:

```
# Management key (Account → Management Keys) — admin balance/activity only; not for completions
# OPENROUTER_MANAGEMENT_API_KEY=
```

- [ ] **Step 5: Run tests — PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/openrouterAdminClient.test.ts src/lib/openrouterAdminAnalytics.test.ts`

- [ ] **Step 6: Commit**

```bash
git add apps/ai-app/src/lib/openrouterAdminClient.ts apps/ai-app/src/lib/openrouterAdminClient.test.ts apps/ai-app/.env.example
git commit -m "$(cat <<'EOF'
feat(ai-app): collect OpenRouter admin snapshot with FX and cache

EOF
)"
```

---

### Task 3: Admin route `GET /openrouter`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `collectOpenRouterAdminSnapshot`
- Produces: `GET /admin/openrouter` JSON

- [ ] **Step 1: Add failing route test**

In `admin.test.ts`, add a describe block that mocks `collectOpenRouterAdminSnapshot` via `vi.mock('../lib/openrouterAdminClient.js', ...)` **or** stubs global fetch + prisma count. Prefer mocking the collector:

```ts
vi.mock('../lib/openrouterAdminClient.js', () => ({
  collectOpenRouterAdminSnapshot: (...args: unknown[]) =>
    mockCollectOpenRouter(...args),
}));
```

Assert `GET /admin/openrouter` with `X-Admin-Key` returns 200 and body includes `credits`, `spend`, `runway`, `avgCostPerGeneration`. Without admin key → 401 (existing middleware).

Also test that route passes `countBillableGenerations30d` that uses prisma `usageEvent.count` with:

```ts
{
  createdAt: { gte: thirtyDaysAgo },
  OR: [
    { kind: { startsWith: 'analyze' } },
    { kind: 'refine' },
  ],
}
```

(If Prisma `startsWith` on enum/string is awkward in schema, use `in: ['analyze','analyze_photo','analyze_text','analyze_photo_text','refine']` matching existing kinds — prefer explicit `in` list from codebase.)

- [ ] **Step 2: Run — expect FAIL** (404 on `/admin/openrouter`)

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts -t openrouter`

- [ ] **Step 3: Wire route**

Near `/health` in `admin.ts`:

```ts
adminRouter.get(
  '/openrouter',
  asyncHandler(async (_req, res) => {
    const prisma = getPrisma();
    const snapshot = await collectOpenRouterAdminSnapshot({
      countBillableGenerations30d: async () => {
        if (!prisma) return 0;
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return prisma.usageEvent.count({
          where: {
            createdAt: { gte: since },
            kind: {
              in: [
                'analyze',
                'analyze_photo',
                'analyze_text',
                'analyze_photo_text',
                'refine',
              ],
            },
          },
        });
      },
    });
    res.json(snapshot);
  }),
);
```

- [ ] **Step 4: Run admin tests — PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(ai-app): add GET /admin/openrouter for cost analytics

EOF
)"
```

---

### Task 4: ai-web gateway proxy + shared UI types

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/openrouter/route.ts`
- Create: `apps/ai-web/src/lib/openrouterAdminTypes.ts` (copy camelCase types from ai-app for frontend)

**Interfaces:**
- Consumes: `proxyGatewayAdmin('openrouter')`
- Produces: Next route `GET /api/admin/gateway/openrouter`

- [ ] **Step 1: Create proxy route**

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('openrouter');
}
```

- [ ] **Step 2: Add frontend types** mirroring `OpenRouterAdminSnapshot` from Task 1 (export type only).

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/openrouter/route.ts apps/ai-web/src/lib/openrouterAdminTypes.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): proxy admin OpenRouter snapshot endpoint

EOF
)"
```

---

### Task 5: Overview OpenRouter section

**Files:**
- Modify: `apps/ai-web/src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `adminApi<OpenRouterAdminSnapshot>('openrouter')`
- Produces: UI section on Overview

- [ ] **Step 1: Add query**

```ts
const openrouterQuery = useQuery({
  queryKey: ['admin', 'openrouter'],
  queryFn: () => adminApi<OpenRouterAdminSnapshot>('openrouter'),
  refetchInterval: 60_000,
});
```

- [ ] **Step 2: Render section** after sales/product (or after payments KPI — place **above** 7-day charts, consistent with analytics sections): title «OpenRouter», cards for available `$`/`₽`, spend 7d/30d, avg cost/gen, runway (`≈ N дн. · M мес.` or «баланс не расходуется»), link `Typography.Link` → `/admin/openrouter`. Alert if `errors?.credits === 'missing_management_key'`.

Format helpers:

```ts
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
```

- [ ] **Step 3: Manual check** — page loads with skeleton when pending; no crash when snapshot partial.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): show OpenRouter balance and spend on admin overview

EOF
)"
```

---

### Task 6: Dedicated `/admin/openrouter` page + nav

**Files:**
- Create: `apps/ai-web/src/app/admin/openrouter/page.tsx`
- Modify: `apps/ai-web/src/components/AdminShell.tsx`

**Interfaces:**
- Consumes: same `adminApi('openrouter')` query key `['admin', 'openrouter']`
- Produces: full analytics page

- [ ] **Step 1: Add menu item** in `AdminShell.tsx` after Стабильность (or after Обзор):

```ts
import { CloudOutlined } from '@ant-design/icons';
// ...
{ icon: <CloudOutlined />, key: '/admin/openrouter', label: 'OpenRouter' },
// pageTitles:
'/admin/openrouter': 'OpenRouter',
```

- [ ] **Step 2: Create page** with:
  - PageHeader subtitle «Баланс, расходы и прогноз OpenRouter»
  - KPI row (balance, spend 7/30, avg/gen, runway)
  - Key usage cards (daily/weekly/monthly, limitRemaining)
  - SparklineCard or Table for `seriesDaily` (usageUsd)
  - Table `byModel` (model, usageUsd, requests, share %)
  - Token totals
  - Footer: курс `{fx.usdRub}` на `{fx.asOf} · {fx.source}`

Reuse Ant Design patterns from `admin/health/page.tsx` and overview.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/admin/openrouter/page.tsx apps/ai-web/src/components/AdminShell.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add admin OpenRouter cost analytics page

EOF
)"
```

---

### Task 7: Users page — real avg cost/gen

**Files:**
- Modify: `apps/ai-web/src/app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `OpenRouterAdminSnapshot.avgCostPerGeneration` + `fx`
- Produces: cost column uses live rate; remove `InputNumber`

- [ ] **Step 1: Remove** `DEFAULT_COST_PER_GENERATION`, `costPerGeneration` state, and the `InputNumber` control.

- [ ] **Step 2: Fetch snapshot**

```ts
const openrouterQuery = useQuery({
  queryKey: ['admin', 'openrouter'],
  queryFn: () => adminApi<OpenRouterAdminSnapshot>('openrouter'),
  staleTime: 60_000,
});
const rateRub = openrouterQuery.data?.avgCostPerGeneration.rub ?? null;
const rateUsd = openrouterQuery.data?.avgCostPerGeneration.usd ?? null;
```

- [ ] **Step 3: Cost column** — if `rateRub != null`, `formatRub(aiGenerationTotal(user.usageCounts) * rateRub)`; else if only USD, show `$…`; else `—`. Summary totals same. Header text:

`≈ {rateRub?.toFixed(4) ?? '—'} ₽ / gen · курс {fx?.usdRub ?? '—'} (ЦБ {fx?.asOf ?? '—'})`

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/users/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): use OpenRouter avg cost per generation on users page

EOF
)"
```

---

### Task 8: Smoke verification

**Files:** none (verification only)

- [ ] **Step 1: Run ai-app tests**

Run: `cd apps/ai-app && pnpm test`

Expected: PASS (all green; fix any breakage from mocks)

- [ ] **Step 2: Typecheck touched packages**

Run: `cd apps/ai-app && pnpm type-check`  
Run: `cd apps/ai-web && pnpm exec tsc --noEmit` (or package script if present)

- [ ] **Step 3: Manual checklist** (with `OPENROUTER_MANAGEMENT_API_KEY` set locally)
  - Overview shows balance ≈ OpenRouter dashboard
  - Runway days look sane vs 7d spend
  - `/admin/openrouter` charts populate
  - Users cost column matches avg × gens
  - Unset management key → Alert, no 500

- [ ] **Step 4: Final commit only if fixes needed**

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| `GET /admin/openrouter` aggregate | 3 |
| credits / activity / key / FX | 2 |
| spend 7d/30d, series, byModel | 1–2 |
| avg cost/gen via Prisma | 2–3 |
| runway 7d→30d fallback | 1 |
| cache 5m + partial errors | 2 |
| `.env.example` management key | 2 |
| Overview cards + link | 5 |
| Dedicated page + nav | 6 |
| Users replace manual rate | 7 |
| Gateway proxy | 4 |
| Unit + route tests | 1–3, 8 |

## Self-review notes

- No TBD placeholders.
- Types use camelCase in our API; snake_case only at OpenRouter wire boundary inside client.
- Billable kinds use explicit `in` list (safer than Prisma `startsWith` on enums).
- Commits are per-task; skip commit steps only if user forbids commits in-session.
