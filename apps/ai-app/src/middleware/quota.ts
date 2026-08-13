import type { RequestHandler } from 'express';
import { ApiError } from '../../lib/errors.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { verifyUserToken } from '../lib/jwt.js';
import { hasActiveSubscription } from '../lib/subscription.js';
import {
  assertGuestQuotaOrThrow,
  ensureDevice,
  isBillableUsageKind,
  parseUsageKind,
  recordBillableUsage,
  shouldEnforceQuota,
} from '../lib/quota.js';

export type QuotaRequestState = {
  usageKind: ReturnType<typeof parseUsageKind>;
  userId?: string;
  deviceRowId?: string;
  shouldRecord: boolean;
};

declare global {
  namespace Express {
    interface Request {
      quota?: QuotaRequestState;
    }
  }
}

/**
 * Enforce guest free quota for analyze/refine.
 * Unlimited only when the JWT user has an active subscription.
 * After the route succeeds, call `finalizeQuotaUsage(req)`.
 */
export const enforceChatQuota: RequestHandler = async (req, _res, next) => {
  try {
    const kind = parseUsageKind(req.header('x-usage-kind') ?? undefined);
    req.quota = { usageKind: kind, shouldRecord: false };

    if (kind === 'other') {
      next();
      return;
    }

    if (!shouldEnforceQuota()) {
      next();
      return;
    }

    if (!isDatabaseConfigured()) {
      throw new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'Quota enforcement requires DATABASE_URL.',
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

    const userToken = req.header('x-user-token')?.trim();
    let userId: string | undefined;

    if (userToken) {
      const payload = await verifyUserToken(userToken);
      userId = payload.sub;
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user && hasActiveSubscription(user)) {
        const deviceHeader = req.header('x-device-id')?.trim();
        let deviceRowId: string | undefined;
        if (deviceHeader) {
          const device = await ensureDevice(prisma, deviceHeader, payload.sub);
          deviceRowId = device.id;
        }
        req.quota = {
          usageKind: kind,
          userId: payload.sub,
          deviceRowId,
          shouldRecord: Boolean(deviceRowId),
        };
        next();
        return;
      }
      // Auth without active license → profile quota (shared across devices)
    }

    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }

    const { deviceRowId } = await assertGuestQuotaOrThrow(prisma, deviceId, {
      authenticated: Boolean(userId),
      userId,
    });
    req.quota = {
      usageKind: kind,
      userId,
      deviceRowId,
      shouldRecord: true,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/** Record usage after a successful OpenRouter handoff. */
export async function finalizeQuotaUsage(req: {
  quota?: QuotaRequestState;
}): Promise<void> {
  const q = req.quota;
  if (!q?.shouldRecord || !q.deviceRowId) return;
  if (!isBillableUsageKind(q.usageKind)) return;
  const prisma = getPrisma();
  if (!prisma) return;
  await recordBillableUsage(prisma, {
    deviceRowId: q.deviceRowId,
    kind: q.usageKind,
    userId: q.userId ?? null,
  });
}
