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

- [ ] **Step 2: Run tests вЂ” expect FAIL**

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

- [ ] **Step 4: Run tests вЂ” expect PASS**

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

