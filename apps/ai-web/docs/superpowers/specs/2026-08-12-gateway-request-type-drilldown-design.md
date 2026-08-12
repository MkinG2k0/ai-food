# Gateway request type drill-down (modal grid)

**Date:** 2026-08-12  
**Status:** approved  
**Packages:** `apps/ai-app` (list API) + `apps/ai-web` (admin UI)  
**Approach:** A — `GET /admin/gateway-requests` with server pagination + Modal + Table

## Goal

On `/admin/requests`, clicking a row type in «По типам за 30 дней» opens a modal with a paginated grid of **all** individual `GatewayRequest` rows for that type (not limited to 30 days).

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| UI shell | Modal (ChartModal-style) |
| Time window | All rows of that type |
| Columns | Full set: time, ok, TTFB, duration, stream, userId, deviceId, id |
| Pagination | Server-side |
| OK/error filter in modal | Out of scope (v1) |

## Non-goals

- Drawer or dedicated detail page
- Filtering by ok / date range in the modal
- Changing `/admin/stats` aggregates or series charts
- Export / CSV

## API (`ai-app`)

`GET /admin/gateway-requests`

**Auth:** same admin key middleware as other `/admin/*` routes.

**Query:**

| Param | Rules |
|-------|--------|
| `type` | Required. Must be one of `GATEWAY_REQUEST_TYPES` (`food_analyze`, `food_refine`, `food_ask`, `chat_completions`, `embeddings`, `models`). Invalid → `400`. |
| `page` | Optional integer ≥ 1. Default `1`. |
| `pageSize` | Optional integer 1–100. Default `50`. |

**Behavior:**

- `where: { type }`
- `orderBy: { createdAt: 'desc' }`
- `skip` / `take` from page + pageSize
- Parallel `findMany` + `count` (or equivalent)

**Response `200`:**

```ts
{
  items: Array<{
    id: string;
    type: string;
    stream: boolean;
    ok: boolean;
    ttfbMs: number | null;
    durationMs: number | null;
    userId: string | null;
    deviceId: string | null;
    createdAt: string; // ISO
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```

Indexes `@@index([type, createdAt])` already exist on `GatewayRequest`.

## BFF (`ai-web`)

`GET /api/admin/gateway/gateway-requests` → `proxyGatewayAdmin('gateway-requests?' + queryString)`  
Forward `type`, `page`, `pageSize` query params.

## UI (`ai-web` `/admin/requests`)

1. Make the «Тип» cell (or whole row) clickable.
2. On click: open Modal titled with `REQUEST_TYPE_LABELS[type]` (e.g. «Анализ»).
3. Fetch list via React Query keyed by `['admin', 'gateway-requests', type, page, pageSize]`.
4. Ant Design `Table` inside Modal:
   - Columns: `createdAt`, `ok`, `ttfbMs`, `durationMs`, `stream`, `userId`, `deviceId`, `id`
   - Format ms like existing `formatMs` on the page
   - `ok` as readable OK / ошибка (or Tag)
   - Pagination controlled → updates `page` / `pageSize` and refetches
5. Modal: wide enough for the grid (`width` ~960–1080), `footer={null}`, `destroyOnHidden` / destroy on close.

## Success criteria

- Click «Анализ» → modal lists all `food_analyze` rows newest-first, paginated.
- Changing page loads the next slice from the server.
- Invalid `type` rejected by API with 400.
- Aggregate table «По типам за 30 дней» behavior unchanged aside from click affordance.

## Out of scope follow-ups

- Filter chips (ok / error)
- Link from row to user detail when `userId` present
- Cursor-based pagination
