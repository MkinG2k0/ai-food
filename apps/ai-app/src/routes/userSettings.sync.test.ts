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

const { userSettingsRouter } = await import('./userSettings.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/settings', userSettingsRouter);
  app.use(errorHandler);
  return app;
}

const userId = 'user-1';
const sampleSettings = {
  customInstructions: 'я веган',
  customInstructionsEnabled: true,
  aiModel: 'google/gemini-3-flash-preview',
  featureVitamins: true,
  featureHealthiness: true,
  featureComposition: false,
  calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
  sharePhotosToFriends: true,
};

describe('POST /user/settings/sync', () => {
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
      .post('/user/settings/sync')
      .send({
        settings: sampleSettings,
        clientUpdatedAt: '2026-08-13T12:00:00.000Z',
      });
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    const res = await request(createApp())
      .post('/user/settings/sync')
      .set('x-user-token', 'jwt')
      .send({ settings: { aiModel: 'x' } });
    expect(res.status).toBe(400);
  });

  it('writes settings and returns same shape', async () => {
    const res = await request(createApp())
      .post('/user/settings/sync')
      .set('x-user-token', 'jwt')
      .send({
        settings: sampleSettings,
        clientUpdatedAt: '2026-08-13T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalled();
    expect(res.body).toEqual({
      settings: sampleSettings,
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    });
  });

  it('older sync ignored — returns stored', async () => {
    const stored = {
      ...sampleSettings,
      customInstructions: 'server wins',
    };
    mocks.userFindUnique.mockResolvedValue({
      clientSettings: stored,
      settingsClientUpdatedAt: new Date('2026-08-13T15:00:00.000Z'),
    });

    const res = await request(createApp())
      .post('/user/settings/sync')
      .set('x-user-token', 'jwt')
      .send({
        settings: sampleSettings,
        clientUpdatedAt: '2026-08-13T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(res.body.settings.customInstructions).toBe('server wins');
    expect(res.body.clientUpdatedAt).toBe('2026-08-13T15:00:00.000Z');
  });
});
