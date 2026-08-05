import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  ensureDevice: vi.fn(),
  verifyUserToken: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
  usageEventCreate: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
}));
vi.mock('../lib/quota.js', () => ({
  ensureDevice: mocks.ensureDevice,
  getEffectiveLimit: vi.fn(),
  getUsageSnapshot: vi.fn(),
}));
vi.mock('../lib/subscription.js', () => ({
  hasActiveSubscription: vi.fn(),
}));

const { usageRouter } = await import('./usage.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/usage', usageRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /usage/event', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      usageEvent: { create: mocks.usageEventCreate },
    });
    mocks.ensureDevice.mockResolvedValue({ id: 'device-row-1', deviceId: 'dev-1' });
    mocks.usageEventCreate.mockResolvedValue({ id: 'evt-1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('records manual with device', async () => {
    const res = await request(createApp())
      .post('/usage/event')
      .set('X-Device-Id', 'dev-1')
      .send({ kind: 'manual' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mocks.ensureDevice).toHaveBeenCalledWith(
      expect.anything(),
      'dev-1',
      undefined,
    );
    expect(mocks.usageEventCreate).toHaveBeenCalledWith({
      data: {
        kind: 'manual',
        deviceId: 'device-row-1',
        userId: null,
      },
    });
  });

  it('rejects analyze kind', async () => {
    const res = await request(createApp())
      .post('/usage/event')
      .set('X-Device-Id', 'dev-1')
      .send({ kind: 'analyze' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mocks.usageEventCreate).not.toHaveBeenCalled();
  });

  it('requires device id', async () => {
    const res = await request(createApp())
      .post('/usage/event')
      .send({ kind: 'manual' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DEVICE_ID_REQUIRED');
    expect(mocks.usageEventCreate).not.toHaveBeenCalled();
  });
});
