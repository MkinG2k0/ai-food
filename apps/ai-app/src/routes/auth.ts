import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import {
  assertAuthConfigured,
  signUserToken,
  verifyUserToken,
} from '../lib/jwt.js';
import { ensureDevice } from '../lib/quota.js';
import {
  consumeLoginChallenge,
  createLoginChallenge,
  getLoginChallengeById,
} from '../lib/telegramLoginChallenge.js';
import {
  buildBotDeepLink,
  getTelegramBotToken,
  getTelegramBotUsername,
} from '../lib/telegramBotApi.js';
import { subscriptionPublicFields } from '../lib/subscription.js';

const StartBodySchema = z.object({
  deviceId: z.string().min(1).optional(),
});

const DEMO_TELEGRAM_ID = '100000001';
const DEMO_PROFILE = {
  username: 'demo_user',
  firstName: 'Демо',
  lastName: 'пользователь',
  photoUrl: null as string | null,
};

const DemoLoginBodySchema = z.object({
  deviceId: z.string().min(1).optional(),
});

function assertDemoLoginEnabled() {
  if (process.env.AUTH_MOCK === 'false') {
    throw new ApiError(
      403,
      'DEMO_LOGIN_DISABLED',
      'Demo login is disabled (AUTH_MOCK=false).',
    );
  }
}

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

function requireTelegramConfigured() {
  if (!getTelegramBotToken() || !getTelegramBotUsername()) {
    throw new ApiError(
      503,
      'TELEGRAM_MISCONFIGURED',
      'TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME must be configured.',
    );
  }
}

function publicUser(user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  subscriptionStatus: Parameters<typeof subscriptionPublicFields>[0]['subscriptionStatus'];
  subscriptionExpiresAt: Date | null;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    ...subscriptionPublicFields(user),
  };
}

export const authRouter = Router();

authRouter.post(
  '/telegram/start',
  asyncHandler(async (req, res) => {
    requireTelegramConfigured();
    requireDb();
    assertAuthConfigured();
    const parsed = StartBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Telegram start payload.');
    }

    const created = createLoginChallenge({
      deviceId: parsed.data.deviceId,
    });
    const botDeepLink = buildBotDeepLink(created.nonce);

    res.json({
      challengeId: created.id,
      botDeepLink,
      expiresAt: created.expiresAt.toISOString(),
    });
  }),
);

authRouter.get(
  '/telegram/status',
  asyncHandler(async (req, res) => {
    const challengeId =
      typeof req.query.challengeId === 'string' ? req.query.challengeId : '';
    if (!challengeId) {
      res.json({ status: 'expired' });
      return;
    }

    const challenge = getLoginChallengeById(challengeId);
    if (!challenge) {
      res.json({ status: 'expired' });
      return;
    }
    if (challenge.status === 'pending') {
      res.json({ status: 'pending' });
      return;
    }

    let user;
    try {
      const prisma = requireDb();
      user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    } catch {
      res.json({ status: 'pending' });
      return;
    }
    if (!user) {
      res.json({ status: 'pending' });
      return;
    }

    const consumed = consumeLoginChallenge(challengeId);
    if (!consumed) {
      res.json({ status: 'expired' });
      return;
    }

    res.json({
      status: 'ok',
      token: consumed.token,
      user: publicUser(user),
    });
  }),
);

authRouter.post(
  '/demo/login',
  asyncHandler(async (req, res) => {
    assertDemoLoginEnabled();
    const prisma = requireDb();
    assertAuthConfigured();

    const parsed = DemoLoginBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid demo login payload.');
    }

    const user = await prisma.user.upsert({
      where: { telegramId: DEMO_TELEGRAM_ID },
      create: { telegramId: DEMO_TELEGRAM_ID, ...DEMO_PROFILE },
      update: { ...DEMO_PROFILE },
    });

    if (parsed.data.deviceId) {
      await ensureDevice(prisma, parsed.data.deviceId, user.id);
    }

    const token = await signUserToken({
      sub: user.id,
      telegramId: user.telegramId,
    });

    res.json({ token, user: publicUser(user) });
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

    res.json(publicUser(user));
  }),
);
