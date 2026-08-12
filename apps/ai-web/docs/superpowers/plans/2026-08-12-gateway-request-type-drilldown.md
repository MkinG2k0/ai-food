# Gateway request type drill-down — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Клик по типу в «По типам за 30 дней» открывает модалку с пагинированным гридом всех `GatewayRequest` этого типа.

**Architecture:** Новый `GET /admin/gateway-requests` в `ai-app` (server pagination). BFF-прокси в `ai-web`. На `/admin/requests` — Modal + Table, загрузка через React Query.

**Tech Stack:** Express + Prisma + Vitest/supertest (`ai-app`); Next.js + Ant Design + TanStack Query (`ai-web`).

**Spec:** `apps/ai-web/docs/superpowers/specs/2026-08-12-gateway-request-type-drilldown-design.md`

## Global Constraints

- `type` обязателен; только значения из `GATEWAY_REQUEST_TYPES`
- Пагинация: `page` default `1`, `pageSize` default `50`, max `100`
- Сортировка: `createdAt desc`
- Окно: **все** строки типа (не 30 дней)
- Колонки UI: `createdAt`, `ok`, `ttfbMs`, `durationMs`, `stream`, `userId`, `deviceId`, `id`
- Без фильтра OK/ошибка, без drawer/отдельной страницы
- Auth: тот же `requireAdminKey`, что у остальных `/admin/*`
- Коммиты — только если пользователь явно попросил; иначе пропускать шаги Commit

## File map

| File | Role |
|------|------|
| `apps/ai-app/src/lib/gatewayRequestTypes.ts` | `isGatewayRequestType` guard |
| `apps/ai-app/src/lib/parseGatewayRequestListQuery.ts` | parse/validate query → `{ type, page, pageSize }` |
| `apps/ai-app/src/lib/parseGatewayRequestListQuery.test.ts` | unit tests for parser |
| `apps/ai-app/src/routes/admin.ts` | `GET /gateway-requests` |
| `apps/ai-app/src/routes/admin.test.ts` | route tests + prisma mock `count` |
| `apps/ai-web/src/app/api/admin/gateway/gateway-requests/route.ts` | BFF proxy |
| `apps/ai-web/src/app/admin/requests/page.tsx` | clickable type + Modal Table |

---

### Task 1: Parse query + `GET /admin/gateway-requests` + tests

**Files:**
- Modify: `apps/ai-app/src/lib/gatewayRequestTypes.ts`
- Create: `apps/ai-app/src/lib/parseGatewayRequestListQuery.ts`
- Create: `apps/ai-app/src/lib/parseGatewayRequestListQuery.test.ts`
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Produces: `isGatewayRequestType(value: string): value is GatewayRequestType`
- Produces: `parseGatewayRequestListQuery(query: Record<string, unknown>): { type: GatewayRequestType; page: number; pageSize: number }` — throws `ApiError` 400 on invalid
- Produces: `GET /admin/gateway-requests` → `{ items, total, page, pageSize }`

- [ ] **Step 1: Add type guard**

In `apps/ai-app/src/lib/gatewayRequestTypes.ts` append:

```ts
export function isGatewayRequestType(
  value: string,
): value is GatewayRequestType {
  return (GATEWAY_REQUEST_TYPES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Write failing parser tests**

Create `apps/ai-app/src/lib/parseGatewayRequestListQuery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/errors.js';
import { parseGatewayRequestListQuery } from './parseGatewayRequestListQuery.js';

