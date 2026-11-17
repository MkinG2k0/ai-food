import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { requireApiKey } from '../middleware/auth.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { verifyUserToken } from '../lib/jwt.js';
import { ANALYZE_MEAL_CARD_FAILURE } from '../lib/analyzeFailureAnalytics.js';
import { assertAnalyticsIngestionAllowed } from '../lib/analyticsIngestionLimit.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireApiKey);

const EventBodySchema = z.object({
  name: z.literal(ANALYZE_MEAL_CARD_FAILURE),
  mealId: z.string().min(1).max(128),
  errorCode: z.string().min(1).max(64).nullable().optional(),
  inFlight: z.boolean(),
  clientAt: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const DEDUPE_WINDOW_MS = 5 * 60_000;

analyticsRouter.post(
  '/events',
  asyncHandler(async (req, res) => {
    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }
    assertAnalyticsIngestionAllowed(deviceId);

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
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid analytics event body.',
      );
    }

    let userId: string | undefined;
    const userToken = req.header('x-user-token')?.trim();
    if (userToken) {
      try {
        const payload = await verifyUserToken(userToken);
        userId = payload.sub;
      } catch {
        /* ignore invalid token for analytics */
      }
    }

    const { name, mealId, errorCode, inFlight, clientAt, payload } = parsed.data;
    const recent = await prisma.clientAnalyticsEvent.findFirst({
      where: {
        name,
        mealId,
        deviceId,
        inFlight,
        errorCode: errorCode ?? null,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      res.json({ ok: true, deduped: true });
      return;
    }

    await prisma.clientAnalyticsEvent.create({
      data: {
        name,
        mealId,
        errorCode: errorCode ?? null,
        inFlight,
        deviceId,
        userId: userId ?? null,
        clientAt: clientAt ? new Date(clientAt) : null,
        payload: payload ?? undefined,
      },
    });

    res.json({ ok: true });
  }),
);
