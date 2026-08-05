import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  createLoginChallenge: vi.fn(),
  getLoginChallengeById: vi.fn(),
  consumeLoginChallenge: vi.fn(),
  buildBotDeepLink: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramBotUsername: vi.fn(),
  findUnique: vi.fn(),
  verifyUserToken: vi.fn(),
  assertAuthConfigured: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock('../lib/telegramLoginChallenge.js', () => ({
  createLoginChallenge: mocks.createLoginChallenge,
  getLoginChallengeById: mocks.getLoginChallengeById,
  consumeLoginChallenge: mocks.consumeLoginChallenge,
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  buildBotDeepLink: mocks.buildBotDeepLink,
  getTelegramBotToken: mocks.getTelegramBotToken,
  getTelegramBotUsername: mocks.getTelegramBotUsername,
}));
vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
  assertAuthConfigured: mocks.assertAuthConfigured,
  signUserToken: vi.fn(),
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: vi.fn(),
}));

const { authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

const challengeId = '78d7cad3-5b19-411d-884e-6d8083368721';
const user = {
  id: 'user-1',
  telegramId: '42',
  username: 'ada',
  firstName: 'Ada',
  lastName: null,
  photoUrl: null,
  subscriptionStatus: 'none',
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
};

describe('Telegram bot auth routes', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: { findUnique: mocks.findUnique },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts a login challenge with a bot deep link', async () => {
    mocks.getTelegramBotToken.mockReturnValue('1:tok');
    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
    mocks.createLoginChallenge.mockReturnValue({
      id: challengeId,
      nonce: 'nonce1',
      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
    });
    mocks.buildBotDeepLink.mockReturnValue('https://t.me/MyBot?start=nonce1');

    const response = await request(createApp())
      .post('/auth/telegram/start')
      .send({ deviceId: 'dev-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      challengeId,
      botDeepLink: 'https://t.me/MyBot?start=nonce1',
      expiresAt: '2026-08-04T16:00:00.000Z',
    });
    expect(response.body).not.toHaveProperty('nonce');
    expect(mocks.createLoginChallenge).toHaveBeenCalledWith({ deviceId: 'dev-1' });
    expect(mocks.buildBotDeepLink).toHaveBeenCalledWith('nonce1');
  });

  it('returns 503 when the Telegram bot is misconfigured', async () => {
    mocks.getTelegramBotToken.mockReturnValue(null);
    mocks.getTelegramBotUsername.mockReturnValue('MyBot');

    const response = await request(createApp()).post('/auth/telegram/start').send({});

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('TELEGRAM_MISCONFIGURED');
    expect(mocks.createLoginChallenge).not.toHaveBeenCalled();
  });

  it('returns 503 without creating a challenge when the database is unavailable', async () => {
    mocks.getTelegramBotToken.mockReturnValue('1:tok');
    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
    mocks.isDatabaseConfigured.mockReturnValue(false);

    const response = await request(createApp()).post('/auth/telegram/start').send({});

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('DATABASE_UNAVAILABLE');
    expect(mocks.createLoginChallenge).not.toHaveBeenCalled();
  });

  it('returns pending for an unconfirmed challenge', async () => {
    mocks.getLoginChallengeById.mockReturnValue({
      id: challengeId,
      status: 'pending',
      nonce: 'nonce1',
      expiresAt: Date.now() + 60_000,
    });

    const response = await request(createApp()).get(
      `/auth/telegram/status?challengeId=${challengeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'pending' });
    expect(mocks.consumeLoginChallenge).not.toHaveBeenCalled();
  });

  it('returns ok once for a confirmed challenge, then expired', async () => {
    mocks.getLoginChallengeById
      .mockReturnValueOnce({
        id: challengeId,
        status: 'confirmed',
        nonce: 'nonce1',
        expiresAt: Date.now() + 60_000,
        userId: user.id,
        token: 'jwt-1',
      })
      .mockReturnValueOnce(null);
    mocks.consumeLoginChallenge.mockReturnValueOnce({
      token: 'jwt-1',
      userId: user.id,
    });
    mocks.findUnique.mockResolvedValue(user);

    let response = await request(createApp()).get(
      `/auth/telegram/status?challengeId=${challengeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      token: 'jwt-1',
      user: {
        ...user,
        subscriptionExpiresAt: null,
        hasActiveSubscription: false,
        dataConsentAt: null,
        dataConsentVersion: null,
      },
    });

    response = await request(createApp()).get(
      `/auth/telegram/status?challengeId=${challengeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'expired' });
  });

  it('keeps a confirmed challenge pending when the user query fails', async () => {
    mocks.getLoginChallengeById.mockReturnValue({
      id: challengeId,
      status: 'confirmed',
      nonce: 'nonce1',
      expiresAt: Date.now() + 60_000,
      userId: user.id,
      token: 'jwt-1',
    });
    mocks.findUnique.mockRejectedValue(new Error('database unavailable'));

    const response = await request(createApp()).get(
      `/auth/telegram/status?challengeId=${challengeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'pending' });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
    expect(mocks.consumeLoginChallenge).not.toHaveBeenCalled();
  });

  it('returns expired for an unknown challenge id', async () => {
    mocks.getLoginChallengeById.mockReturnValue(null);

    const response = await request(createApp()).get(
      `/auth/telegram/status?challengeId=${challengeId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'expired' });
  });

  it('returns the Telegram profile and subscription fields from me', async () => {
    mocks.verifyUserToken.mockResolvedValue({ sub: user.id, telegramId: user.telegramId });
    mocks.findUnique.mockResolvedValue(user);

    const response = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...user,
      subscriptionExpiresAt: null,
      hasActiveSubscription: false,
      dataConsentAt: null,
      dataConsentVersion: null,
    });
  });
});
