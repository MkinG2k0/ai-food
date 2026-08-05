import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';
import { DATA_CONSENT_VERSION } from '../lib/consent.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  verifyUserToken: vi.fn(),
  assertAuthConfigured: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
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

const baseUser = {
  id: 'user-consent',
  telegramId: '99',
  username: 'consent_user',
  firstName: 'Consent',
  lastName: null,
  photoUrl: null,
  subscriptionStatus: 'none' as const,
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
};

describe('POST /auth/consent', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: { findUnique: mocks.findUnique, update: mocks.update },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: baseUser.id,
      telegramId: baseUser.telegramId,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('401 without token', async () => {
    const res = await request(createApp())
      .post('/auth/consent')
      .send({ version: DATA_CONSENT_VERSION });
    expect(res.status).toBe(401);
  });

  it('400 on wrong version', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);

    const res = await request(createApp())
      .post('/auth/consent')
      .set('x-user-token', 'jwt-1')
      .send({ version: 'wrong-version' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('sets consent and returns fields', async () => {
    const consentAt = new Date('2026-08-06T12:00:00.000Z');
    mocks.findUnique.mockResolvedValue(baseUser);
    mocks.update.mockImplementation(async () => ({
      ...baseUser,
      dataConsentAt: consentAt,
      dataConsentVersion: DATA_CONSENT_VERSION,
    }));

    const res = await request(createApp())
      .post('/auth/consent')
      .set('x-user-token', 'jwt-1')
      .send({ version: DATA_CONSENT_VERSION });

    expect(res.status).toBe(200);
    expect(res.body.dataConsentAt).toBe(consentAt.toISOString());
    expect(res.body.dataConsentVersion).toBe(DATA_CONSENT_VERSION);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: {
        dataConsentAt: expect.any(Date),
        dataConsentVersion: DATA_CONSENT_VERSION,
      },
    });
  });

  it('idempotent second call keeps original consent', async () => {
    const consentAt = new Date('2026-08-06T10:00:00.000Z');
    const consentedUser = {
      ...baseUser,
      dataConsentAt: consentAt,
      dataConsentVersion: DATA_CONSENT_VERSION,
    };
    mocks.findUnique.mockResolvedValue(consentedUser);

    const res = await request(createApp())
      .post('/auth/consent')
      .set('x-user-token', 'jwt-1')
      .send({ version: DATA_CONSENT_VERSION });

    expect(res.status).toBe(200);
    expect(res.body.dataConsentAt).toBe(consentAt.toISOString());
    expect(res.body.dataConsentVersion).toBe(DATA_CONSENT_VERSION);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: { findUnique: mocks.findUnique, update: mocks.update },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: baseUser.id,
      telegramId: baseUser.telegramId,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('includes dataConsentAt null before consent', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);

    const res = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt-1');

    expect(res.status).toBe(200);
    expect(res.body.dataConsentAt).toBeNull();
    expect(res.body.dataConsentVersion).toBeNull();
  });
});
