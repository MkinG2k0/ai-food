import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
  verifyUserToken: vi.fn(),
  getQuotaLimits: vi.fn(),
  getUsageSnapshot: vi.fn(),
  hasActiveSubscription: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: vi.fn(),
  getQuotaLimits: mocks.getQuotaLimits,
  getUsageSnapshot: mocks.getUsageSnapshot,
}));
vi.mock('../lib/subscription.js', () => ({
  hasActiveSubscription: mocks.hasActiveSubscription,
}));

const { usageRouter } = await import('./usage.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/usage', usageRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /usage', () => {
  beforeEach(() => {
    mocks.getQuotaLimits.mockResolvedValue({
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
      freeSource: 'default',
      bonusSource: 'default',
    });
    mocks.getUsageSnapshot.mockResolvedValue({
      used: 3,
      limit: 50,
      remaining: 47,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });
    mocks.getPrisma.mockReturnValue({
      user: {
        findUnique: mocks.userFindUnique,
        update: mocks.userUpdate,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when X-Device-Id is missing', async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    const res = await request(createApp()).get('/usage');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DEVICE_ID_REQUIRED');
    expect(mocks.getUsageSnapshot).not.toHaveBeenCalled();
  });

  it('returns degraded snapshot when DB is not configured', async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const res = await request(createApp())
      .get('/usage')
      .set('X-Device-Id', 'dev-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      used: 0,
      limit: 50,
      remaining: 50,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
      degraded: true,
    });
    expect(mocks.getUsageSnapshot).not.toHaveBeenCalled();
  });

  it('returns snapshot for valid JWT with active subscription', async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.verifyUserToken.mockResolvedValue({ sub: 'user-1' });
    mocks.userFindUnique.mockResolvedValue({
      id: 'user-1',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
    });
    mocks.hasActiveSubscription.mockReturnValue(true);
    mocks.getUsageSnapshot.mockResolvedValue({
      used: 0,
      limit: 150,
      remaining: null,
      authenticated: true,
      hasActiveSubscription: true,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });

    const res = await request(createApp())
      .get('/usage')
      .set('X-Device-Id', 'dev-1')
      .set('X-User-Token', 'good.jwt');

    expect(res.status).toBe(200);
    expect(res.body.hasActiveSubscription).toBe(true);
    expect(res.body.authenticated).toBe(true);
    expect(mocks.getUsageSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      {
        authenticated: true,
        hasActiveSubscription: true,
        userId: 'user-1',
      },
    );
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it('lazy-expires active status past expiry and passes hasActiveSubscription false', async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.verifyUserToken.mockResolvedValue({ sub: 'user-exp' });
    const expiredAt = new Date(Date.now() - 60_000);
    mocks.userFindUnique.mockResolvedValue({
      id: 'user-exp',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiredAt,
    });
    mocks.hasActiveSubscription.mockReturnValue(false);
    mocks.userUpdate.mockResolvedValue({});
    mocks.getUsageSnapshot.mockResolvedValue({
      used: 10,
      limit: 150,
      remaining: 140,
      authenticated: true,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });

    const res = await request(createApp())
      .get('/usage')
      .set('X-Device-Id', 'dev-1')
      .set('X-User-Token', 'good.jwt');

    expect(res.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-exp' },
      data: { subscriptionStatus: 'none' },
    });
    expect(mocks.getUsageSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      {
        authenticated: true,
        hasActiveSubscription: false,
        userId: 'user-exp',
      },
    );
  });

  it('treats bad JWT as guest snapshot', async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.verifyUserToken.mockRejectedValue(new Error('invalid'));
    mocks.getUsageSnapshot.mockResolvedValue({
      used: 2,
      limit: 50,
      remaining: 48,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });

    const res = await request(createApp())
      .get('/usage')
      .set('X-Device-Id', 'dev-1')
      .set('X-User-Token', 'bad.jwt');

    expect(res.status).toBe(200);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.getUsageSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      {
        authenticated: false,
        hasActiveSubscription: false,
        userId: undefined,
      },
    );
  });
});
