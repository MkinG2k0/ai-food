import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mockGetPrisma = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockCollectOpenRouter = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) =>
    mockIsDatabaseConfigured(...args),
}));

vi.mock('../lib/openrouterAdminClient.js', () => ({
  collectOpenRouterAdminSnapshot: (...args: unknown[]) =>
    mockCollectOpenRouter(...args),
}));

import { createApp } from '../app.js';

type MockUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  subscriptionStatus: 'none' | 'active';
  subscriptionExpiresAt: Date | null;
  dataConsentAt: Date | null;
  dataConsentVersion: string | null;
  createdAt: Date;
};

type MockPayment = {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  promoCode: string | null;
  tbankPaymentId: string | null;
  tbankOrderId: string;
  paidAt: Date | null;
  referralGrantedAt: Date | null;
  createdAt: Date;
};

type MockPromo = {
  id: string;
  code: string;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

type MockUsageEvent = {
  id: string;
  userId: string | null;
  kind:
    | 'analyze_photo'
    | 'analyze_text'
    | 'analyze_photo_text'
    | 'refine'
    | 'manual'
    | 'barcode';
  deviceId: string;
  clientDeviceId: string;
  createdAt: Date;
};

type MockDevice = {
  id: string;
  deviceId: string;
  userId: string | null;
  createdAt: Date;
};

describe('admin routes', () => {
  let settings: {
    id: number;
    subscriptionPriceKopecks: number | null;
    subscriptionDurationDays: number | null;
    freeGenerationLimit: number | null;
    authLoginGenerationBonus: number | null;
    updatedAt: Date;
  } | null;
  let users: MockUser[];
  let payments: MockPayment[];
  let promos: MockPromo[];
  let usageEvents: MockUsageEvent[];
  let devices: MockDevice[];
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
        findMany: vi.fn(
          async ({
            select,
          }: {
            select?: {
              createdAt?: boolean;
              id?: boolean;
              subscriptionStatus?: boolean;
              subscriptionExpiresAt?: boolean;
            };
          } = {}) => {
            if (select?.createdAt && !select?.id) {
              return users.map((user) => ({ createdAt: user.createdAt }));
            }
            if (
              select?.id &&
              select?.subscriptionStatus &&
              select?.subscriptionExpiresAt
            ) {
              return users.map((user) => ({
                id: user.id,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionExpiresAt: user.subscriptionExpiresAt,
              }));
            }
            return [users[0]];
          },
        ),
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
        groupBy: vi.fn(
          async ({
            by,
            where,
          }: {
            by: string[];
            where?: {
              promoCode?: { in: string[] };
              status?: string;
            };
          }) => {
            if (!by.includes('promoCode')) return [];
            const codes = where?.promoCode?.in ?? [];
            const counts = new Map<string, number>();
            for (const payment of payments) {
              if (where?.status && payment.status !== where.status) continue;
              if (!payment.promoCode) continue;
              if (codes.length > 0 && !codes.includes(payment.promoCode)) continue;
              counts.set(
                payment.promoCode,
                (counts.get(payment.promoCode) ?? 0) + 1,
              );
            }
            return [...counts.entries()].map(([promoCode, count]) => ({
              promoCode,
              _count: { _all: count },
            }));
          },
        ),
        findMany: vi.fn(
          async ({
            where,
            include,
            orderBy,
            take,
            select,
          }: {
            where?: { userId?: string; status?: string };
            include?: { user?: { select: Record<string, boolean> } };
            orderBy?: { createdAt: 'desc' | 'asc' };
            take?: number;
            select?: {
              amount?: boolean;
              paidAt?: boolean;
              createdAt?: boolean;
              userId?: boolean;
              status?: boolean;
              promoCode?: boolean;
              referralGrantedAt?: boolean;
            };
          } = {}) => {
            const filtered = payments.filter((payment) => {
              if (where?.userId && payment.userId !== where.userId) return false;
              if (where?.status && payment.status !== where.status) return false;
              return true;
            });
            const sorted = [...filtered].sort((a, b) =>
              orderBy?.createdAt === 'asc'
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime(),
            );
            const sliced = typeof take === 'number' ? sorted.slice(0, take) : sorted;
            if (select?.userId && select?.status) {
              return sliced.map((payment) => ({
                userId: payment.userId,
                amount: payment.amount,
                status: payment.status,
                promoCode: payment.promoCode,
                referralGrantedAt: payment.referralGrantedAt,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
              }));
            }
            if (select) {
              return sliced.map((payment) => ({
                amount: payment.amount,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
              }));
            }
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
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      ),
      device: {
        count: vi.fn(
          async ({
            where,
          }: {
            where?: {
              userId?: null;
              usageEvents?: {
                some?: { kind?: { startsWith: string } };
              };
            };
          } = {}) => {
            let rows = devices.filter((device) =>
              where?.userId === null ? device.userId == null : true,
            );
            if (where?.usageEvents?.some?.kind?.startsWith) {
              const prefix = where.usageEvents.some.kind.startsWith;
              const withScan = new Set(
                usageEvents
                  .filter((event) => event.kind.startsWith(prefix))
                  .map((event) => event.deviceId),
              );
              rows = rows.filter((device) => withScan.has(device.id));
            }
            return rows.length;
          },
        ),
        findMany: vi.fn(
          async ({
            where,
            orderBy,
            take,
          }: {
            where?: {
              userId?: { in: string[] } | null;
              OR?: Array<{
                id?: { equals: string };
                deviceId?: { equals: string; contains?: string; mode?: string };
              }>;
            };
            orderBy?: { createdAt: 'desc' | 'asc' };
            take?: number;
            select?: { id: boolean; userId: boolean };
          } = {}) => {
            if (where?.userId && typeof where.userId === 'object' && 'in' in where.userId) {
              const userIds = where.userId.in;
              return devices.filter(
                (device) => device.userId && userIds.includes(device.userId),
              );
            }

            let rows = devices.filter((device) => device.userId == null);
            if (where?.OR?.length) {
              const q = where.OR;
              rows = rows.filter((device) =>
                q.some((clause) => {
                  if (clause.id?.equals && device.id === clause.id.equals) {
                    return true;
                  }
                  if (
                    clause.deviceId?.equals &&
                    device.deviceId === clause.deviceId.equals
                  ) {
                    return true;
                  }
                  if (
                    clause.deviceId?.contains &&
                    device.deviceId
                      .toLowerCase()
                      .includes(clause.deviceId.contains.toLowerCase())
                  ) {
                    return true;
                  }
                  return false;
                }),
              );
            }
            rows = [...rows].sort((a, b) =>
              orderBy?.createdAt === 'asc'
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime(),
            );
            return typeof take === 'number' ? rows.slice(0, take) : rows;
          },
        ),
        findUnique: vi.fn(
          async ({ where }: { where: { id: string } }) =>
            devices.find((device) => device.id === where.id) ?? null,
        ),
      },
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
      usageEvent: {
        count: vi.fn(
          async ({
            where,
          }: {
            where: {
              kind: string | { startsWith: string };
              createdAt: unknown;
            };
          }) => {
            const days = where.createdAt ? 1 : 0;
            if (
              (typeof where.kind === 'string' && where.kind === 'analyze') ||
              (typeof where.kind === 'object' &&
                where.kind.startsWith === 'analyze')
            ) {
              return days ? 7 : 0;
            }
            return days ? 4 : 0;
          },
        ),
        groupBy: vi.fn(
          async ({
            by,
            where,
          }: {
            by?: string[];
            where: {
              OR?: Array<{
                userId?: { in: string[] };
                deviceId?: { in: string[] };
              }>;
              userId?: { in: string[] };
              deviceId?: { in: string[] };
              createdAt?: { gte?: Date; lte?: Date };
            };
          }) => {
            const userIds =
              where.userId?.in ??
              where.OR?.find((c) => c.userId)?.userId?.in ??
              [];
            const deviceIds =
              where.deviceId?.in ??
              where.OR?.find((c) => c.deviceId)?.deviceId?.in ??
              [];
            const counts = new Map<string, number>();
            for (const event of usageEvents) {
              if (
                where.createdAt?.gte &&
                event.createdAt < where.createdAt.gte
              ) {
                continue;
              }
              if (
                where.createdAt?.lte &&
                event.createdAt > where.createdAt.lte
              ) {
                continue;
              }
              const matchUser =
                event.userId != null && userIds.includes(event.userId);
              const matchDevice = deviceIds.includes(event.deviceId);
              if (!matchUser && !matchDevice) continue;
              const key =
                by?.length === 2 && by[0] === 'deviceId'
                  ? `${event.deviceId}:${event.kind}`
                  : `${event.userId ?? ''}:${event.kind}:${event.deviceId}`;
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return [...counts].map(([key, count]) => {
              if (by?.length === 2 && by[0] === 'deviceId') {
                const [deviceId, kind] = key.split(':');
                return {
                  deviceId,
                  kind,
                  _count: { _all: count },
                };
              }
              const [userId, kind, deviceId] = key.split(':');
              return {
                userId: userId || null,
                kind,
                deviceId,
                _count: { _all: count },
              };
            });
          },
        ),
        findMany: vi.fn(
          async ({
            where,
            orderBy,
            take,
            include,
            select,
          }: {
            where?: {
              userId?: string;
              deviceId?: string;
              createdAt?: { gte?: Date };
            };
            orderBy?: { createdAt: 'desc' | 'asc' };
            take?: number;
            include?: { device?: { select: { deviceId: boolean } } };
            select?: {
              kind?: boolean;
              createdAt?: boolean;
              userId?: boolean;
              deviceId?: boolean;
            };
          }) => {
            let rows = usageEvents;
            if (where?.createdAt?.gte) {
              rows = rows.filter(
                (event) => event.createdAt >= where.createdAt!.gte!,
              );
            }
            if (select?.userId || select?.deviceId) {
              return rows.map((event) => ({
                kind: event.kind,
                userId: event.userId,
                deviceId: event.deviceId,
                createdAt: event.createdAt,
              }));
            }
            if (select) {
              return rows.map((event) => ({
                kind: event.kind,
                createdAt: event.createdAt,
              }));
            }
            if (where?.deviceId) {
              rows = rows.filter((event) => event.deviceId === where.deviceId);
            } else if (where?.userId !== undefined) {
              rows = rows.filter((event) => event.userId === where.userId);
            }
            return rows
              .sort((a, b) =>
                orderBy?.createdAt === 'asc'
                  ? a.createdAt.getTime() - b.createdAt.getTime()
                  : b.createdAt.getTime() - a.createdAt.getTime(),
              )
              .slice(0, take)
              .map((event) => ({
                id: event.id,
                kind: event.kind,
                deviceId: event.deviceId,
                createdAt: event.createdAt,
                ...(include?.device
                  ? { device: { deviceId: event.clientDeviceId } }
                  : {}),
              }));
          },
        ),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = 'test-admin';
    process.env.SUBSCRIPTION_PRICE_KOPECKS = '10000';
    process.env.SUBSCRIPTION_DURATION_DAYS = '365';
    settings = null;
    promos = [];
    devices = [
      {
        id: 'device-row-1',
        deviceId: 'client-device-1',
        userId: 'user-1',
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
      },
      {
        id: 'device-row-guest',
        deviceId: 'guest-client-device',
        userId: null,
        createdAt: new Date('2026-08-06T08:00:00.000Z'),
      },
    ];
    usageEvents = [
      {
        id: 'usage-1',
        userId: 'user-1',
        kind: 'analyze_photo',
        deviceId: 'device-row-1',
        clientDeviceId: 'client-device-1',
        createdAt: new Date('2026-08-04T12:00:00.000Z'),
      },
      {
        id: 'usage-2',
        userId: 'user-1',
        kind: 'analyze_photo',
        deviceId: 'device-row-1',
        clientDeviceId: 'client-device-1',
        createdAt: new Date('2026-08-05T12:00:00.000Z'),
      },
      {
        id: 'usage-3',
        userId: 'user-1',
        kind: 'refine',
        deviceId: 'device-row-1',
        clientDeviceId: 'client-device-1',
        createdAt: new Date('2026-08-05T13:00:00.000Z'),
      },
      {
        id: 'usage-guest-1',
        userId: null,
        kind: 'analyze_photo',
        deviceId: 'device-row-guest',
        clientDeviceId: 'guest-client-device',
        createdAt: new Date('2026-08-06T09:00:00.000Z'),
      },
      {
        id: 'usage-guest-2',
        userId: null,
        kind: 'analyze_text',
        deviceId: 'device-row-guest',
        clientDeviceId: 'guest-client-device',
        createdAt: new Date('2026-08-06T10:00:00.000Z'),
      },
    ];
    payments = [
      {
        id: 'pay-confirmed',
        userId: 'user-2',
        amount: 90_000,
        status: 'confirmed',
        promoCode: null,
        tbankPaymentId: 'tb-1',
        tbankOrderId: 'pay-confirmed',
        paidAt: new Date('2026-08-01T12:00:00.000Z'),
        referralGrantedAt: null,
        createdAt: new Date('2026-08-01T11:00:00.000Z'),
      },
      {
        id: 'pay-pending',
        userId: 'user-1',
        amount: 90_000,
        status: 'pending',
        promoCode: null,
        tbankPaymentId: null,
        tbankOrderId: 'pay-pending',
        paidAt: null,
        referralGrantedAt: null,
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
        photoUrl: 'https://example.com/alice.jpg',
        subscriptionStatus: 'none',
        subscriptionExpiresAt: null,
        dataConsentAt: new Date('2026-08-01T09:00:00.000Z'),
        dataConsentVersion: 'v1',
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
      },
      {
        id: 'user-2',
        telegramId: '1002',
        username: 'bob',
        firstName: 'Bob',
        lastName: null,
        photoUrl: null,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
        dataConsentAt: null,
        dataConsentVersion: null,
        createdAt: new Date('2026-07-02T10:00:00.000Z'),
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
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
      source: 'env',
    });
  });

  it('PUT /admin/pricing upserts settings and returns db source', async () => {
    const response = await request(createApp())
      .put('/admin/pricing')
      .set('X-Admin-Key', 'test-admin')
      .send({
        priceKopecks: 25_000,
        durationDays: 30,
        freeGenerationLimit: 40,
        authLoginGenerationBonus: 80,
      });

    expect(response.status).toBe(200);
    expect(prisma.appSettings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: {
        id: 1,
        subscriptionPriceKopecks: 25_000,
        subscriptionDurationDays: 30,
        freeGenerationLimit: 40,
        authLoginGenerationBonus: 80,
      },
      update: {
        subscriptionPriceKopecks: 25_000,
        subscriptionDurationDays: 30,
        freeGenerationLimit: 40,
        authLoginGenerationBonus: 80,
      },
    });
    expect(response.body).toEqual({
      priceKopecks: 25_000,
      durationDays: 30,
      freeGenerationLimit: 40,
      authLoginGenerationBonus: 80,
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
    expect(response.body).toMatchObject({
      usersTotal: 2,
      guestsWithScansTotal: 1,
      usersAndGuestsTotal: 3,
      activeSubscriptions: 2,
      paymentsConfirmedCount: 3,
      paymentsConfirmedSumKopecks: 45_000,
      usageAnalyzeLast7Days: 7,
      usageRefineLast7Days: 4,
      usageAnalyzeLast30Days: 21,
      usageRefineLast30Days: 12,
      requests: {
        last7Days: { count: 0, okCount: 0, errorCount: 0 },
        last30Days: { count: 0, okCount: 0, errorCount: 0 },
        byType: [],
      },
      analytics: {
        funnel: {
          guestsWithScans: 1,
          users: 2,
          payingUsers: expect.any(Number),
          userToPayRate: expect.anything(),
        },
        revenue: {
          last7DaysKopecks: expect.any(Number),
          last30DaysKopecks: expect.any(Number),
        },
        paymentsByStatus: {
          pending: expect.any(Number),
          confirmed: expect.any(Number),
          rejected: expect.any(Number),
          refunded: expect.any(Number),
        },
        promo: {
          confirmedCount: expect.any(Number),
          confirmedSumKopecks: expect.any(Number),
        },
        referral: { confirmedCount: expect.any(Number) },
        subscriptions: {
          active: expect.any(Number),
          expiringSoon7Days: expect.any(Number),
          expiredOrInactive: expect.any(Number),
        },
        product: {
          dau: expect.any(Number),
          wau: expect.any(Number),
          usageMix30d: expect.any(Object),
          analyzeAuthShare30d: expect.any(Object),
          quotaExhausted: expect.any(Object),
          retention: expect.any(Object),
        },
      },
    });
    expect(response.body.requests).toMatchObject({
      last7Days: {
        count: expect.any(Number),
        okCount: expect.any(Number),
        errorCount: expect.any(Number),
      },
      last30Days: {
        count: expect.any(Number),
        okCount: expect.any(Number),
        errorCount: expect.any(Number),
      },
      byType: expect.any(Array),
    });
    expect(prisma.device.count).toHaveBeenCalledWith({
      where: {
        userId: null,
        usageEvents: {
          some: { kind: { startsWith: 'analyze' } },
        },
      },
    });
  });

  it('GET /admin/stats counts analyze* prefix', async () => {
    const response = await request(createApp())
      .get('/admin/stats')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(prisma.usageEvent.count).toHaveBeenNthCalledWith(1, {
      where: {
        kind: { startsWith: 'analyze' },
        createdAt: { gte: expect.any(Date) },
      },
    });
    expect(prisma.usageEvent.count).toHaveBeenNthCalledWith(3, {
      where: {
        kind: { startsWith: 'analyze' },
        createdAt: { gte: expect.any(Date) },
      },
    });
  });

  it('GET /admin/stats/series returns day series shape', async () => {
    const response = await request(createApp())
      .get('/admin/stats/series?days=7')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body.days).toBe(7);
    expect(response.body.series.users).toHaveLength(7);
    expect(response.body.series.payments).toHaveLength(7);
    expect(response.body.series.usage).toHaveLength(7);
    expect(response.body.series.requests).toHaveLength(7);
    expect(response.body.series.users[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        new: expect.any(Number),
        total: expect.any(Number),
      }),
    );
    expect(response.body.series.requests[0]).toMatchObject({
      date: expect.any(String),
      total: expect.any(Number),
      byType: expect.any(Object),
    });
  });

  it('GET /admin/stats/series requires admin key', async () => {
    const response = await request(createApp()).get('/admin/stats/series');
    expect(response.status).toBe(401);
  });

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
      take: 100,
    });
    expect(response.body.users[0]).toMatchObject({
      id: 'user-1',
      telegramId: '1001',
      username: 'alice',
      subscriptionStatus: 'none',
      hasActiveSubscription: false,
    });
  });

  it('GET /admin/users includes guest devices without login', async () => {
    const response = await request(createApp())
      .get('/admin/users')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    const guest = response.body.users.find(
      (row: { id: string }) => row.id === 'device-row-guest',
    );
    expect(guest).toMatchObject({
      id: 'device-row-guest',
      isGuest: true,
      deviceId: 'guest-client-device',
      firstName: 'Гость',
      hasActiveSubscription: false,
      usageCounts: {
        analyze_photo: 1,
        analyze_text: 1,
        analyze_photo_text: 0,
        refine: 0,
        manual: 0,
        barcode: 0,
        analyze: 0,
      },
    });
  });

  it('GET /admin/users/:id returns guest device detail', async () => {
    const response = await request(createApp())
      .get('/admin/users/device-row-guest')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: 'device-row-guest',
      isGuest: true,
      deviceId: 'guest-client-device',
      firstName: 'Гость',
    });
    expect(response.body.usageCounts).toMatchObject({
      analyze_photo: 1,
      analyze_text: 1,
    });
    expect(response.body.payments).toEqual([]);
    expect(response.body.recentEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'usage-guest-2',
          kind: 'analyze_text',
          deviceId: 'guest-client-device',
        }),
      ]),
    );
  });

  it('GET /admin/users includes usageCounts and consent', async () => {
    const response = await request(createApp())
      .get('/admin/users')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    const user = response.body.users.find(
      (row: { id: string }) => row.id === 'user-1',
    );
    expect(user).toMatchObject({
      id: 'user-1',
      photoUrl: 'https://example.com/alice.jpg',
      dataConsentAt: '2026-08-01T09:00:00.000Z',
      dataConsentVersion: 'v1',
      createdAt: '2026-07-01T10:00:00.000Z',
      isGuest: false,
      usageCounts: {
        analyze_photo: 2,
        analyze_text: 0,
        analyze_photo_text: 0,
        refine: 1,
        manual: 0,
        barcode: 0,
        analyze: 0,
      },
    });
  });

  it('GET /admin/users filters usageCounts by from/to date range', async () => {
    const response = await request(createApp())
      .get('/admin/users?from=2026-08-05&to=2026-08-05')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    const user = response.body.users.find(
      (row: { id: string }) => row.id === 'user-1',
    );
    expect(user).toMatchObject({
      id: 'user-1',
      usageCounts: {
        analyze_photo: 1,
        refine: 1,
        analyze_text: 0,
        analyze_photo_text: 0,
        manual: 0,
        barcode: 0,
        analyze: 0,
      },
    });
    const guest = response.body.users.find(
      (row: { id: string }) => row.id === 'device-row-guest',
    );
    expect(guest).toMatchObject({
      usageCounts: {
        analyze_photo: 0,
        analyze_text: 0,
      },
    });
  });

  it('GET /admin/users rejects invalid from/to range', async () => {
    const response = await request(createApp())
      .get('/admin/users?from=2026-08-10&to=2026-08-01')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('GET /admin/users/:id returns payments and recentEvents', async () => {
    const response = await request(createApp())
      .get('/admin/users/user-1')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: 'user-1',
      dataConsentVersion: 'v1',
    });
    expect(response.body.usageCounts).toMatchObject({
      analyze_photo: 2,
      refine: 1,
    });
    expect(response.body.payments).toHaveLength(1);
    expect(response.body.payments[0].id).toBe('pay-pending');
    expect(response.body.recentEvents[0]).toEqual({
      id: 'usage-3',
      kind: 'refine',
      deviceId: 'client-device-1',
      createdAt: '2026-08-05T13:00:00.000Z',
    });
    expect(prisma.usageEvent.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { device: { select: { deviceId: true } } },
    });
  });

  it('GET /admin/users/:id returns 404', async () => {
    const response = await request(createApp())
      .get('/admin/users/missing')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.message).toBe('User not found.');
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
      usageCount: 0,
    });
    expect(response.body.id).toBeTruthy();
    expect(response.body.createdAt).toBeTruthy();
  });

  it('GET /admin/promos includes confirmed usage counts', async () => {
    await request(createApp())
      .post('/admin/promos')
      .set('X-Admin-Key', 'test-admin')
      .send({ code: 'summer80', discountPercent: 80 });

    payments.push(
      {
        id: 'pay-promo-1',
        userId: 'user-1',
        amount: 20_000,
        status: 'confirmed',
        promoCode: 'summer80',
        tbankPaymentId: 'tb-promo-1',
        tbankOrderId: 'pay-promo-1',
        paidAt: new Date('2026-08-03T12:00:00.000Z'),
        referralGrantedAt: null,
        createdAt: new Date('2026-08-03T11:00:00.000Z'),
      },
      {
        id: 'pay-promo-2',
        userId: 'user-2',
        amount: 20_000,
        status: 'confirmed',
        promoCode: 'summer80',
        tbankPaymentId: 'tb-promo-2',
        tbankOrderId: 'pay-promo-2',
        paidAt: new Date('2026-08-04T12:00:00.000Z'),
        referralGrantedAt: null,
        createdAt: new Date('2026-08-04T11:00:00.000Z'),
      },
      {
        id: 'pay-promo-pending',
        userId: 'user-1',
        amount: 20_000,
        status: 'pending',
        promoCode: 'summer80',
        tbankPaymentId: null,
        tbankOrderId: 'pay-promo-pending',
        paidAt: null,
        referralGrantedAt: null,
        createdAt: new Date('2026-08-05T11:00:00.000Z'),
      },
    );

    const response = await request(createApp())
      .get('/admin/promos')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        code: 'summer80',
        discountPercent: 80,
        usageCount: 2,
      }),
    ]);
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
});

