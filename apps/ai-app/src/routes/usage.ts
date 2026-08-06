import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { verifyUserToken } from '../lib/jwt.js';
import {
  ensureDevice,
  getQuotaLimits,
  getUsageSnapshot,
} from '../lib/quota.js';
import { hasActiveSubscription } from '../lib/subscription.js';

export const usageRouter = Router();

const EventBodySchema = z.object({
  kind: z.enum(['manual', 'barcode']),
});

usageRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }

    if (!isDatabaseConfigured()) {
      const quota = await getQuotaLimits();
      res.json({
        used: 0,
        limit: quota.freeGenerationLimit,
        remaining: quota.freeGenerationLimit,
        authenticated: false,
        hasActiveSubscription: false,
        freeGenerationLimit: quota.freeGenerationLimit,
        authLoginGenerationBonus: quota.authLoginGenerationBonus,
        degraded: true,
      });
      return;
    }

    const prisma = getPrisma();
    if (!prisma) {
      throw new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'Database client is not available.',
      );
    }

    let authenticated = false;
    let activeSub = false;
    const userToken = req.header('x-user-token')?.trim();
    if (userToken) {
      try {
        const payload = await verifyUserToken(userToken);
        authenticated = true;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (user) {
          activeSub = hasActiveSubscription(user);
          // Lazy-expire: active flag but past expiry → flip status
          if (
            user.subscriptionStatus === 'active' &&
            user.subscriptionExpiresAt &&
            user.subscriptionExpiresAt.getTime() <= Date.now()
          ) {
            await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: 'none' },
            });
            activeSub = false;
          }
        }
      } catch {
        authenticated = false;
        activeSub = false;
      }
    }

    const snapshot = await getUsageSnapshot(prisma, deviceId, {
      authenticated,
      hasActiveSubscription: activeSub,
    });
    res.json(snapshot);
  }),
);

usageRouter.post(
  '/event',
  asyncHandler(async (req, res) => {
    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }

    if (!isDatabaseConfigured()) {
      throw new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'Database is not configured.',
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

    const parsed = EventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'kind must be manual or barcode.');
    }

    let userId: string | undefined;
    const userToken = req.header('x-user-token')?.trim();
    if (userToken) {
      try {
        const payload = await verifyUserToken(userToken);
        userId = payload.sub;
      } catch {
        /* ignore invalid token for event logging */
      }
    }

    const device = await ensureDevice(prisma, deviceId, userId);
    await prisma.usageEvent.create({
      data: {
        kind: parsed.data.kind,
        deviceId: device.id,
        userId: userId ?? null,
      },
    });
    res.json({ ok: true });
  }),
);
