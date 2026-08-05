import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mockGetPrisma = vi.fn();
const mockIsDatabaseConfigured = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) =>
    mockIsDatabaseConfigured(...args),
}));

import { createApp } from '../app.js';

type MockUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: 'none' | 'active';
  subscriptionExpiresAt: Date | null;
};

type MockPayment = {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  tbankPaymentId: string | null;
  tbankOrderId: string;
  paidAt: Date | null;
  createdAt: Date;
};

describe('admin routes', () => {
  let settings: {
    id: number;
    subscriptionPriceKopecks: number | null;
    subscriptionDurationDays: number | null;
    updatedAt: Date;
  } | null;
  let users: MockUser[];
  let payments: MockPayment[];
  let prisma: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    return {
      appSettings: {
        findUnique: vi.fn(async () => settings),
        upsert: vi.fn(
          async ({
            create,
            update,
          }: {
            create: typeof settings;
            update: Partial<NonNullable<typeof settings>>;
          }) => {
            settings = settings
              ? { ...settings, ...update, updatedAt: new Date() }
              : {
                  ...create!,
                  updatedAt: new Date(),
                };
            return settings;
          },
        ),
      },
      user: {
        count: vi.fn(async ({ where }: { where?: unknown } = {}) =>
          where ? 2 : users.length,
        ),
        findMany: vi.fn(async () => [users[0]]),
        findUnique: vi.fn(
          async ({ where }: { where: { id: string } }) =>
            users.find((user) => user.id === where.id) ?? null,
        ),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<MockUser>;
          }) => {
            const index = users.findIndex((user) => user.id === where.id);
            if (index < 0) throw new Error('User not found');
            users[index] = { ...users[index], ...data };
            return users[index];
          },
        ),
      },
      payment: {
        aggregate: vi.fn(async () => ({
          _count: 3,
          _sum: { amount: 45_000 },
        })),
        findMany: vi.fn(
          async ({
            include,
            orderBy,
            take,
          }: {
            include?: { user?: { select: Record<string, boolean> } };
            orderBy?: { createdAt: 'desc' | 'asc' };
            take?: number;
          } = {}) => {
            const sorted = [...payments].sort((a, b) =>
              orderBy?.createdAt === 'asc'
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime(),
            );
            const sliced = typeof take === 'number' ? sorted.slice(0, take) : sorted;
            return sliced.map((payment) => {
              const user = users.find((u) => u.id === payment.userId);
              if (!include?.user || !user) return payment;
              return {
                ...payment,
                user: {
                  id: user.id,
                  telegramId: user.telegramId,
                  username: user.username,
                  firstName: user.firstName,
                  lastName: user.lastName,
                },
              };
            });
          },
        ),
        findUnique: vi.fn(
          async ({ where }: { where: { id: string } }) =>
            payments.find((p) => p.id === where.id) ?? null,
        ),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const index = payments.findIndex((p) => p.id === where.id);
          if (index < 0) throw new Error('Payment not found');
          const [removed] = payments.splice(index, 1);
          return removed;
        }),
      },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      ),
      usageEvent: {
        count: vi.fn(async ({ where }: { where: { kind: string; createdAt: unknown } }) => {
          const days = where.createdAt ? 1 : 0;
          if (where.kind === 'analyze') return days ? 7 : 0;
          return days ? 4 : 0;
        }),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = 'test-admin';
    process.env.SUBSCRIPTION_PRICE_KOPECKS = '10000';
    process.env.SUBSCRIPTION_DURATION_DAYS = '365';
    settings = null;
    payments = [
      {
        id: 'pay-confirmed',
        userId: 'user-2',
        amount: 90_000,
        status: 'confirmed',
        tbankPaymentId: 'tb-1',
        tbankOrderId: 'pay-confirmed',
        paidAt: new Date('2026-08-01T12:00:00.000Z'),
        createdAt: new Date('2026-08-01T11:00:00.000Z'),
      },
      {
        id: 'pay-pending',
        userId: 'user-1',
        amount: 90_000,
        status: 'pending',
        tbankPaymentId: null,
        tbankOrderId: 'pay-pending',
        paidAt: null,
        createdAt: new Date('2026-08-02T11:00:00.000Z'),
      },
    ];
    users = [
      {
        id: 'user-1',
        telegramId: '1001',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Admin',
        subscriptionStatus: 'none',
        subscriptionExpiresAt: null,
      },
      {
        id: 'user-2',
        telegramId: '1002',
        username: 'bob',
        firstName: 'Bob',
        lastName: null,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
      },
    ];
    prisma = createMockPrisma();
    mockGetPrisma.mockReturnValue(prisma);
    mockIsDatabaseConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
    delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
    delete process.env.SUBSCRIPTION_DURATION_DAYS;
  });

  it('GET /admin/pricing rejects requests without admin key', async () => {
    const response = await request(createApp()).get('/admin/pricing');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /admin/pricing returns the effective pricing', async () => {
    const response = await request(createApp())
      .get('/admin/pricing')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      priceKopecks: 10_000,
      durationDays: 365,
      source: 'env',
    });
  });

  it('PUT /admin/pricing upserts settings and returns db source', async () => {
    const response = await request(createApp())
      .put('/admin/pricing')
      .set('X-Admin-Key', 'test-admin')
      .send({ priceKopecks: 25_000, durationDays: 30 });

    expect(response.status).toBe(200);
    expect(prisma.appSettings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: {
        id: 1,
        subscriptionPriceKopecks: 25_000,
        subscriptionDurationDays: 30,
      },
      update: {
        subscriptionPriceKopecks: 25_000,
        subscriptionDurationDays: 30,
      },
    });
    expect(response.body).toEqual({
      priceKopecks: 25_000,
      durationDays: 30,
      source: 'db',
    });
  });

  it('GET /admin/stats returns the dashboard summary shape', async () => {
    prisma.usageEvent.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(21)
      .mockResolvedValueOnce(12);

    const response = await request(createApp())
      .get('/admin/stats')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usersTotal: 2,
      activeSubscriptions: 2,
      paymentsConfirmedCount: 3,
      paymentsConfirmedSumKopecks: 45_000,
      usageAnalyzeLast7Days: 7,
      usageRefineLast7Days: 4,
      usageAnalyzeLast30Days: 21,
      usageRefineLast30Days: 12,
    });
  });

  it('GET /admin/users searches by id, telegram id, or username', async () => {
    const response = await request(createApp())
      .get('/admin/users?q=alice')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { equals: 'alice' } },
          { telegramId: { equals: 'alice' } },
          { telegramId: { contains: 'alice' } },
          { username: { contains: 'alice', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    expect(response.body.users[0]).toMatchObject({
      id: 'user-1',
      telegramId: '1001',
      username: 'alice',
      subscriptionStatus: 'none',
      hasActiveSubscription: false,
    });
  });

  it('POST /admin/users/:id/subscription activates a subscription', async () => {
    const before = Date.now();
    const response = await request(createApp())
      .post('/admin/users/user-1/subscription')
      .set('X-Admin-Key', 'test-admin')
      .send({ action: 'activate', days: 10 });

    expect(response.status).toBe(200);
    expect(response.body.subscriptionStatus).toBe('active');
    expect(new Date(response.body.subscriptionExpiresAt).getTime()).toBeGreaterThanOrEqual(
      before + 9 * 24 * 60 * 60 * 1000,
    );
  });

  it.each([0.5, 0])(
    'POST /admin/users/:id/subscription rejects activate with invalid days=%s',
    async (days) => {
      const response = await request(createApp())
        .post('/admin/users/user-1/subscription')
        .set('X-Admin-Key', 'test-admin')
        .send({ action: 'activate', days });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('days must be a positive integer.');
    },
  );

  it('POST /admin/users/:id/subscription extends from a future expiry', async () => {
    const currentExpiry = users[1].subscriptionExpiresAt!;
    const response = await request(createApp())
      .post('/admin/users/user-2/subscription')
      .set('X-Admin-Key', 'test-admin')
      .send({ action: 'extend', days: 5 });

    expect(response.status).toBe(200);
    expect(response.body.subscriptionExpiresAt).toBe(
      new Date(currentExpiry.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it('POST /admin/users/:id/subscription revokes a subscription', async () => {
    const response = await request(createApp())
      .post('/admin/users/user-2/subscription')
      .set('X-Admin-Key', 'test-admin')
      .send({ action: 'revoke' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
      hasActiveSubscription: false,
    });
  });

  it('POST /admin/users/:id/subscription returns 404 for unknown user', async () => {
    const response = await request(createApp())
      .post('/admin/users/missing/subscription')
      .set('X-Admin-Key', 'test-admin')
      .send({ action: 'activate' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.message).toBe('User not found.');
  });

  it('GET /admin/payments returns payments with user fields', async () => {
    const response = await request(createApp())
      .get('/admin/payments')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body.payments).toHaveLength(2);
    expect(response.body.payments[0].id).toBe('pay-pending');
    expect(response.body.payments[0].user).toEqual({
      id: 'user-1',
      telegramId: '1001',
      username: 'alice',
      firstName: 'Alice',
      lastName: 'Admin',
    });
    expect(response.body.payments[1].status).toBe('confirmed');
  });

  it('GET /admin/payments rejects requests without admin key', async () => {
    const response = await request(createApp()).get('/admin/payments');
    expect(response.status).toBe(401);
  });

  it('DELETE /admin/payments/:id deletes confirmed payment and revokes subscription', async () => {
    const response = await request(createApp())
      .delete('/admin/payments/pay-confirmed')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, revokedSubscription: true });
    expect(payments.find((p) => p.id === 'pay-confirmed')).toBeUndefined();
    expect(users.find((u) => u.id === 'user-2')).toMatchObject({
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
  });

  it('DELETE /admin/payments/:id deletes pending payment without revoking', async () => {
    const before = users.find((u) => u.id === 'user-1')!;
    const response = await request(createApp())
      .delete('/admin/payments/pay-pending')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, revokedSubscription: false });
    expect(payments.find((p) => p.id === 'pay-pending')).toBeUndefined();
    expect(users.find((u) => u.id === 'user-1')).toEqual(before);
  });

  it('DELETE /admin/payments/:id returns 404 for missing payment', async () => {
    const response = await request(createApp())
      .delete('/admin/payments/missing')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('DELETE /admin/payments/:id rejects requests without admin key', async () => {
    const response = await request(createApp()).delete(
      '/admin/payments/pay-pending',
    );
    expect(response.status).toBe(401);
  });
});
