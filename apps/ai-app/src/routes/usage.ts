import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { verifyUserToken } from '../lib/jwt.js';
import { getEffectiveLimit, getUsageSnapshot } from '../lib/quota.js';
import { hasActiveSubscription } from '../lib/subscription.js';

export const usageRouter = Router();

usageRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }

    if (!isDatabaseConfigured()) {
      const limit = getEffectiveLimit(false);
      res.json({
        used: 0,
        limit,
        remaining: limit,
        authenticated: false,
        hasActiveSubscription: false,
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
