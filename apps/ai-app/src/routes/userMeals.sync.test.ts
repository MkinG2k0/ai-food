import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
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

const { userMealsRouter } = await import('./userMeals.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/meals', userMealsRouter);
  app.use(errorHandler);
  return app;
}

const userId = 'user-1';

const sampleMeal = {
  id: 'meal-1',
  timestamp: '2026-08-13T08:00:00.000Z',
  items: [{ name: 'Рис', calories: 200, protein: 4, fat: 1, carbs: 40 }],
  totalCalories: 200,
  name: 'Обед',
  status: 'ready',
  clientUpdatedAt: '2026-08-13T09:00:00.000Z',
};

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: sampleMeal.id,
    userId,
    timestamp: new Date(sampleMeal.timestamp),
    name: sampleMeal.name,
    items: sampleMeal.items,
    totalCalories: sampleMeal.totalCalories,
    portions: null,
    totalGrams: null,
    status: sampleMeal.status,
    healthiness: null,
    confidence: null,
    analyzeErrorCode: null,
    micronutrients: null,
    aiModel: null,
    portionReference: null,
    addedSugar: null,
    confidenceReason: null,
    healthinessReason: null,
    disclaimers: null,
    customContent: null,
    customContentEntries: null,
    imageUri: null,
    imageUris: null,
    clientUpdatedAt: new Date(sampleMeal.clientUpdatedAt),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /user/meals/sync', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      meal: {
        findFirst: mocks.findFirst,
        findUnique: mocks.findUnique,
        findMany: mocks.findMany,
        create: mocks.create,
        update: mocks.update,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: userId,
      telegramId: '42',
    });
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    mocks.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    mocks.update.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .post('/user/meals/sync')
      .send({ upserts: [], deletes: [] });
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    const res = await request(createApp())
      .post('/user/meals/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [{ id: 'x' }] });
    expect(res.status).toBe(400);
  });

  it('successful upsert round-trip', async () => {
    const created = activeRow();
    mocks.findMany.mockResolvedValue([created]);

    const res = await request(createApp())
      .post('/user/meals/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [sampleMeal], deletes: [] });

    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalled();
    expect(res.body.meals).toHaveLength(1);
    expect(res.body.meals[0].id).toBe('meal-1');
    expect(res.body.meals[0].clientUpdatedAt).toBe(sampleMeal.clientUpdatedAt);
    expect(res.body.tombstones).toEqual([]);
  });

  it('older upsert ignored; winner returned', async () => {
    const stored = activeRow({
      clientUpdatedAt: new Date('2026-08-13T12:00:00.000Z'),
      totalCalories: 500,
      name: 'Winner',
    });
    mocks.findFirst.mockResolvedValue(stored);
    mocks.findMany.mockResolvedValue([stored]);

    const res = await request(createApp())
      .post('/user/meals/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [
          {
            ...sampleMeal,
            name: 'Stale',
            totalCalories: 100,
            clientUpdatedAt: '2026-08-13T09:00:00.000Z',
          },
        ],
        deletes: [],
      });

    expect(res.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(res.body.meals[0].name).toBe('Winner');
    expect(res.body.meals[0].totalCalories).toBe(500);
  });

  it('delete creates tombstone', async () => {
    const stored = activeRow();
    mocks.findFirst.mockResolvedValue(stored);
    const tombstoned = activeRow({
      deletedAt: new Date('2026-08-13T10:00:00.000Z'),
      clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
    });
    mocks.findMany.mockResolvedValue([tombstoned]);

    const res = await request(createApp())
      .post('/user/meals/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [],
        deletes: [
          { id: 'meal-1', clientUpdatedAt: '2026-08-13T10:00:00.000Z' },
        ],
      });

    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'meal-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(res.body.meals).toEqual([]);
    expect(res.body.tombstones).toEqual(['meal-1']);
  });

  it('does not check subscriptionStatus', async () => {
    mocks.findMany.mockResolvedValue([]);
    const res = await request(createApp())
      .post('/user/meals/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [], deletes: [] });
    expect(res.status).toBe(200);
    expect(mocks.verifyUserToken).toHaveBeenCalled();
    // No user.findUnique / subscription gate — only meal ops + JWT.
    expect(mocks.getPrisma().meal).toBeDefined();
  });
});