describe('parseGatewayRequestListQuery', () => {
  it('defaults page=1 and pageSize=50 for valid type', () => {
    expect(parseGatewayRequestListQuery({ type: 'food_analyze' })).toEqual({
      type: 'food_analyze',
      page: 1,
      pageSize: 50,
    });
  });

  it('parses page and pageSize', () => {
    expect(
      parseGatewayRequestListQuery({
        type: 'food_refine',
        page: '2',
        pageSize: '25',
      }),
    ).toEqual({ type: 'food_refine', page: 2, pageSize: 25 });
  });

  it('rejects missing type', () => {
    expect(() => parseGatewayRequestListQuery({})).toThrow(ApiError);
    try {
      parseGatewayRequestListQuery({});
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
    }
  });

  it('rejects invalid type', () => {
    expect(() =>
      parseGatewayRequestListQuery({ type: 'nope' }),
    ).toThrow(ApiError);
  });

  it('rejects page < 1 and pageSize out of range', () => {
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', page: '0' }),
    ).toThrow(ApiError);
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', pageSize: '101' }),
    ).toThrow(ApiError);
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', pageSize: '0' }),
    ).toThrow(ApiError);
  });
});
```

- [ ] **Step 3: Run parser tests — expect FAIL**

```bash
pnpm --filter openrouter-gateway test -- src/lib/parseGatewayRequestListQuery.test.ts
```

Expected: FAIL (module missing).

- [ ] **Step 4: Implement parser**

Create `apps/ai-app/src/lib/parseGatewayRequestListQuery.ts`:

```ts
import { ApiError } from '../../lib/errors.js';
import {
  isGatewayRequestType,
  type GatewayRequestType,
} from './gatewayRequestTypes.js';

export type GatewayRequestListQuery = {
  type: GatewayRequestType;
  page: number;
  pageSize: number;
};

function parsePositiveInt(
  raw: unknown,
  fallback: number,
  opts: { min: number; max: number; field: string },
): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < opts.min || n > opts.max) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `${opts.field} must be an integer between ${opts.min} and ${opts.max}.`,
    );
  }
  return n;
}

export function parseGatewayRequestListQuery(
  query: Record<string, unknown>,
): GatewayRequestListQuery {
  const typeRaw = query.type;
  if (typeof typeRaw !== 'string' || !isGatewayRequestType(typeRaw)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'type must be a valid gateway request type.',
    );
  }

  const page = parsePositiveInt(query.page, 1, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    field: 'page',
  });
  const pageSize = parsePositiveInt(query.pageSize, 50, {
    min: 1,
    max: 100,
    field: 'pageSize',
  });

  return { type: typeRaw, page, pageSize };
}
```

- [ ] **Step 5: Run parser tests — expect PASS**

Same command as Step 3. Expected: PASS.

- [ ] **Step 6: Extend admin prisma mock + write tests**

In `apps/ai-app/src/routes/admin.test.ts`, replace the `gatewayRequest` mock block with one that supports list query (keep existing empty `findMany` default for `/stats`):

```ts
gatewayRequest: {
  findMany: vi.fn(async (args?: {
    where?: { type?: string; createdAt?: { gte: Date } };
    orderBy?: { createdAt: 'desc' | 'asc' };
    skip?: number;
    take?: number;
    select?: Record<string, boolean>;
  }) => {
    // Existing /stats and /stats/series callers pass createdAt gte — return [].
    if (args?.where?.createdAt) return [];
    return [];
  }),
  count: vi.fn(async () => 0),
},
```

Add tests near other stats tests:

```ts
it('GET /admin/gateway-requests requires admin key', async () => {
  const response = await request(createApp()).get(
    '/admin/gateway-requests?type=food_analyze',
  );
  expect(response.status).toBe(401);
});

it('GET /admin/gateway-requests rejects missing type', async () => {
  const response = await request(createApp())
    .get('/admin/gateway-requests')
    .set('X-Admin-Key', 'test-admin');
  expect(response.status).toBe(400);
});

