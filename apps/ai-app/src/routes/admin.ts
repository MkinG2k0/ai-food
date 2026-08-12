import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import {
  buildAdminStatsSeries,
  clampSeriesDays,
} from '../lib/adminStatsSeries.js';
import { countWindow, statsByType } from '../lib/gatewayRequestStats.js';
import { parseGatewayRequestListQuery } from '../lib/parseGatewayRequestListQuery.js';
import { normalizePromoCode } from '../lib/promos.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { getQuotaLimits } from '../lib/quota.js';
import {
  getPricingSnapshot,
  getSubscriptionDurationDays,
  subscriptionPublicFields,
} from '../lib/subscription.js';
import { requireAdminKey } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/error.js';

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'DATABASE_URL is not configured.',
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Database client is not available.',
    );
  }
  return prisma;
}

async function pricingResponse(
  prisma: ReturnType<typeof getPrisma> | ReturnType<typeof requireDb> | null,
  snapshot: Awaited<ReturnType<typeof getPricingSnapshot>>,
) {
  const quota = await getQuotaLimits(prisma);
  const fromDb =
    snapshot.priceSource === 'db' ||
    snapshot.durationSource === 'db' ||
    quota.freeSource === 'db' ||
    quota.bonusSource === 'db';
  return {
    priceKopecks: snapshot.priceKopecks,
    durationDays: snapshot.durationDays,
    freeGenerationLimit: quota.freeGenerationLimit,
    authLoginGenerationBonus: quota.authLoginGenerationBonus,
    source: fromDb
      ? ('db' as const)
      : snapshot.priceSource === 'env' || snapshot.durationSource === 'env'
        ? ('env' as const)
        : ('default' as const),
  };
}

function userResponse(user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl?: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
  dataConsentAt?: Date | null;
  dataConsentVersion?: string | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl ?? null,
    dataConsentAt: user.dataConsentAt?.toISOString() ?? null,
    dataConsentVersion: user.dataConsentVersion ?? null,
    createdAt: user.createdAt?.toISOString() ?? undefined,
    ...subscriptionPublicFields(user),
  };
}

export type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

function emptyUsageCounts(): UsageCounts {
  return {
    analyze_photo: 0,
    analyze_text: 0,
    analyze_photo_text: 0,
    refine: 0,
    manual: 0,
    barcode: 0,
    analyze: 0,
  };
}

