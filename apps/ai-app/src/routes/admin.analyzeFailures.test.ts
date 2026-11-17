import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../middleware/adminAuth.js', () => ({
  requireAdminKey: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const { adminRouter } = await import('./admin.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /admin/analyze-failures', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      clientAnalyticsEvent: {
        findMany: mocks.findMany,
        count: mocks.count,
      },
    });
    mocks.count.mockResolvedValue(1);
    mocks.findMany
      .mockResolvedValueOnce([
        {
          userId: 'u1',
          deviceId: 'd1',
          errorCode: null,
          inFlight: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'e1',
          name: 'analyze_meal_card_failure',
          userId: 'u1',
          deviceId: 'd1',
          mealId: 'm1',
          errorCode: null,
          inFlight: true,
          clientAt: new Date('2026-11-17T12:00:00.000Z'),
          createdAt: new Date('2026-11-17T12:00:01.000Z'),
          user: {
            id: 'u1',
            telegramId: '42',
            username: 'bob',
            firstName: 'Bob',
            lastName: null,
          },
        },
      ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary and paginated items', async () => {
    const res = await request(createApp()).get(
      '/admin/analyze-failures?page=1&pageSize=20',
    );

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      total: 1,
      inFlightCount: 1,
      terminalCount: 0,
      uniqueUsers: 1,
      uniqueDevices: 1,
      byErrorCode: { '(none)': 1 },
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: 'e1',
      mealId: 'm1',
      inFlight: true,
      user: { username: 'bob' },
    });
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(20);
  });
});
