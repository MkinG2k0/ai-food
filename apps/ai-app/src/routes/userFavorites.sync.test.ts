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

const { userFavoritesRouter } = await import('./userFavorites.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/favorites', userFavoritesRouter);
  app.use(errorHandler);
  return app;
}

const userId = 'user-1';
const sample = {
  id: 'f1',
  sourceMealId: 'm1',
  name: 'Суп',
  items: [],
  totalCalories: 200,
  clientUpdatedAt: '2026-08-13T09:00:00.000Z',
};

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: sample.id,
    userId,
    sourceMealId: sample.sourceMealId,
    name: sample.name,
    items: sample.items,
    totalCalories: sample.totalCalories,
    portions: null,
    imageUri: null,
    imageUris: null,
    healthiness: null,
    confidence: null,
    micronutrients: null,
    createdAtClient: null,
    clientUpdatedAt: new Date(sample.clientUpdatedAt),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /user/favorites/sync', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      favorite: {
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
      .post('/user/favorites/sync')
      .send({ upserts: [], deletes: [] });
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    const res = await request(createApp())
      .post('/user/favorites/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [{ id: 'x' }] });
    expect(res.status).toBe(400);
  });

  it('upsert round-trip', async () => {
    mocks.findMany.mockResolvedValue([activeRow()]);
    const res = await request(createApp())
      .post('/user/favorites/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [sample], deletes: [] });
    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalled();
    expect(res.body.favorites[0].id).toBe('f1');
  });

  it('older upsert ignored', async () => {
    const stored = activeRow({
      clientUpdatedAt: new Date('2026-08-13T12:00:00.000Z'),
      name: 'Winner',
    });
    mocks.findFirst.mockResolvedValue(stored);
    mocks.findMany.mockResolvedValue([stored]);

    const res = await request(createApp())
      .post('/user/favorites/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [
          {
            ...sample,
            name: 'Stale',
            clientUpdatedAt: '2026-08-13T09:00:00.000Z',
          },
        ],
        deletes: [],
      });

    expect(res.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.body.favorites[0].name).toBe('Winner');
  });

  it('delete tombstone', async () => {
    mocks.findFirst.mockResolvedValue(activeRow());
    mocks.findMany.mockResolvedValue([
      activeRow({
        deletedAt: new Date('2026-08-13T10:00:00.000Z'),
        clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
      }),
    ]);

    const res = await request(createApp())
      .post('/user/favorites/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [],
        deletes: [{ id: 'f1', clientUpdatedAt: '2026-08-13T10:00:00.000Z' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.tombstones).toEqual(['f1']);
  });
});
