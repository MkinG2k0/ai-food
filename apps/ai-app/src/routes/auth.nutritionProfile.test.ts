import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

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
vi.mock('../lib/quota.js', () => ({ ensureDevice: vi.fn() }));
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

const nutritionProfile = {
  profile: {
    gender: 'female',
    age: 28,
    height: 165,
    weight: 60,
    targetWeight: 58,
    targetWeightDate: '2026-10-01',
    activity: 'low',
    goal: 'maintain',
    dietType: 'vegetarian',
  },
  targets: { kcal: 1800, protein: 100, fat: 50, carbs: 180, fiber: 25 },
};

const baseUser = {
  id: 'user-1',
  telegramId: '42',
  username: 'u',
  firstName: 'A',
  lastName: null,
  photoUrl: null,
  subscriptionStatus: 'none' as const,
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
  nutritionProfile: null as unknown,
};

describe('PUT /auth/profile', () => {
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

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .put('/auth/profile')
      .send(nutritionProfile);
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);
    const res = await request(createApp())
      .put('/auth/profile')
      .set('x-user-token', 'jwt')
      .send({ profile: { gender: 'x' } });
    expect(res.status).toBe(400);
  });

  it('stores profile and returns it on me', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);
    mocks.update.mockResolvedValue({
      ...baseUser,
      nutritionProfile,
    });

    const put = await request(createApp())
      .put('/auth/profile')
      .set('x-user-token', 'jwt')
      .send(nutritionProfile);
    expect(put.status).toBe(200);
    expect(put.body.nutritionProfile).toEqual(nutritionProfile);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { nutritionProfile },
    });

    mocks.findUnique.mockResolvedValue({
      ...baseUser,
      nutritionProfile,
    });
    const me = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt');
    expect(me.status).toBe(200);
    expect(me.body.nutritionProfile).toEqual(nutritionProfile);
  });

  it('me returns null for corrupt stored JSON', async () => {
    mocks.findUnique.mockResolvedValue({
      ...baseUser,
      nutritionProfile: { broken: true },
    });
    const me = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt');
    expect(me.status).toBe(200);
    expect(me.body.nutritionProfile).toBeNull();
  });
});
