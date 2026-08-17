import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
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

const { userStreakRouter } = await import('./userStreak.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/streak', userStreakRouter);
  app.use(errorHandler);
  return app;
}

const userId = 'user-1';
const sampleStreak = {
  currentLength: 5,
  freezeCount: 1,
  consumedFreezeDateKeys: ['2026-08-15'],
  grantedMilestones: [7],
  lastCelebratedLocalDate: '2026-08-18',
  bestStreak: 5,
};

describe('POST /user/streak/sync', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: {
        findUnique: mocks.userFindUnique,
        update: mocks.userUpdate,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: userId,
      telegramId: '42',
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .post('/user/streak/sync')
      .send({
        streak: sampleStreak,
        clientUpdatedAt: '2026-08-18T12:00:00.000Z',
      });
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    const res = await request(createApp())
      .post('/user/streak/sync')
      .set('x-user-token', 'jwt')
      .send({ streak: { freezeCount: 9 } });
    expect(res.status).toBe(400);
  });

  it('writes streak and returns same shape', async () => {
    const res = await request(createApp())
      .post('/user/streak/sync')
      .set('x-user-token', 'jwt')
      .send({
        streak: sampleStreak,
        clientUpdatedAt: '2026-08-18T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalled();
    expect(res.body).toEqual({
      streak: sampleStreak,
      clientUpdatedAt: '2026-08-18T12:00:00.000Z',
    });
  });

  it('older sync ignored — returns stored', async () => {
    const stored = {
      ...sampleStreak,
      bestStreak: 12,
    };
    mocks.userFindUnique.mockResolvedValue({
      clientStreak: stored,
      streakClientUpdatedAt: new Date('2026-08-18T15:00:00.000Z'),
    });

    const res = await request(createApp())
      .post('/user/streak/sync')
      .set('x-user-token', 'jwt')
      .send({
        streak: sampleStreak,
        clientUpdatedAt: '2026-08-18T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(res.body.streak.bestStreak).toBe(12);
    expect(res.body.clientUpdatedAt).toBe('2026-08-18T15:00:00.000Z');
  });
});