it('GET /admin/gateway-requests returns paginated items', async () => {
  const createdAt = new Date('2026-08-01T12:00:00.000Z');
  prisma.gatewayRequest.findMany.mockResolvedValueOnce([
    {
      id: 'req_1',
      type: 'food_analyze',
      stream: true,
      ok: true,
      ttfbMs: 100,
      durationMs: 500,
      userId: 'u1',
      deviceId: 'd1',
      createdAt,
    },
  ]);
  prisma.gatewayRequest.count.mockResolvedValueOnce(1);

  const response = await request(createApp())
    .get('/admin/gateway-requests?type=food_analyze&page=1&pageSize=50')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    items: [
      {
        id: 'req_1',
        type: 'food_analyze',
        stream: true,
        ok: true,
        ttfbMs: 100,
        durationMs: 500,
        userId: 'u1',
        deviceId: 'd1',
        createdAt: createdAt.toISOString(),
      },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  });
  expect(prisma.gatewayRequest.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { type: 'food_analyze' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    }),
  );
  expect(prisma.gatewayRequest.count).toHaveBeenCalledWith({
    where: { type: 'food_analyze' },
  });
});
```

Match the real unauthorized status used by `requireAdminKey` in this codebase (401 or 403) — copy from an existing «rejects without admin key» test in the same file.

- [ ] **Step 7: Run route tests — expect FAIL on new cases**

```bash
pnpm --filter openrouter-gateway test -- src/routes/admin.test.ts
# or from apps/ai-app: pnpm test -- src/routes/admin.test.ts
```

Expected: FAIL — route missing / count not called.

- [ ] **Step 8: Implement route**

In `apps/ai-app/src/routes/admin.ts`, import:

```ts
import { parseGatewayRequestListQuery } from '../lib/parseGatewayRequestListQuery.js';
```

Add after `/stats/series` (or near other GET stats routes):

```ts
adminRouter.get(
  '/gateway-requests',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const { type, page, pageSize } = parseGatewayRequestListQuery(
      req.query as Record<string, unknown>,
    );
    const where = { type };
    const skip = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      prisma.gatewayRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          type: true,
          stream: true,
          ok: true,
          ttfbMs: true,
          durationMs: true,
          userId: true,
          deviceId: true,
          createdAt: true,
        },
      }),
      prisma.gatewayRequest.count({ where }),
    ]);

    res.json({
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  }),
);
```

- [ ] **Step 9: Run admin + parser tests — expect PASS**

```bash
pnpm --filter openrouter-gateway test -- src/lib/parseGatewayRequestListQuery.test.ts src/routes/admin.test.ts
```

Expected: PASS (including existing admin tests).

- [ ] **Step 10: Commit** (only if user asked)

```bash
git add apps/ai-app/src/lib/gatewayRequestTypes.ts \
  apps/ai-app/src/lib/parseGatewayRequestListQuery.ts \
  apps/ai-app/src/lib/parseGatewayRequestListQuery.test.ts \
  apps/ai-app/src/routes/admin.ts \
  apps/ai-app/src/routes/admin.test.ts
git commit -m "feat(ai-app): list gateway requests by type with pagination"
```

---

### Task 2: BFF proxy + Modal Table on `/admin/requests`

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/gateway-requests/route.ts`
- Modify: `apps/ai-web/src/app/admin/requests/page.tsx`

**Interfaces:**
- Consumes: `GET /admin/gateway-requests?type&page&pageSize` via `adminApi`
- Produces: clickable type → Modal with paginated Table

- [ ] **Step 1: Create BFF route**

Create `apps/ai-web/src/app/api/admin/gateway/gateway-requests/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return proxyGatewayAdmin(
    qs ? `gateway-requests?${qs}` : 'gateway-requests',
  );
}
```

- [ ] **Step 2: Wire UI on requests page**

Modify `apps/ai-web/src/app/admin/requests/page.tsx`:

1. Add imports: `useMemo`, `useState` from React; `Button`/`Modal`/`Tag` from antd as needed (`Modal`, `Tag`).
2. Add types:

```ts
type GatewayRequestRow = {
  id: string;
  type: string;
  stream: boolean;
  ok: boolean;
  ttfbMs: number | null;
  durationMs: number | null;
  userId: string | null;
  deviceId: string | null;
  createdAt: string;
};

type GatewayRequestList = {
  items: GatewayRequestRow[];
  total: number;
  page: number;
  pageSize: number;
};
```

3. In `AdminRequestsPage`, state:

```ts
const [detailType, setDetailType] = useState<string | null>(null);
const [listPage, setListPage] = useState(1);
const [listPageSize, setListPageSize] = useState(50);
```

When opening a type, reset page:

```ts
const openType = (type: string) => {
  setDetailType(type);
  setListPage(1);
  setListPageSize(50);
};
```

4. Query (enabled when modal open):

```ts
const detailQuery = useQuery({
  queryKey: [
    'admin',
    'gateway-requests',
    detailType,
    listPage,
    listPageSize,
  ],
  enabled: Boolean(detailType),
  queryFn: () =>
    adminApi<GatewayRequestList>(
      `gateway-requests?type=${encodeURIComponent(detailType!)}&page=${listPage}&pageSize=${listPageSize}`,
    ),
});
```

