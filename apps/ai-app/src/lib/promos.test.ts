import { describe, it, expect, vi } from 'vitest';
import {
  normalizePromoCode,
  lookupPromo,
  applyPromoDiscount,
  resolvePromo,
} from './promos.js';

function mockPrisma(
  rows: { code: string; discountPercent: number }[],
  users: { id: string; referralCode: string }[] = [],
) {
  return {
    promoCode: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
        const row = rows.find((r) => r.code === where.code);
        return row
          ? { id: 'p1', code: row.code, discountPercent: row.discountPercent }
          : null;
      }),
    },
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; referralCode?: string } }) => {
          if (where.referralCode) {
            return users.find((u) => u.referralCode === where.referralCode) ?? null;
          }
          if (where.id) {
            return users.find((u) => u.id === where.id) ?? null;
          }
          return null;
        },
      ),
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
      source: 'admin',
    });
  });

  it('resolvePromo returns null for invalid', async () => {
    const prisma = mockPrisma([]);
    await expect(resolvePromo(prisma as never, 'x', 10_000)).resolves.toBeNull();
    await expect(resolvePromo(null, 'new80', 10_000)).resolves.toBeNull();
  });

  it('resolvePromo prefers admin catalog over a matching user referralCode', async () => {
    const prisma = mockPrisma(
      [{ code: 'alice', discountPercent: 50 }],
      [{ id: 'ref-1', referralCode: 'alice' }],
    );
    await expect(resolvePromo(prisma as never, 'Alice', 10_000)).resolves.toEqual({
      code: 'alice',
      discountPercent: 50,
      originalAmount: 10_000,
      finalAmount: 5_000,
      source: 'admin',
    });
  });

  it('resolvePromo treats a free user referralCode as 10% referral', async () => {
    const prisma = mockPrisma([], [{ id: 'ref-1', referralCode: 'alice' }]);
    await expect(resolvePromo(prisma as never, ' @Alice ', 10_000)).resolves.toEqual({
      code: 'alice',
      discountPercent: 10,
      originalAmount: 10_000,
      finalAmount: 9_000,
      source: 'referral',
      referrerId: 'ref-1',
    });
  });
});
