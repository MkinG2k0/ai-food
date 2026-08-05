import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  ensureDevice: vi.fn(),
  signUserToken: vi.fn(),
  assertAuthConfigured: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: vi.fn(),
  assertAuthConfigured: mocks.assertAuthConfigured,
  signUserToken: mocks.signUserToken,
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: mocks.ensureDevice,
}));
// telegram mocks required because auth.ts imports them
vi.mock('../lib/telegramLoginChallenge.js', () => ({
  createLoginChallenge: vi.fn(),
  getLoginChallengeById: vi.fn(),
  consumeLoginChallenge: vi.fn(),
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  buildBotDeepLink: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramBotUsername: vi.fn(),
}));

const { authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

const demoUser = {
  id: 'user-demo',
  telegramId: '100000001',
  username: 'demo_user',
  firstName: 'Демо',
  lastName: 'пользователь',
  photoUrl: null,
  subscriptionStatus: 'none',
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
};

describe('POST /auth/demo/login', () => {
  const prev = process.env.AUTH_MOCK;

  beforeEach(() => {
    delete process.env.AUTH_MOCK;
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: { upsert: mocks.upsert, findUnique: mocks.findUnique },
    });
    mocks.upsert.mockResolvedValue(demoUser);
    mocks.signUserToken.mockResolvedValue('jwt-demo');
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_MOCK;
    else process.env.AUTH_MOCK = prev;
    vi.clearAllMocks();
  });

  it('returns 403 when AUTH_MOCK is false', async () => {
    process.env.AUTH_MOCK = 'false';
    const response = await request(createApp()).post('/auth/demo/login').send({});
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('DEMO_LOGIN_DISABLED');
  });

  it('upserts demo user and returns token + user', async () => {
    const response = await request(createApp())
      .post('/auth/demo/login')
      .send({ deviceId: 'dev-1' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe('jwt-demo');
    expect(response.body.user).toMatchObject({
      id: 'user-demo',
      telegramId: '100000001',
      username: 'demo_user',
      firstName: 'Демо',
      lastName: 'пользователь',
      dataConsentAt: null,
      dataConsentVersion: null,
    });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { telegramId: '100000001' },
      create: {
        telegramId: '100000001',
        username: 'demo_user',
        firstName: 'Демо',
        lastName: 'пользователь',
        photoUrl: null,
      },
      update: {
        username: 'demo_user',
        firstName: 'Демо',
        lastName: 'пользователь',
        photoUrl: null,
      },
    });
    expect(mocks.ensureDevice).toHaveBeenCalled();
    expect(mocks.signUserToken).toHaveBeenCalledWith({
      sub: 'user-demo',
      telegramId: '100000001',
    });
  });

  it('skips ensureDevice when deviceId omitted', async () => {
    await request(createApp()).post('/auth/demo/login').send({});
    expect(mocks.ensureDevice).not.toHaveBeenCalled();
  });
});
