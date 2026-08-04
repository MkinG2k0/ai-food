import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  sendFlashCall: vi.fn(),
  createChallenge: vi.fn(),
  getChallenge: vi.fn(),
  registerFailedAttempt: vi.fn(),
  consumeChallengeOnSuccess: vi.fn(),
  countActiveForPhone: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
  ensureDevice: vi.fn(),
  signUserToken: vi.fn(),
  verifyUserToken: vi.fn(),
}));

vi.mock('../lib/flashcall.js', () => ({
  sendFlashCall: mocks.sendFlashCall,
}));
vi.mock('../lib/flashcallChallenge.js', () => ({
  createChallenge: mocks.createChallenge,
  getChallenge: mocks.getChallenge,
  registerFailedAttempt: mocks.registerFailedAttempt,
  consumeChallengeOnSuccess: mocks.consumeChallengeOnSuccess,
  countActiveForPhone: mocks.countActiveForPhone,
}));
vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => ({
    user: {
      upsert: mocks.upsert,
      findUnique: mocks.findUnique,
    },
  }),
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: mocks.ensureDevice,
}));
vi.mock('../lib/jwt.js', () => ({
  signUserToken: mocks.signUserToken,
  verifyUserToken: mocks.verifyUserToken,
}));

const { authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('Flash-Call auth routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts a normalized-phone challenge without returning its code', async () => {
    mocks.countActiveForPhone.mockReturnValue(0);
    mocks.sendFlashCall.mockResolvedValue({
      id: 'provider-1',
      code: '1234',
      number: '79991234567',
    });
    mocks.createChallenge.mockReturnValue({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
    });

    const response = await request(createApp())
      .post('/auth/flashcall/start')
      .send({ phone: '+7 (999) 123-45-67' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
      expiresAt: '2026-08-04T16:00:00.000Z',
    });
    expect(response.body).not.toHaveProperty('code');
    expect(mocks.sendFlashCall).toHaveBeenCalledWith('79991234567');
    expect(mocks.createChallenge).toHaveBeenCalledWith({
      phone: '79991234567',
      code: '1234',
      providerId: 'provider-1',
    });
  });

  it('rejects an incorrect code and records a failed attempt', async () => {
    mocks.getChallenge.mockReturnValue({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      phone: '79991234567',
      code: '1234',
      expiresAt: Date.now() + 60_000,
      attempts: 0,
    });
    mocks.registerFailedAttempt.mockReturnValue('ok');

    const response = await request(createApp())
      .post('/auth/flashcall/verify')
      .send({ challengeId: '78d7cad3-5b19-411d-884e-6d8083368721', code: '9999' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CODE');
    expect(mocks.registerFailedAttempt).toHaveBeenCalledWith(
      '78d7cad3-5b19-411d-884e-6d8083368721',
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('verifies a challenge, creates the user, and returns a token', async () => {
    mocks.getChallenge.mockReturnValue({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      phone: '79991234567',
      code: '1234',
      expiresAt: Date.now() + 60_000,
      attempts: 0,
    });
    mocks.upsert.mockResolvedValue({
      id: 'user-1',
      phone: '79991234567',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    mocks.signUserToken.mockResolvedValue('token-1');

    const response = await request(createApp())
      .post('/auth/flashcall/verify')
      .send({
        challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
        code: '1234',
        deviceId: 'device-1',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: 'token-1',
      user: { id: 'user-1', phone: '79991234567' },
    });
    expect(mocks.consumeChallengeOnSuccess).toHaveBeenCalledWith(
      '78d7cad3-5b19-411d-884e-6d8083368721',
    );
    expect(mocks.ensureDevice).toHaveBeenCalledWith(expect.anything(), 'device-1', 'user-1');
    expect(mocks.signUserToken).toHaveBeenCalledWith({
      sub: 'user-1',
      phone: '79991234567',
    });
  });
});
