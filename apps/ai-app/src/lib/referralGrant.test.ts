import { describe, expect, it, vi } from 'vitest';
import {
  grantReferralRewardIfNeeded,
  REFERRAL_REWARD_DAYS,
} from './referralGrant.js';

type UserRow = {
  id: string;
  referralCode?: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
};

type PaymentRow = {
  id: string;
  userId: string;
  promoCode: string | null;
  referralGrantedAt: Date | null;
  status?: string;
};

function mockPrisma(opts: {
  users: UserRow[];
  payments: PaymentRow[];
  promoCodes?: string[];
}) {
  const users = new Map(opts.users.map((u) => [u.id, { ...u }]));
  const payments = new Map(opts.payments.map((p) => [p.id, { ...p }]));
  const promos = new Set(opts.promoCodes ?? []);

  const prisma = {
    promoCode: {
      findUnique: async ({ where }: { where: { code: string } }) =>
        promos.has(where.code) ? { id: 'p', code: where.code } : null,
    },
    user: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; referralCode?: string };
      }) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.referralCode) {
          return (
            [...users.values()].find((u) => u.referralCode === where.referralCode) ??
            null
          );
        }
        return null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<UserRow>;
      }) => {
        const prev = users.get(where.id);
        if (!prev) throw new Error('user not found');
        const next = { ...prev, ...data };
        users.set(where.id, next);
        return next;
      },
    },
    payment: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<PaymentRow>;
      }) => {
        const prev = payments.get(where.id);
        if (!prev) throw new Error('payment not found');
        const next = { ...prev, ...data };
        payments.set(where.id, next);
        return next;
      },
    },
    $transaction: async (
      fn: (tx: typeof prisma) => Promise<void>,
    ) => fn(prisma),
    users,
    payments,
  };

  return prisma;
}

describe('grantReferralRewardIfNeeded', () => {
  it('activates a referrer with none/expired status for 30 UTC days from now', async () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const expired = new Date('2026-01-01T00:00:00.000Z');
    const prisma = mockPrisma({
      users: [
        {
          id: 'ref-1',
          referralCode: 'alice',
          subscriptionStatus: 'none',
          subscriptionExpiresAt: expired,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          userId: 'buyer-1',
          promoCode: 'alice',
          referralGrantedAt: null,
        },
      ],
    });

    await grantReferralRewardIfNeeded(
      prisma as never,
      prisma.payments.get('pay-1')!,
    );

    const expected = new Date(now);
    expected.setUTCDate(expected.getUTCDate() + REFERRAL_REWARD_DAYS);
    expect(prisma.users.get('ref-1')).toMatchObject({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expected,
    });
    expect(prisma.payments.get('pay-1')?.referralGrantedAt).toEqual(now);
    vi.useRealTimers();
  });

  it('extends an active referrer by 30 UTC days from current expiry', async () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const currentExpiry = new Date('2027-01-01T00:00:00.000Z');
    const prisma = mockPrisma({
      users: [
        {
          id: 'ref-1',
          referralCode: 'alice',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: currentExpiry,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          userId: 'buyer-1',
          promoCode: 'alice',
          referralGrantedAt: null,
        },
      ],
    });

    await grantReferralRewardIfNeeded(
      prisma as never,
      prisma.payments.get('pay-1')!,
    );

    const expected = new Date(currentExpiry);
    expected.setUTCDate(expected.getUTCDate() + REFERRAL_REWARD_DAYS);
    expect(prisma.users.get('ref-1')?.subscriptionExpiresAt).toEqual(expected);
    expect(expected.toISOString()).toBe('2027-01-31T00:00:00.000Z');
    vi.useRealTimers();
  });

  it('does not grant for an admin catalog promo', async () => {
    const prisma = mockPrisma({
      promoCodes: ['sale10'],
      users: [
        {
          id: 'ref-1',
          referralCode: 'sale10',
          subscriptionStatus: 'none',
          subscriptionExpiresAt: null,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          userId: 'buyer-1',
          promoCode: 'sale10',
          referralGrantedAt: null,
        },
      ],
    });

    await grantReferralRewardIfNeeded(
      prisma as never,
      prisma.payments.get('pay-1')!,
    );

    expect(prisma.users.get('ref-1')?.subscriptionStatus).toBe('none');
    expect(prisma.payments.get('pay-1')?.referralGrantedAt).toBeNull();
  });

  it('is a no-op when referralGrantedAt is already set', async () => {
    const grantedAt = new Date('2026-08-01T00:00:00.000Z');
    const expiry = new Date('2026-09-01T00:00:00.000Z');
    const prisma = mockPrisma({
      users: [
        {
          id: 'ref-1',
          referralCode: 'alice',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expiry,
        },
      ],
      payments: [
        {
          id: 'pay-1',
          userId: 'buyer-1',
          promoCode: 'alice',
          referralGrantedAt: grantedAt,
        },
      ],
    });

    await grantReferralRewardIfNeeded(
      prisma as never,
      prisma.payments.get('pay-1')!,
    );

    expect(prisma.users.get('ref-1')?.subscriptionExpiresAt).toEqual(expiry);
    expect(prisma.payments.get('pay-1')?.referralGrantedAt).toEqual(grantedAt);
  });
});