describe('GET /admin/openrouter', () => {
  const snapshot = {
    fetchedAt: '2026-08-29T12:00:00.000Z',
    fx: { usdRub: 90, asOf: '2026-08-29', source: 'frankfurter-cbr' as const },
    credits: { totalCredits: 100, totalUsage: 20, available: 80 },
    key: null,
    spend: {
      last7DaysUsd: 5,
      last30DaysUsd: 15,
      last7DaysRub: 450,
      last30DaysRub: 1350,
      requests30d: 100,
      promptTokens30d: 1000,
      completionTokens30d: 500,
      reasoningTokens30d: 0,
    },
    avgCostPerGeneration: { usd: 0.15, rub: 13.5, generations30d: 100 },
    runway: {
      avgDailySpendUsd: 0.5,
      daysLeft: 160,
      monthsLeft: 5.3,
      basedOn: '30d' as const,
    },
    seriesDaily: [],
    byModel: [],
  };

  let prisma: ReturnType<typeof createMockPrismaForOpenrouter>;

  function createMockPrismaForOpenrouter() {
    return {
      usageEvent: {
        count: vi.fn(async () => 42),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = 'test-admin';
    prisma = createMockPrismaForOpenrouter();
    mockGetPrisma.mockReturnValue(prisma);
    mockIsDatabaseConfigured.mockReturnValue(true);
    mockCollectOpenRouter.mockImplementation(
      async (options: {
        countBillableGenerations30d: (now: Date) => Promise<number>;
      }) => {
        await options.countBillableGenerations30d(new Date('2026-08-29T12:00:00.000Z'));
        return snapshot;
      },
    );
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it('rejects requests without admin key', async () => {
    const response = await request(createApp()).get('/admin/openrouter');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('returns cost analytics snapshot', async () => {
    const response = await request(createApp())
      .get('/admin/openrouter')
      .set('X-Admin-Key', 'test-admin');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      credits: snapshot.credits,
      spend: snapshot.spend,
      runway: snapshot.runway,
      avgCostPerGeneration: snapshot.avgCostPerGeneration,
    });
    expect(mockCollectOpenRouter).toHaveBeenCalledOnce();
  });

  it('counts billable generations over completed UTC 30-day window', async () => {
    await request(createApp())
      .get('/admin/openrouter')
      .set('X-Admin-Key', 'test-admin');

    const call = prisma.usageEvent.count.mock.calls[0]?.[0];
    expect(call?.where?.kind).toEqual({
      in: [
        'analyze',
        'analyze_photo',
        'analyze_text',
        'analyze_photo_text',
        'refine',
      ],
    });
    const createdAt = call?.where?.createdAt as { gte: Date; lt: Date };
    expect(createdAt.gte).toBeInstanceOf(Date);
    expect(createdAt.lt).toBeInstanceOf(Date);
    expect(createdAt.lt.getTime() - createdAt.gte.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
    expect(createdAt.lt.getUTCHours()).toBe(0);
    expect(createdAt.gte.getUTCHours()).toBe(0);
  });
});
