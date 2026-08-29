# Admin OpenRouter cost & analytics

**Date:** 2026-08-29  
**Status:** Approved (user: Overview + dedicated page + Users avg cost; USD+RUB via Frankfurter/CBR; runway forecast)  
**Repos:** `ai-app` (`GET /admin/openrouter`) + `ai-web` (Overview, `/admin/openrouter`, Users)  
**Approach:** A — single aggregating endpoint with in-memory cache

## Goal

Surface real OpenRouter account balance, spend analytics, and runway forecast in admin, with USD + RUB (live FX). Replace the manual `costPerGeneration` input on Users with measured avg cost/gen.

## Non-goals

- OpenRouter Analytics query DSL (`POST /analytics/...`)
- Per-user cost attribution via generation IDs
- Auto top-up / Telegram alerts on low balance
- Persisting spend history in Postgres
- Changing gateway chat/completions billing logic

## Env (`apps/ai-app` only)

| Variable | Required | Use |
|----------|----------|-----|
| `OPENROUTER_MANAGEMENT_API_KEY` | for credits + activity | `GET /credits`, `GET /activity` |
| `OPENROUTER_API_KEY` | already required | `GET /key` (runtime key usage/limits) |

No FX API key. Frankfurter public API with CBR provider.

## API

`GET /admin/openrouter` behind existing `requireAdminKey`.

In-memory cache TTL: **5 minutes** per gateway process. Cache key: fixed (`openrouter-admin-snapshot`).

Response shape:

```ts
{
  fetchedAt: string; // ISO
  fx: {
    usdRub: number;
    asOf: string; // rate date from Frankfurter
    source: 'frankfurter-cbr';
  } | null;
  credits: {
    totalCredits: number;
    totalUsage: number;
    available: number; // totalCredits - totalUsage
  } | null;
  key: {
    label: string; // masked label from OpenRouter, never raw secret
    usage: number;
    usageDaily: number;
    usageWeekly: number;
    usageMonthly: number;
    limit: number | null;
    limitRemaining: number | null;
    limitReset: string | null;
    isFreeTier: boolean;
  } | null;
  spend: {
    last7DaysUsd: number;
    last30DaysUsd: number;
    last7DaysRub: number | null;
    last30DaysRub: number | null;
    requests30d: number;
    promptTokens30d: number;
    completionTokens30d: number;
    reasoningTokens30d: number;
  };
  avgCostPerGeneration: {
    usd: number | null;
    rub: number | null;
    generations30d: number;
  };
  runway: {
    avgDailySpendUsd: number | null;
    daysLeft: number | null;
    monthsLeft: number | null; // daysLeft / 30
    basedOn: '7d' | '30d' | null;
  };
  seriesDaily: Array<{
    date: string; // YYYY-MM-DD UTC
    usageUsd: number;
    requests: number;
    promptTokens: number;
    completionTokens: number;
  }>;
  byModel: Array<{
    model: string;
    usageUsd: number;
    requests: number;
    share: number; // 0..1 of last30DaysUsd
  }>;
  errors?: {
    credits?: string;
    activity?: string;
    key?: string;
    fx?: string;
  };
}
```

Upstream calls (parallel where possible):

1. Management key → `GET https://openrouter.ai/api/v1/credits`
2. Management key → `GET https://openrouter.ai/api/v1/activity` (last 30 completed UTC days)
3. Runtime key → `GET https://openrouter.ai/api/v1/key`
4. FX → `GET https://api.frankfurter.dev/v2/rate/USD/RUB?providers=CBR`
5. Prisma → count billable `usageEvent` in last 30 UTC days where `kind` starts with `analyze` **or** `kind = refine`

HTTP status of `/admin/openrouter` is **200** on partial failure. Missing pieces are `null` + `errors.*` codes (e.g. `missing_management_key`, `upstream_error`, `timeout`).

### Definitions

- **available** = `total_credits - total_usage` from OpenRouter credits API.
- **spend windows** = sum of activity item `usage` (USD) for dates in `[todayUTC-7d, todayUTC)` and full activity window (~30d). Use completed days as returned by OpenRouter; do not invent future days.
- **RUB** = `usd * fx.usdRub` when FX present; else `null`.
- **avgCostPerGeneration.usd** = `spend.last30DaysUsd / generations30d` when `generations30d > 0`; else `null`.
- **runway:**  
  - Prefer `avgDailySpendUsd = last7DaysUsd / 7` → `basedOn: '7d'`.  
  - If that is `0` (or negligible: `< 1e-9`), use `last30DaysUsd / 30` → `basedOn: '30d'`.  
  - If still ~0 or `credits.available` null → `daysLeft`/`monthsLeft`/`avgDailySpendUsd` null as appropriate; UI copy: balance not depleting at current rate.  
  - `daysLeft = available / avgDailySpendUsd`; `monthsLeft = daysLeft / 30`.

`byModel`: aggregate activity by `model`, sort by `usageUsd` desc, top **10**, `share = usageUsd / last30DaysUsd` (0 if spend is 0).

`seriesDaily`: one row per UTC date present in activity (and optionally zero-fill missing days in the 30d window for charts — prefer zero-fill for continuous sparklines).

## UI

### Overview (`/admin`)

Section **OpenRouter** (Card + Statistic, same patterns as sales/product):

- Available balance `$` + `₽`
- Spend 7d / 30d (`$` + `₽`)
- Avg cost/gen (`$` + `₽`)
- Runway: `≈ N дн. / M мес.` (or copy when spend ≈ 0)
- Link to `/admin/openrouter`

Alert when management key missing / credits null.

### New page `/admin/openrouter`

Sidebar label **OpenRouter** (Cloud/Dollar icon), title pageTitles entry.

- Same KPI row + runway
- Runtime key usage (daily / weekly / monthly) and `limitRemaining`
- Daily spend sparkline/table (30d)
- byModel table (model, $, requests, %)
- Token totals (prompt / completion / reasoning)
- Show FX asOf + source in footer of currency figures

### Users (`/admin/users`)

- Remove manual `InputNumber` for cost/gen.
- Fetch `/admin/openrouter` (or reuse cached query key) for `avgCostPerGeneration.rub` (prefer rub; if only usd, convert client-side only if fx returned — prefer server-provided rub).
- Header hint: `≈ X ₽ / gen · курс Y (ЦБ)` with rate date.
- If avg cost null: show generations only; cost column `—`.

### Gateway proxy

`apps/ai-web/src/app/api/admin/gateway/openrouter/route.ts` → proxy to ai-app `/admin/openrouter` (same pattern as health/stats/users).

## Testing (`ai-app`)

- Unit: available, spend 7d/30d aggregation, avg $/gen, runway (7d path, 30d fallback, zero spend, missing credits).
- Route/integration with mocked `fetch`: full shape; missing management key → errors without throw; FX failure → USD present, RUB null.

## Architecture sketch

```
Admin UI (Overview | OpenRouter page | Users)
        │
        ▼
ai-web /api/admin/gateway/openrouter
        │
        ▼
ai-app GET /admin/openrouter  ──cache 5m──┐
        ├── OpenRouter /credits (mgmt)    │
        ├── OpenRouter /activity (mgmt)   │
        ├── OpenRouter /key (runtime)     │
        ├── Frankfurter USD/RUB CBR       │
        └── Prisma usageEvent counts      │
```
