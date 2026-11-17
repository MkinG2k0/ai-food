import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  verifyUserToken: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
}));

const { analyticsRouter } = await import('./analytics.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/analytics', analyticsRouter);
  app.use(errorHandler);
  return app;
}

const validBody = {
  name: 'analyze_meal_card_failure',
  mealId: 'meal-1',
  errorCode: null,
  inFlight: true,
  clientAt: '2026-11-17T15:00:00.000Z',
};

describe('POST /analytics/events', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      clientAnalyticsEvent: { create: mocks.create },
    });
    mocks.create.mockResolvedValue({ id: 'evt-1' });
    mocks.verifyUserToken.mockResolvedValue({ sub: 'user-1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists analyze_meal_card_failure with user and device', async () => {
    const res = await request(createApp())
      .post('/analytics/events')
      .set('X-Device-Id', 'dev-1')
      .set('X-User-Token', 'tok')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        name: 'analyze_meal_card_failure',
        mealId: 'meal-1',
        errorCode: null,
        inFlight: true,
        deviceId: 'dev-1',
        userId: 'user-1',
        clientAt: new Date('2026-11-17T15:00:00.000Z'),
        payload: undefined,
      },
    });
  });

  it('accepts guest device without user token', async () => {
    const res = await request(createApp())
      .post('/analytics/events')
      .set('X-Device-Id', 'dev-guest')
      .send({
        name: 'analyze_meal_card_failure',
        mealId: 'm2',
        inFlight: false,
        errorCode: 'NO_FOOD_DETECTED',
      });

    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deviceId: 'dev-guest',
        userId: null,
        inFlight: false,
        errorCode: 'NO_FOOD_DETECTED',
      }),
    });
  });

  it('requires device id', async () => {
    const res = await request(createApp())
      .post('/analytics/events')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DEVICE_ID_REQUIRED');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects unknown event names', async () => {
    const res = await request(createApp())
      .post('/analytics/events')
      .set('X-Device-Id', 'dev-1')
      .send({ ...validBody, name: 'other_event' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
