# Admin-managed Promo Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded promo catalog with a Prisma `PromoCode` table and let admins create/delete codes on the «Цены» page.

**Architecture:** `PromoCode` rows in Postgres are the only catalog. `lookupPromo` / `resolvePromo` become async DB reads (no hardcoded fallback). Admin CRUD under `/admin/promos`; `ai-web` proxies and adds a Promos card under pricing.

**Tech Stack:** Express, Prisma 7, Vitest/supertest, Next.js App Router, Ant Design 5, TanStack Query, TypeScript, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-05-admin-promo-codes-design.md`

## Global Constraints

- Fields only: normalized `code` + `discountPercent` integer **1–99**.
- Normalize: `trim` + lowercase on create and lookup.
- No seed of `new80` / `new50`; catalog empty after migration.
- No hardcoded fallback when DB missing or code absent → `INVALID_PROMO`.
- Billing public API shapes unchanged.
- Admin UI: section on `/admin/pricing` only (no sidebar item).
- Delete success: `200 { ok: true }` (same as payments).
- Duplicate create: `409 CONFLICT`.
- Price formula unchanged: `max(1, floor(original * (100 - percent) / 100))`.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/prisma/schema.prisma` | Add `PromoCode` model |
| `apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql` | Create table |
| `apps/ai-app/src/lib/promos.ts` | Async DB lookup; keep normalize/discount helpers |
| `apps/ai-app/src/lib/promos.test.ts` | Unit tests with mock prisma |
| `apps/ai-app/src/routes/billing.ts` | `await resolvePromo(...)` |
| `apps/ai-app/src/routes/billing.test.ts` | Mock `promoCode` on prisma; DB-backed codes |
| `apps/ai-app/src/routes/admin.ts` | GET/POST/DELETE `/promos` |
| `apps/ai-app/src/routes/admin.test.ts` | Admin promo route tests |
| `apps/ai-web/src/app/api/admin/gateway/promos/route.ts` | Proxy list + create |
| `apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts` | Proxy delete |
| `apps/ai-web/src/app/admin/pricing/page.tsx` | Promos card UI |

---

### Task 1: Prisma `PromoCode` model + migration

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql`

**Interfaces:**
- Produces: Prisma model `PromoCode` with fields below (client regenerated in Step 3)

- [ ] **Step 1: Add model to schema**

Append to `apps/ai-app/prisma/schema.prisma` after `AppSettings`:

```prisma
model PromoCode {
  id              String   @id @default(cuid())
  code            String   @unique
  discountPercent Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
```

- [ ] **Step 3: Generate Prisma client**

Run from `apps/ai-app`:

```bash
pnpm prisma:generate
```

Expected: exits 0; `PromoCode` appears under `apps/ai-app/src/generated/prisma`.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql
git commit -m "feat(ai-app): add PromoCode prisma model"
```

(If `prisma generate` dirty-checks generated files that are committed in this repo, include them; if generated is gitignored, do not add it.)

---

### Task 2: Async promo helpers (DB lookup)

**Files:**
- Modify: `apps/ai-app/src/lib/promos.ts`
- Modify: `apps/ai-app/src/lib/promos.test.ts`

**Interfaces:**
- Consumes: `PrismaClient` from `../generated/prisma/client.js` (field `promoCode`)
- Produces:
  - `normalizePromoCode(raw: string): string` (unchanged)
  - `applyPromoDiscount(originalAmount: number, discountPercent: number): number` (unchanged)
  - `lookupPromo(prisma: PrismaClient | null | undefined, raw: string): Promise<PromoDefinition | null>`
  - `resolvePromo(prisma: PrismaClient | null | undefined, raw: string, originalAmount: number): Promise<ResolvedPromo | null>`

- [ ] **Step 1: Rewrite failing unit tests**

Replace `apps/ai-app/src/lib/promos.test.ts` entirely with:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  normalizePromoCode,
  lookupPromo,
  applyPromoDiscount,
  resolvePromo,
} from './promos.js';

function mockPrisma(rows: { code: string; discountPercent: number }[]) {
  return {
    promoCode: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
        const row = rows.find((r) => r.code === where.code);
        return row
          ? { id: 'p1', code: row.code, discountPercent: row.discountPercent }
          : null;
      }),
    },
  };
}

