import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  deleteUser: vi.fn(),
  deleteManyPayments: vi.fn(),
  updateManyUsage: vi.fn(),
  updateManyDevices: vi.fn(),
  transaction: vi.fn(),
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
  id: 'user-del',
  telegramId: '42',
  username: 'del_user',
  firstName: 'Del',
  lastName: null,
  photoUrl: null,
  subscriptionStatus: 'none' as const,
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
  nutritionProfile: null,
};

describe('DELETE /auth/me', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    const tx = {
      payment: { deleteMany: mocks.deleteManyPayments },
      usageEvent: { updateMany: mocks.updateManyUsage },
      device: { updateMany: mocks.updateManyDevices },
      user: { delete: mocks.deleteUser },
    };
    mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<void>) =>
      fn(tx),
    );
    mocks.getPrisma.mockReturnValue({
      user: { findUnique: mocks.findUnique },
      $transaction: mocks.transaction,
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: baseUser.id,
      telegramId: baseUser.telegramId,
    });
    mocks.findUnique.mockResolvedValue(baseUser);
    mocks.deleteManyPayments.mockResolvedValue({ count: 0 });
    mocks.updateManyUsage.mockResolvedValue({ count: 0 });
    mocks.updateManyDevices.mockResolvedValue({ count: 0 });
    mocks.deleteUser.mockResolvedValue(baseUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('401 without token', async () => {
    const res = await request(createApp()).delete('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_USER_TOKEN');
  });

  it('401 when user missing', async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await request(createApp())
      .delete('/auth/me')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('204 and wipes related rows then user', async () => {
    const res = await request(createApp())
      .delete('/auth/me')
      .set('X-User-Token', 'jwt');

    expect(res.status).toBe(204);
    expect(mocks.assertAuthConfigured).toHaveBeenCalled();
    expect(mocks.deleteManyPayments).toHaveBeenCalledWith({
      where: { userId: baseUser.id },
    });
    expect(mocks.updateManyUsage).toHaveBeenCalledWith({
      where: { userId: baseUser.id },
      data: { userId: null },
    });
    expect(mocks.updateManyDevices).toHaveBeenCalledWith({
      where: { userId: baseUser.id },
      data: { userId: null },
    });
    expect(mocks.deleteUser).toHaveBeenCalledWith({
      where: { id: baseUser.id },
    });
  });
});
