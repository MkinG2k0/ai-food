import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import {
  confirmLoginChallenge,
  getLoginChallengeById,
  getLoginChallengeByNonce,
} from '../lib/telegramLoginChallenge.js';
import { answerCallbackQuery, sendMessage } from '../lib/telegramBotApi.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { signUserToken } from '../lib/jwt.js';
import { ensureDevice } from '../lib/quota.js';
import { ensureUserReferralCode } from '../lib/referralCode.js';

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: TelegramUser;
  };
  callback_query?: {
    id: string;
    data?: string;
    from: TelegramUser;
    message?: { chat: { id: number } };
  };
};

function hasValidSecret(header: string | undefined): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return Boolean(expected) && header === expected;
}

async function handleMessage(message: NonNullable<TelegramUpdate['message']>) {
  if (!message.text) return;

  const text = message.text.trim();
  const startMatch = /^\/start(?:@\w+)?(?:\s+(.+))?$/.exec(text);
  if (!startMatch) {
    await sendMessage(message.chat.id, 'Этот бот только для входа в AI Food.');
    return;
  }

  const nonce = startMatch[1]?.trim();
  if (!nonce) {
    await sendMessage(message.chat.id, 'Этот бот только для входа в AI Food.');
    return;
  }

  const challenge = getLoginChallengeByNonce(nonce);
  if (!challenge || challenge.status !== 'pending') {
    await sendMessage(message.chat.id, 'Ссылка устарела. Начните вход на сайте.');
    return;
  }

  await sendMessage(message.chat.id, 'Подтвердите вход в AI Food:', {
    inline_keyboard: [
      [
        {
          text: 'Подтвердить вход в AI Food',
          callback_data: `ok:${challenge.id}`,
        },
      ],
    ],
  });
}

async function handleCallbackQuery(
  callback: NonNullable<TelegramUpdate['callback_query']>,
) {
  if (!callback.data?.startsWith('ok:')) return;

  const challenge = getLoginChallengeById(callback.data.slice(3));
  const chatId = callback.message?.chat.id;
  if (!challenge || challenge.status !== 'pending' || chatId === undefined) {
    await answerCallbackQuery(callback.id, 'Ссылка устарела');
    return;
  }

  const prisma = isDatabaseConfigured() ? getPrisma() : null;
  if (!prisma) {
    await answerCallbackQuery(callback.id, 'Ошибка сервера');
    return;
  }

  const telegramId = String(callback.from.id);
  const profile = {
    username: callback.from.username ?? null,
    firstName: callback.from.first_name ?? null,
    lastName: callback.from.last_name ?? null,
  };
  const user = await prisma.user.upsert({
    where: { telegramId },
    create: { telegramId, ...profile },
    update: profile,
  });
  await ensureUserReferralCode(prisma, user);

  if (challenge.deviceId) {
    await ensureDevice(prisma, challenge.deviceId, user.id);
  }

  const token = await signUserToken({
    sub: user.id,
    telegramId: user.telegramId,
  });
  confirmLoginChallenge(challenge.nonce, {
    userId: user.id,
    token,
  });

  await answerCallbackQuery(callback.id, 'Готово');
  await sendMessage(chatId, 'Готово, вернитесь в приложение.');
}

export const telegramWebhookRouter = Router();

telegramWebhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!hasValidSecret(req.header('x-telegram-bot-api-secret-token'))) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    try {
      const update = req.body as TelegramUpdate;
      if (update.message) await handleMessage(update.message);
      if (update.callback_query) await handleCallbackQuery(update.callback_query);
    } catch (error) {
      console.error('Telegram webhook handler failed:', error);
    }

    res.json({ ok: true });
  }),
);
