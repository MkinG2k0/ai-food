import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  getLoginChallengeById: vi.fn(),
  getLoginChallengeByNonce: vi.fn(),
  confirmLoginChallenge: vi.fn(),
  sendMessage: vi.fn(),
  answerCallbackQuery: vi.fn(),
  userUpsert: vi.fn(),
  userUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  promoFindUnique: vi.fn(),
  signUserToken: vi.fn(),
  ensureDevice: vi.fn(),
}));

vi.mock('../lib/telegramLoginChallenge.js', () => ({
  getLoginChallengeById: mocks.getLoginChallengeById,
  getLoginChallengeByNonce: mocks.getLoginChallengeByNonce,
  confirmLoginChallenge: mocks.confirmLoginChallenge,
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  sendMessage: mocks.sendMessage,
  answerCallbackQuery: mocks.answerCallbackQuery,
}));
vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => ({
    user: {
      upsert: mocks.userUpsert,
      update: mocks.userUpdate,
      findUnique: mocks.userFindUnique,
    },
    promoCode: { findUnique: mocks.promoFindUnique },
  }),
}));
vi.mock('../lib/jwt.js', () => ({
  signUserToken: mocks.signUserToken,
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: mocks.ensureDevice,
}));

const { telegramWebhookRouter } = await import('./telegramWebhook.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/telegram/webhook', telegramWebhookRouter);
  app.use(errorHandler);
  return app;
}

const challenge = {
  id: '78d7cad3-5b19-411d-884e-6d8083368721',
  nonce: 'nonce1',
  status: 'pending',
  deviceId: 'dev-1',
  expiresAt: Date.now() + 60_000,
};

describe('Telegram webhook', () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'webhook-secret';
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.promoFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'user-1',
        telegramId: '42',
        ...data,
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it.each([
    ['missing', undefined],
    ['wrong', 'wrong-secret'],
  ])('rejects a %s secret token', async (_label, secret) => {
    const req = request(createApp()).post('/telegram/webhook').send({});
    if (secret) req.set('X-Telegram-Bot-Api-Secret-Token', secret);

    const response = await req;

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthorized' });
  });

  it('offers a confirm button for a pending /start challenge', async () => {
    mocks.getLoginChallengeByNonce.mockReturnValue(challenge);

    const response = await request(createApp())
      .post('/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
      .send({
        message: {
          text: '/start nonce1',
          chat: { id: 100 },
          from: { id: 42 },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(mocks.getLoginChallengeByNonce).toHaveBeenCalledWith('nonce1');
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      100,
      'Подтвердите вход в AI Food:',
      {
        inline_keyboard: [
          [
            {
              text: 'Подтвердить вход в AI Food',
              callback_data: `ok:${challenge.id}`,
            },
          ],
        ],
      },
    );
  });

  it('confirms a pending challenge from an ok callback', async () => {
    mocks.getLoginChallengeById.mockReturnValue(challenge);
    mocks.userUpsert.mockResolvedValue({
      id: 'user-1',
      telegramId: '42',
    });
    mocks.signUserToken.mockResolvedValue('jwt-1');
    mocks.confirmLoginChallenge.mockReturnValue(true);

    const response = await request(createApp())
      .post('/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
      .send({
        callback_query: {
          id: 'callback-1',
          data: `ok:${challenge.id}`,
          from: {
            id: 42,
            username: 'ada',
            first_name: 'Ada',
            last_name: 'Lovelace',
          },
          message: { chat: { id: 100 } },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(mocks.userUpsert).toHaveBeenCalledWith({
      where: { telegramId: '42' },
      create: {
        telegramId: '42',
        username: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
      update: {
        username: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    expect(mocks.ensureDevice).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      'user-1',
    );
    expect(mocks.signUserToken).toHaveBeenCalledWith({
      sub: 'user-1',
      telegramId: '42',
    });
    expect(mocks.confirmLoginChallenge).toHaveBeenCalledWith('nonce1', {
      userId: 'user-1',
      token: 'jwt-1',
    });
    expect(mocks.answerCallbackQuery).toHaveBeenCalledWith('callback-1', 'Готово');
  });

  it('softly rejects an unknown /start challenge without confirming it', async () => {
    mocks.getLoginChallengeByNonce.mockReturnValue(null);

    const response = await request(createApp())
      .post('/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
      .send({
        message: {
          text: '/start unknown',
          chat: { id: 100 },
          from: { id: 42 },
        },
      });

    expect(response.status).toBe(200);
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      100,
      'Ссылка устарела. Начните вход на сайте.',
    );
    expect(mocks.confirmLoginChallenge).not.toHaveBeenCalled();
  });

  it('acknowledges Telegram when a bot handler fails after secret validation', async () => {
    mocks.getLoginChallengeByNonce.mockReturnValue(challenge);
    mocks.sendMessage.mockRejectedValue(new Error('Telegram unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(createApp())
      .post('/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
      .send({
        message: {
          text: '/start nonce1',
          chat: { id: 100 },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
