### Task 4: Admin promo CRUD API

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Produces:
  - `GET /admin/promos` в†’ `{ items: PromoItem[] }`
  - `POST /admin/promos` body `{ code, discountPercent }` в†’ `201` PromoItem
  - `DELETE /admin/promos/:id` в†’ `{ ok: true }`
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

- [ ] **Step 2: Run tests вЂ” expect FAIL**

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

- [ ] **Step 4: Run admin tests вЂ” expect PASS**

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

