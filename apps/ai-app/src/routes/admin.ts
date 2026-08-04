import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
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

function pricingResponse(snapshot: Awaited<ReturnType<typeof getPricingSnapshot>>) {
  return {
    priceKopecks: snapshot.priceKopecks,
    durationDays: snapshot.durationDays,
    source:
      snapshot.priceSource === 'db' || snapshot.durationSource === 'db'
        ? ('db' as const)
        : ('env' as const),
  };
}

function userResponse(user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    ...subscriptionPublicFields(user),
  };
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export const adminRouter = Router();

adminRouter.use(requireAdminKey);

adminRouter.get(
  '/pricing',
  asyncHandler(async (_req, res) => {
    const snapshot = await getPricingSnapshot(getPrisma());
    res.json(pricingResponse(snapshot));
  }),
);

adminRouter.put(
  '/pricing',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const priceKopecks = req.body?.priceKopecks;
    const durationDays = req.body?.durationDays;

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
    if (priceKopecks === undefined && durationDays === undefined) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Provide priceKopecks and/or durationDays.',
      );
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        subscriptionPriceKopecks:
          priceKopecks === undefined ? null : Math.floor(priceKopecks),
        subscriptionDurationDays: durationDays ?? null,
      },
      update: {
        ...(priceKopecks === undefined
          ? {}
          : { subscriptionPriceKopecks: Math.floor(priceKopecks) }),
        ...(durationDays === undefined ? {} : { subscriptionDurationDays: durationDays }),
      },
    });

    const snapshot = await getPricingSnapshot(prisma);
    res.json(pricingResponse(snapshot));
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
        where: { kind: 'analyze', createdAt: { gte: last7Days } },
      }),
      prisma.usageEvent.count({
        where: { kind: 'refine', createdAt: { gte: last7Days } },
      }),
      prisma.usageEvent.count({
        where: { kind: 'analyze', createdAt: { gte: last30Days } },
      }),
      prisma.usageEvent.count({
        where: { kind: 'refine', createdAt: { gte: last30Days } },
      }),
    ]);

    res.json({
      usersTotal,
      activeSubscriptions,
      paymentsConfirmedCount: confirmedPayments._count,
      paymentsConfirmedSumKopecks: confirmedPayments._sum.amount ?? 0,
      usageAnalyzeLast7Days,
      usageRefineLast7Days,
      usageAnalyzeLast30Days,
      usageRefineLast30Days,
    });
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

    res.json({ users: users.map(userResponse) });
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
          !Number.isFinite(requestedDays) ||
          requestedDays <= 0)
      ) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'days must be a positive number.',
        );
      }
      const days =
        requestedDays === undefined
          ? await getSubscriptionDurationDays(prisma)
          : Math.floor(requestedDays);
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