5. Change type column to a button/link:

```ts
{
  dataIndex: 'type',
  key: 'type',
  title: 'Тип',
  render: (type: string) => (
    <Button type="link" style={{ paddingInline: 0 }} onClick={() => openType(type)}>
      {REQUEST_TYPE_LABELS[type] ?? type}
    </Button>
  ),
},
```

Note: `requestTypeColumns` currently is a module-level const — either move columns inside the component (so `openType` is in scope) or build columns with `useMemo` depending on `openType`.

6. Detail columns (inside component):

```ts
const detailColumns: ColumnsType<GatewayRequestRow> = [
  {
    title: 'Время',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (v: string) =>
      new Date(v).toLocaleString('ru-RU'),
  },
  {
    title: 'Статус',
    dataIndex: 'ok',
    key: 'ok',
    render: (ok: boolean) =>
      ok ? <Tag color="success">OK</Tag> : <Tag color="error">Ошибка</Tag>,
  },
  {
    title: 'TTFB',
    dataIndex: 'ttfbMs',
    key: 'ttfbMs',
    render: formatMs,
  },
  {
    title: 'Duration',
    dataIndex: 'durationMs',
    key: 'durationMs',
    render: formatMs,
  },
  {
    title: 'Stream',
    dataIndex: 'stream',
    key: 'stream',
    render: (v: boolean) => (v ? 'да' : 'нет'),
  },
  { title: 'userId', dataIndex: 'userId', key: 'userId', render: (v) => v ?? '—' },
  { title: 'deviceId', dataIndex: 'deviceId', key: 'deviceId', render: (v) => v ?? '—' },
  { title: 'id', dataIndex: 'id', key: 'id' },
];
```

7. Modal at end of JSX:

```tsx
<Modal
  centered
  destroyOnHidden
  footer={null}
  open={Boolean(detailType)}
  title={
    detailType
      ? REQUEST_TYPE_LABELS[detailType] ?? detailType
      : 'Запросы'
  }
  width={1080}
  onCancel={() => setDetailType(null)}
>
  {detailQuery.error ? (
    <Alert
      type="error"
      showIcon
      message="Не удалось загрузить запросы"
      description={detailQuery.error.message}
      style={{ marginBottom: 12 }}
    />
  ) : null}
  <Table<GatewayRequestRow>
    columns={detailColumns}
    dataSource={detailQuery.data?.items ?? []}
    loading={detailQuery.isLoading}
    rowKey="id"
    size="small"
    scroll={{ x: true }}
    pagination={{
      current: listPage,
      pageSize: listPageSize,
      total: detailQuery.data?.total ?? 0,
      showSizeChanger: true,
      pageSizeOptions: [20, 50, 100],
      onChange: (page, pageSize) => {
        setListPage(page);
        setListPageSize(pageSize);
      },
    }}
  />
</Modal>
```

Import `Alert` if not already imported (it already is on the page).

- [ ] **Step 3: Type-check / smoke**

```bash
pnpm --filter ai-web exec tsc --noEmit
# and ensure ai-app tests still pass
pnpm --filter openrouter-gateway test -- src/lib/parseGatewayRequestListQuery.test.ts src/routes/admin.test.ts
```

Expected: PASS. (If ai-web filter name differs, use the package name from `apps/ai-web/package.json`.)

- [ ] **Step 4: Manual check**

Start gateway + ai-web admin, open `/admin/requests`, click «Анализ» → modal with rows; change page if `total > pageSize`.

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add apps/ai-web/src/app/api/admin/gateway/gateway-requests/route.ts \
  apps/ai-web/src/app/admin/requests/page.tsx
git commit -m "feat(ai-web): modal grid of gateway requests by type"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| `GET /admin/gateway-requests` + validation | Task 1 |
| Pagination defaults/max | Task 1 parser |
| Response shape + ISO `createdAt` | Task 1 route |
| BFF proxy | Task 2 |
| Modal + full columns + pagination UI | Task 2 |
| Out of scope filters/page | not in plan |

No placeholders. Types consistent: `GatewayRequestListQuery`, response `{ items, total, page, pageSize }`.
