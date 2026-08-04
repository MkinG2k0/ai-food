import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { signUserToken, verifyUserToken } from '../lib/jwt.js';
import { normalizePhone } from '../lib/phone.js';
import { sendFlashCall } from '../lib/flashcall.js';
import {
  consumeChallengeOnSuccess,
  countActiveForPhone,
  createChallenge,
  getChallenge,
  registerFailedAttempt,
} from '../lib/flashcallChallenge.js';
import { ensureDevice } from '../lib/quota.js';
import { subscriptionPublicFields } from '../lib/subscription.js';

const FlashCallStartBodySchema = z.object({
  phone: z.string().min(1),
  deviceId: z.string().min(1).optional(),
});

const FlashCallVerifyBodySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().length(4),
  deviceId: z.string().min(1).optional(),
});

const MAX_ACTIVE_CHALLENGES_PER_PHONE = 3;

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

export const authRouter = Router();

authRouter.post(
  '/flashcall/start',
  asyncHandler(async (req, res) => {
    const parsed = FlashCallStartBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Flash-Call start payload.');
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid Russian mobile phone number.',
      );
    }

    if (countActiveForPhone(phone) >= MAX_ACTIVE_CHALLENGES_PER_PHONE) {
      throw new ApiError(
        429,
        'FLASHCALL_RATE_LIMITED',
        'Too many active Flash-Call challenges. Try again later.',
      );
    }

    const flashCall = await sendFlashCall(phone);
    const challenge = createChallenge({
      phone,
      code: flashCall.code,
      providerId: flashCall.id,
    });

    res.json({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  }),
);

authRouter.post(
  '/flashcall/verify',
  asyncHandler(async (req, res) => {
    const parsed = FlashCallVerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Flash-Call verification payload.');
    }

    const body = parsed.data;
    const challenge = getChallenge(body.challengeId);
    if (!challenge) {
      throw new ApiError(401, 'INVALID_CHALLENGE', 'Flash-Call challenge is invalid or expired.');
    }

    if (body.code !== challenge.code) {
      registerFailedAttempt(body.challengeId);
      throw new ApiError(401, 'INVALID_CODE', 'Flash-Call code is invalid.');
    }

    consumeChallengeOnSuccess(body.challengeId);

    const prisma = requireDb();
    const user = await prisma.user.upsert({
      where: { phone: challenge.phone },
      create: { phone: challenge.phone },
      update: {},
    });

    if (body.deviceId) {
      await ensureDevice(prisma, body.deviceId, user.id);
    }

    const token = await signUserToken({ sub: user.id, phone: user.phone });
    res.json({
      token,
      user: { id: user.id, phone: user.phone, ...subscriptionPublicFields(user) },
    });
  }),
);

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const header = req.header('x-user-token')?.trim();
    if (!header) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
    }
    const payload = await verifyUserToken(header);
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
    }
    res.json({
      id: user.id,
      phone: user.phone,
      ...subscriptionPublicFields(user),
    });
  }),
);