async function usageCountsForUserIds(
  prisma: ReturnType<typeof requireDb>,
  userIds: string[],
): Promise<Map<string, UsageCounts>> {
  const map = new Map<string, UsageCounts>();
  for (const id of userIds) map.set(id, emptyUsageCounts());
  if (userIds.length === 0) return map;

  const devices = await prisma.device.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const deviceToUser = new Map(
    devices
      .filter((d): d is { id: string; userId: string } => Boolean(d.userId))
      .map((d) => [d.id, d.userId]),
  );
  const deviceIds = [...deviceToUser.keys()];

  const rows = await prisma.usageEvent.groupBy({
    by: ['userId', 'kind', 'deviceId'],
    where: {
      OR: [
        { userId: { in: userIds } },
        ...(deviceIds.length > 0 ? [{ deviceId: { in: deviceIds } }] : []),
      ],
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    const ownerId =
      (row.userId && map.has(row.userId) ? row.userId : null) ??
      deviceToUser.get(row.deviceId) ??
      null;
    if (!ownerId) continue;
    const counts = map.get(ownerId) ?? emptyUsageCounts();
    if (row.kind in counts) {
      counts[row.kind as keyof UsageCounts] += row._count._all;
    }
    map.set(ownerId, counts);
  }
  return map;
}

function paymentResponse(payment: {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  paidAt: Date | null;
  createdAt: Date;
  tbankPaymentId: string | null;
  tbankOrderId: string;
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return {
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    tbankPaymentId: payment.tbankPaymentId,
    tbankOrderId: payment.tbankOrderId,
    user: {
      id: payment.user.id,
      telegramId: payment.user.telegramId,
      username: payment.user.username,
      firstName: payment.user.firstName,
      lastName: payment.user.lastName,
    },
  };
}

function promoResponse(
  promo: {
    id: string;
    code: string;
    discountPercent: number;
    createdAt: Date;
  },
  usageCount = 0,
) {
  return {
    id: promo.id,
    code: promo.code,
    discountPercent: promo.discountPercent,
    usageCount,
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

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export const adminRouter = Router();

adminRouter.use(requireAdminKey);

adminRouter.get(
  '/pricing',
  asyncHandler(async (_req, res) => {
    const prisma = getPrisma();
    const snapshot = await getPricingSnapshot(prisma);
    res.json(await pricingResponse(prisma, snapshot));
  }),
);

adminRouter.put(
  '/pricing',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const priceKopecks = req.body?.priceKopecks;
    const durationDays = req.body?.durationDays;
    const freeGenerationLimit = req.body?.freeGenerationLimit;
    const authLoginGenerationBonus = req.body?.authLoginGenerationBonus;

    if (
      priceKopecks !== undefined &&
      (typeof priceKopecks !== 'number' ||
        !Number.isFinite(priceKopecks) ||
        priceKopecks < 1)
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'priceKopecks must be a positive number.',
      );
    }
    if (
      durationDays !== undefined &&
      (typeof durationDays !== 'number' ||
        !Number.isInteger(durationDays) ||
        durationDays < 1)
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'durationDays must be a positive integer.',
      );
    }
    if (
      freeGenerationLimit !== undefined &&
      (typeof freeGenerationLimit !== 'number' ||
        !Number.isInteger(freeGenerationLimit) ||
        freeGenerationLimit < 1)
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'freeGenerationLimit must be a positive integer.',
      );
    }
    if (
      authLoginGenerationBonus !== undefined &&
      (typeof authLoginGenerationBonus !== 'number' ||
        !Number.isInteger(authLoginGenerationBonus) ||
        authLoginGenerationBonus < 0)
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'authLoginGenerationBonus must be a non-negative integer.',
      );
    }
    if (
      priceKopecks === undefined &&
      durationDays === undefined &&
      freeGenerationLimit === undefined &&
      authLoginGenerationBonus === undefined
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Provide priceKopecks, durationDays, freeGenerationLimit and/or authLoginGenerationBonus.',
      );
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        subscriptionPriceKopecks:
          priceKopecks === undefined ? null : Math.floor(priceKopecks),
        subscriptionDurationDays: durationDays ?? null,
        freeGenerationLimit:
          freeGenerationLimit === undefined ? null : freeGenerationLimit,
        authLoginGenerationBonus:
          authLoginGenerationBonus === undefined
            ? null
            : authLoginGenerationBonus,
      },
      update: {
        ...(priceKopecks === undefined
          ? {}
          : { subscriptionPriceKopecks: Math.floor(priceKopecks) }),
        ...(durationDays === undefined
          ? {}
          : { subscriptionDurationDays: durationDays }),
        ...(freeGenerationLimit === undefined
          ? {}
          : { freeGenerationLimit }),
        ...(authLoginGenerationBonus === undefined
          ? {}
          : { authLoginGenerationBonus }),
      },
    });

    const snapshot = await getPricingSnapshot(prisma);
    res.json(await pricingResponse(prisma, snapshot));
  }),
);

adminRouter.get(
  '/promos',
  asyncHandler(async (_req, res) => {
    const prisma = requireDb();
    const items = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const codes = items.map((item) => item.code);
    const usageRows =
      codes.length === 0
        ? []
        : await prisma.payment.groupBy({
            by: ['promoCode'],
            where: {
              promoCode: { in: codes },
              status: 'confirmed',
            },
            _count: { _all: true },
          });
    const usageByCode = new Map(
      usageRows
        .filter((row) => row.promoCode != null)
        .map((row) => [row.promoCode as string, row._count._all]),
    );
    res.json({
      items: items.map((item) =>
        promoResponse(item, usageByCode.get(item.code) ?? 0),
      ),
    });
  }),
);

adminRouter.post(
  '/promos',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const code =
      typeof req.body?.code === 'string'
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

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const prisma = requireDb();
    const now = new Date();
    const last7Days = daysAgo(now, 7);
    const last30Days = daysAgo(now, 30);

    const [
      usersTotal,
      activeSubscriptions,
      confirmedPayments,
      usageAnalyzeLast7Days,
      usageRefineLast7Days,
      usageAnalyzeLast30Days,
      usageRefineLast30Days,
      gatewayRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          subscriptionStatus: 'active',
          subscriptionExpiresAt: { gt: now },
        },
      }),
      prisma.payment.aggregate({
        where: { status: 'confirmed' },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.usageEvent.count({
        where: {
          kind: { startsWith: 'analyze' },
          createdAt: { gte: last7Days },
        },
      }),
      prisma.usageEvent.count({
        where: { kind: 'refine', createdAt: { gte: last7Days } },
      }),
      prisma.usageEvent.count({
        where: {
          kind: { startsWith: 'analyze' },
          createdAt: { gte: last30Days },
        },
      }),
      prisma.usageEvent.count({
        where: { kind: 'refine', createdAt: { gte: last30Days } },
      }),
      prisma.gatewayRequest.findMany({
        where: { createdAt: { gte: last30Days } },
        select: {
          type: true,
          ok: true,
          ttfbMs: true,
          durationMs: true,
          createdAt: true,
        },
      }),
    ]);

    const last7 = gatewayRows.filter((r) => r.createdAt >= last7Days);

    res.json({
      usersTotal,
      activeSubscriptions,
      paymentsConfirmedCount: confirmedPayments._count,
      paymentsConfirmedSumKopecks: confirmedPayments._sum.amount ?? 0,
      usageAnalyzeLast7Days,
      usageRefineLast7Days,
      usageAnalyzeLast30Days,
      usageRefineLast30Days,
      requests: {
        last7Days: countWindow(last7),
        last30Days: countWindow(gatewayRows),
        byType: statsByType(gatewayRows),
      },
    });
  }),
);