describe('promos', () => {
  it('normalizePromoCode trims and lowercases', () => {
    expect(normalizePromoCode(' New80 ')).toBe('new80');
  });

  it('lookupPromo finds code from prisma', async () => {
    const prisma = mockPrisma([
      { code: 'new80', discountPercent: 80 },
      { code: 'new50', discountPercent: 50 },
    ]);
    await expect(lookupPromo(prisma as never, 'new80')).resolves.toEqual({
      code: 'new80',
      discountPercent: 80,
    });
    await expect(lookupPromo(prisma as never, 'NEW50')).resolves.toEqual({
      code: 'new50',
      discountPercent: 50,
    });
  });

  it('lookupPromo returns null for unknown, empty, or null prisma', async () => {
    const prisma = mockPrisma([{ code: 'ok', discountPercent: 10 }]);
    await expect(lookupPromo(prisma as never, 'nope')).resolves.toBeNull();
    await expect(lookupPromo(prisma as never, '')).resolves.toBeNull();
    await expect(lookupPromo(prisma as never, '   ')).resolves.toBeNull();
    await expect(lookupPromo(null, 'ok')).resolves.toBeNull();
    await expect(lookupPromo(undefined, 'ok')).resolves.toBeNull();
  });

  it('applyPromoDiscount floors and clamps to min 1', () => {
    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
    expect(applyPromoDiscount(1, 80)).toBe(1);
    expect(applyPromoDiscount(3, 80)).toBe(1);
  });

  it('resolvePromo returns amounts for valid code', async () => {
    const prisma = mockPrisma([{ code: 'new80', discountPercent: 80 }]);
    await expect(resolvePromo(prisma as never, ' new80 ', 10_000)).resolves.toEqual({
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('resolvePromo returns null for invalid', async () => {
    const prisma = mockPrisma([]);
    await expect(resolvePromo(prisma as never, 'x', 10_000)).resolves.toBeNull();
    await expect(resolvePromo(null, 'new80', 10_000)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts
```

Expected: FAIL (sync `lookupPromo` / missing prisma arg / hardcoded map).

- [ ] **Step 3: Implement `promos.ts`**

Replace `apps/ai-app/src/lib/promos.ts` with:

```ts
import type { PrismaClient } from '../generated/prisma/client.js';

export type PromoDefinition = {
  code: string;
  discountPercent: number;
};

export type ResolvedPromo = {
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function lookupPromo(
  prisma: PrismaClient | null | undefined,
  raw: string,
): Promise<PromoDefinition | null> {
  const key = normalizePromoCode(raw);
  if (!key || !prisma) return null;
  const row = await prisma.promoCode.findUnique({ where: { code: key } });
  if (!row) return null;
  return { code: row.code, discountPercent: row.discountPercent };
}

/** finalAmount in kopecks; never below 1. */
export function applyPromoDiscount(
  originalAmount: number,
  discountPercent: number,
): number {
  const discounted = Math.floor(
    (originalAmount * (100 - discountPercent)) / 100,
  );
  return Math.max(1, discounted);
}

export async function resolvePromo(
  prisma: PrismaClient | null | undefined,
  raw: string,
  originalAmount: number,
): Promise<ResolvedPromo | null> {
  const promo = await lookupPromo(prisma, raw);
  if (!promo) return null;
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/promos.ts apps/ai-app/src/lib/promos.test.ts
git commit -m "feat(ai-app): resolve promos from database"
```

---

### Task 3: Wire billing to async `resolvePromo`

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `resolvePromo(prisma, raw, originalAmount): Promise<ResolvedPromo | null>`
- Produces: unchanged HTTP contracts for `/promo/validate` and `/subscribe`

- [ ] **Step 1: Update billing callsites**

In `apps/ai-app/src/routes/billing.ts`:

1. In `resolveSubscribeAmount`, change:

```ts
  const resolved = resolvePromo(promoCodeRaw, originalAmount);
```

to:

```ts
  const resolved = await resolvePromo(prisma, promoCodeRaw, originalAmount);
```

2. In `POST /promo/validate`, change:

```ts
    const resolved = resolvePromo(raw, originalAmount);
```

to:

```ts
    const resolved = await resolvePromo(prisma, raw, originalAmount);
```

- [ ] **Step 2: Extend billing test mock prisma with `promoCode`**

In `apps/ai-app/src/routes/billing.test.ts`, inside `mockPrisma()`, add a store and `promoCode` API. At the top of the describe (near `paymentStore`), add:

```ts
  const promoStore = new Map<string, { id: string; code: string; discountPercent: number }>();
```

Inside `mockPrisma()` return object, add:

```ts
      promoCode: {
        findUnique: vi.fn(
          async ({ where }: { where: { code: string } }) =>
            promoStore.get(where.code) ?? null,
        ),
      },
```

In `beforeEach`, after `paymentStore.clear()`:

```ts
    promoStore.clear();
    promoStore.set('new80', {
      id: 'promo-new80',
      code: 'new80',
      discountPercent: 80,
    });
    promoStore.set('new50', {
      id: 'promo-new50',
      code: 'new50',
      discountPercent: 50,
    });
```

Keep existing promo test names/expectations (`new80` / `new50`) — they now hit the mock store, not hardcoded map.

- [ ] **Step 3: Run billing + promos tests**

```bash
cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts src/routes/billing.test.ts
```

Expected: all PASS. Existing promo cases still green via mock DB rows.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "feat(ai-app): billing resolves promos via prisma"
```

---

### Task 4: Admin promo CRUD API

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Produces:
  - `GET /admin/promos` → `{ items: PromoItem[] }`
  - `POST /admin/promos` body `{ code, discountPercent }` → `201` PromoItem
  - `DELETE /admin/promos/:id` → `{ ok: true }`
  - PromoItem: `{ id: string; code: string; discountPercent: number; createdAt: string (ISO) }`

- [ ] **Step 1: Add failing admin tests**

In `apps/ai-app/src/routes/admin.test.ts`:

1. Add type and state near other mocks:

```ts
type MockPromo = {
  id: string;
  code: string;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
};
```

Add `let promos: MockPromo[];` next to `users` / `payments`.

2. In `createMockPrisma()`, add:

```ts
      promoCode: {
        findMany: vi.fn(async ({ orderBy }: { orderBy?: { createdAt: string } } = {}) => {
          const rows = [...promos];
          if (orderBy?.createdAt === 'desc') {
            rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          return rows;
        }),
        create: vi.fn(
          async ({
            data,
          }: {
            data: { code: string; discountPercent: number };
          }) => {
            if (promos.some((p) => p.code === data.code)) {
              const err = new Error('Unique constraint failed') as Error & {
                code?: string;
              };
              err.code = 'P2002';
              throw err;
            }
            const row: MockPromo = {
              id: `promo-${promos.length + 1}`,
              code: data.code,
              discountPercent: data.discountPercent,
              createdAt: new Date('2026-08-05T10:00:00.000Z'),
              updatedAt: new Date('2026-08-05T10:00:00.000Z'),
            };
            promos.push(row);
            return row;
          },
        ),
        findUnique: vi.fn(
          async ({ where }: { where: { id?: string; code?: string } }) => {
            if (where.id) return promos.find((p) => p.id === where.id) ?? null;
            if (where.code)
              return promos.find((p) => p.code === where.code) ?? null;
            return null;
          },
        ),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const index = promos.findIndex((p) => p.id === where.id);
          if (index < 0) {
            const err = new Error('Record to delete does not exist') as Error & {
              code?: string;
            };
            err.code = 'P2025';
            throw err;
          }
          const [removed] = promos.splice(index, 1);
          return removed;
        }),
      },
```

3. In `beforeEach`, set `promos = [];`.

4. Append tests:

```ts
  it('GET /admin/promos returns empty list', async () => {
    const response = await request(createApp())
      .get('/admin/promos')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  it('POST /admin/promos creates a normalized code', async () => {
    const response = await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: ' Summer20 ', discountPercent: 20 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      code: 'summer20',
      discountPercent: 20,
    });
    expect(response.body.id).toBeTruthy();
    expect(response.body.createdAt).toBeTruthy();
  });

  it('POST /admin/promos rejects duplicate code with 409', async () => {
    await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: 'dup', discountPercent: 10 });

    const response = await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: 'DUP', discountPercent: 15 });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
  });

  it('POST /admin/promos rejects invalid percent', async () => {
    const response = await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: 'x', discountPercent: 0 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE /admin/promos/:id removes code', async () => {
    const created = await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: 'gone', discountPercent: 30 });

    const response = await request(createApp())
      .delete(`/admin/promos/${created.body.id}`)
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });

    const list = await request(createApp())
      .get('/admin/promos')
      .set('X-Admin-Key', 'test-admin');
    expect(list.body.items).toEqual([]);
  });

  it('DELETE /admin/promos/:id returns 404 for missing', async () => {
    const response = await request(createApp())
      .delete('/admin/promos/missing')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('GET /admin/promos rejects requests without admin key', async () => {
    const response = await request(createApp()).get('/admin/promos');
    expect(response.status).toBe(401);
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts
```

Expected: new promo tests FAIL with 404 (routes missing).

- [ ] **Step 3: Implement admin routes**

In `apps/ai-app/src/routes/admin.ts`, add import:

```ts
import { normalizePromoCode } from '../lib/promos.js';
```

Add helper after `paymentResponse`:

```ts
function promoResponse(promo: {
  id: string;
  code: string;
  discountPercent: number;
  createdAt: Date;
}) {
  return {
    id: promo.id,
    code: promo.code,
    discountPercent: promo.discountPercent,
    createdAt: promo.createdAt.toISOString(),
  };
}

function isPrismaKnownError(
  err: unknown,
  code: string,
): err is { code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === code
  );
}
```

Append routes (after pricing block is fine):

```ts
adminRouter.get(
  '/promos',
  asyncHandler(async (_req, res) => {
    const prisma = requireDb();
    const items = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: items.map(promoResponse) });
  }),
);

adminRouter.post(
  '/promos',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const code = typeof req.body?.code === 'string'
      ? normalizePromoCode(req.body.code)
      : '';
    const discountPercent = req.body?.discountPercent;

    if (!code) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'code is required.');
    }
    if (
      typeof discountPercent !== 'number' ||
      !Number.isInteger(discountPercent) ||
      discountPercent < 1 ||
      discountPercent > 99
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'discountPercent must be an integer from 1 to 99.',
      );
    }

    try {
      const created = await prisma.promoCode.create({
        data: { code, discountPercent },
      });
      res.status(201).json(promoResponse(created));
    } catch (err) {
      if (isPrismaKnownError(err, 'P2002')) {
        throw new ApiError(409, 'CONFLICT', 'Promo code already exists.');
      }
      throw err;
    }
  }),
);

adminRouter.delete(
  '/promos/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const id = req.params.id;
    try {
      await prisma.promoCode.delete({ where: { id } });
      res.json({ ok: true });
    } catch (err) {
      if (isPrismaKnownError(err, 'P2025')) {
        throw new ApiError(404, 'NOT_FOUND', 'Promo code not found.');
      }
      throw err;
    }
  }),
);
```

- [ ] **Step 4: Run admin tests — expect PASS**

```bash
cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "feat(ai-app): admin promo create list delete API"
```

---

### Task 5: ai-web gateway proxy for promos

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/promos/route.ts`
- Create: `apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin` from `@/lib/gatewayAdmin`
- Produces: Next routes that forward to gateway `/admin/promos` and `/admin/promos/:id`

- [ ] **Step 1: Create list/create proxy**

Create `apps/ai-web/src/app/api/admin/gateway/promos/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('promos');
}

export async function POST(request: Request) {
  return proxyGatewayAdmin('promos', {
    body: await request.text(),
    method: 'POST',
  });
}
```

- [ ] **Step 2: Create delete proxy**

Create `apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(`promos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
```

- [ ] **Step 3: Smoke-check TypeScript on new files**

```bash
cd apps/ai-web && pnpm exec tsc --noEmit
```

Expected: exits 0 (or only pre-existing unrelated errors — new files must be clean).

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/promos/route.ts apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts
git commit -m "feat(ai-web): proxy admin promo CRUD"
```

---

### Task 6: Promos section on pricing page

**Files:**
- Modify: `apps/ai-web/src/app/admin/pricing/page.tsx`

**Interfaces:**
- Consumes: `adminApi` paths `promos` (GET/POST) and `promos/${id}` (DELETE)
- Produces: UI card under pricing with create form + table + delete confirm

- [ ] **Step 1: Extend pricing page with promos UI**

Update `apps/ai-web/src/app/admin/pricing/page.tsx`:

1. Expand imports:

```ts
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
```

2. Add types after `PricingFormValues`:

```ts
type PromoItem = {
  id: string;
  code: string;
  discountPercent: number;
  createdAt: string;
};

type PromosResponse = { items: PromoItem[] };

type PromoFormValues = {
  code: string;
  discountPercent: number;
};
```

3. Inside `PricingPage`, after `savePricing` mutation, add:

```ts
  const [promoForm] = Form.useForm<PromoFormValues>();
  const promosQuery = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: () => adminApi<PromosResponse>('promos'),
  });
  const createPromo = useMutation({
    mutationFn: (values: PromoFormValues) =>
      adminApi<PromoItem>('promos', {
        body: JSON.stringify({
          code: values.code,
          discountPercent: values.discountPercent,
        }),
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
      promoForm.resetFields();
      message.success('Промокод создан');
    },
    onError: (error) => message.error(error.message),
  });
  const deletePromo = useMutation({
    mutationFn: (id: string) =>
      adminApi<{ ok: true }>(`promos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
      message.success('Промокод удалён');
    },
    onError: (error) => message.error(error.message),
  });
```

4. After the pricing `</Card>`, before the fragment close, add:

```tsx
      <Card
        loading={promosQuery.isLoading}
        style={{ maxWidth: 640, marginTop: 24 }}
        title="Промокоды"
      >
        {promosQuery.error ? (
          <Alert
            description={promosQuery.error.message}
            message="Не удалось загрузить промокоды"
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
          />
        ) : null}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form<PromoFormValues>
            form={promoForm}
            layout="vertical"
            onFinish={(values) => createPromo.mutate(values)}
            requiredMark={false}
          >
            <Form.Item
              label="Код"
              name="code"
              rules={[{ message: 'Укажите код', required: true }]}
            >
              <Input placeholder="summer20" />
            </Form.Item>
            <Form.Item
              label="Скидка, %"
              name="discountPercent"
              rules={[
                { message: 'Укажите скидку', required: true },
                {
                  message: 'Скидка от 1 до 99',
                  max: 99,
                  min: 1,
                  type: 'integer',
                },
              ]}
            >
              <InputNumber max={99} min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button
              htmlType="submit"
              loading={createPromo.isPending}
              type="primary"
            >
              Создать
            </Button>
          </Form>
          <Table<PromoItem>
            columns={[
              { dataIndex: 'code', key: 'code', title: 'Код' },
              {
                dataIndex: 'discountPercent',
                key: 'discountPercent',
                render: (value: number) => `${value}%`,
                title: 'Скидка',
                width: 100,
              },
              {
                key: 'actions',
                render: (_: unknown, record: PromoItem) => (
                  <Popconfirm
                    cancelText="Отмена"
                    okText="Удалить"
                    onConfirm={() => deletePromo.mutate(record.id)}
                    title="Удалить промокод?"
                  >
                    <Button danger loading={deletePromo.isPending} type="link">
                      Удалить
                    </Button>
                  </Popconfirm>
                ),
                title: '',
                width: 120,
              },
            ]}
            dataSource={promosQuery.data?.items ?? []}
            locale={{ emptyText: 'Промокодов пока нет' }}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Space>
      </Card>
```

- [ ] **Step 2: Manual check (optional if servers running)**

1. Apply migration: `cd apps/ai-app && pnpm prisma:migrate` (or `prisma migrate deploy` against local DB).
2. Open `/admin/pricing`, create a code, validate on `/subscribe` in `ai-food`, delete code, confirm validate fails.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/admin/pricing/page.tsx
git commit -m "feat(ai-web): manage promo codes on pricing page"
```

---

### Task 7: Full regression

**Files:** none (verify only)

- [ ] **Step 1: Run ai-app tests**

```bash
cd apps/ai-app && pnpm test
```

Expected: all PASS.

- [ ] **Step 2: Typecheck ai-app**

```bash
cd apps/ai-app && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Confirm no leftover hardcoded catalog**

```bash
rg "new80|new50|PROMOS = new Map" apps/ai-app/src --glob '!*.test.ts'
```

Expected: no matches in non-test source (tests may still seed mock `new80`/`new50` for fixtures).

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `PromoCode` model + migration, no seed | 1 |
| Remove hardcoded map; DB lookup | 2 |
| Billing validate/subscribe use DB | 3 |
| Admin GET/POST/DELETE promos | 4 |
| Duplicate 409, validation 1–99 | 4 |
| Delete `{ ok: true }` | 4 |
| ai-web gateway proxy | 5 |
| Promos card on pricing page | 6 |
| Empty catalog / no new80 seed in prod | 1 + 2 |
| Formula min 1 kopeck | 2 (unchanged helper) |
| No ai-food / sidebar changes | — (explicit non-goals) |