adminRouter.get(
  '/stats/series',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const days = clampSeriesDays(req.query.days);
    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [userRows, paymentRows, usageRows, gatewayRows] = await Promise.all([
      prisma.user.findMany({ select: { createdAt: true } }),
      prisma.payment.findMany({
        where: { status: 'confirmed' },
        select: { amount: true, paidAt: true, createdAt: true },
      }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { kind: true, createdAt: true },
      }),
      prisma.gatewayRequest.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { type: true, createdAt: true },
      }),
    ]);

    res.json(
      buildAdminStatsSeries({
        days,
        now,
        userCreatedAts: userRows.map((user) => user.createdAt),
        payments: paymentRows.map((payment) => ({
          amount: payment.amount,
          at: payment.paidAt ?? payment.createdAt,
        })),
        usageEvents: usageRows.map((event) => ({
          kind: event.kind,
          at: event.createdAt,
        })),
        gatewayRequests: gatewayRows.map((row) => ({
          type: row.type,
          at: row.createdAt,
        })),
      }),
    );
  }),
);

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

adminRouter.get(
  '/payments',
  asyncHandler(async (_req, res) => {
    const prisma = requireDb();
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    res.json({ payments: payments.map(paymentResponse) });
  }),
);

adminRouter.delete(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });
    if (!payment) {
      throw new ApiError(404, 'NOT_FOUND', 'Payment not found.');
    }

    const revokedSubscription = payment.status === 'confirmed';

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: payment.id } });
      if (revokedSubscription) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'none',
            subscriptionExpiresAt: null,
          },
        });
      }
    });

    res.json({ ok: true, revokedSubscription });
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const users = await prisma.user.findMany({
      ...(query
        ? {
            where: {
              OR: [
                { id: { equals: query } },
                { telegramId: { equals: query } },
                { telegramId: { contains: query } },
                { username: { contains: query, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const countsByUser = await usageCountsForUserIds(
      prisma,
      users.map((user) => user.id),
    );

    res.json({
      users: users.map((user) => ({
        ...userResponse(user),
        usageCounts: countsByUser.get(user.id) ?? emptyUsageCounts(),
      })),
    });
  }),
);

adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    const [countsByUser, payments, recentEvents] = await Promise.all([
      usageCountsForUserIds(prisma, [user.id]),
      prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.usageEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { device: { select: { deviceId: true } } },
      }),
    ]);

    res.json({
      user: userResponse(user),
      usageCounts: countsByUser.get(user.id) ?? emptyUsageCounts(),
      payments: payments.map(paymentResponse),
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        kind: event.kind,
        deviceId: event.device.deviceId,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  }),
);

adminRouter.post(
  '/users/:id/subscription',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    const action = req.body?.action;
    const requestedDays = req.body?.days;
    const now = new Date();
    let data: {
      subscriptionStatus: 'none' | 'active';
      subscriptionExpiresAt: Date | null;
    };

    if (action === 'activate') {
      if (
        requestedDays !== undefined &&
        (typeof requestedDays !== 'number' ||
          !Number.isInteger(requestedDays) ||
          requestedDays < 1)
      ) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'days must be a positive integer.',
        );
      }
      const days =
        requestedDays === undefined
          ? await getSubscriptionDurationDays(prisma)
          : requestedDays;
      const expiresAt = new Date(now);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
      data = {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      };
    } else if (action === 'extend') {
      if (
        typeof requestedDays !== 'number' ||
        !Number.isInteger(requestedDays) ||
        requestedDays < 1
      ) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'days required for extend.',
        );
      }
      const base =
        user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
          ? user.subscriptionExpiresAt
          : now;
      const expiresAt = new Date(base);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + requestedDays);
      data = {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      };
    } else if (action === 'revoke') {
      data = {
        subscriptionStatus: 'none',
        subscriptionExpiresAt: null,
      };
    } else {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'action must be activate, extend, or revoke.',
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    res.json(userResponse(updated));
  }),
);
