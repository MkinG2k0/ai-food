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

const { userWeightsRouter } = await import('./userWeights.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/weights', userWeightsRouter);
  app.use(errorHandler);
  return app;
}

const userId = 'user-1';
const sample = {
  id: 'w1',
  date: '2026-08-13',
  kg: 72,
  clientUpdatedAt: '2026-08-13T09:00:00.000Z',
};

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: sample.id,
    userId,
    date: sample.date,
    kg: sample.kg,
    clientUpdatedAt: new Date(sample.clientUpdatedAt),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /user/weights/sync', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      weightEntry: {
        findFirst: mocks.findFirst,
        findUnique: mocks.findUnique,
        findMany: mocks.findMany,
        create: mocks.create,
        update: mocks.update,
      },
      user: {
        findUnique: mocks.userFindUnique,
        update: mocks.userUpdate,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: userId,
      telegramId: '42',
    });
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    mocks.userFindUnique.mockResolvedValue({ goalKg: null });
    mocks.userUpdate.mockResolvedValue({ goalKg: 70 });
    mocks.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    mocks.update.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .post('/user/weights/sync')
      .send({ upserts: [], deletes: [] });
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    const res = await request(createApp())
      .post('/user/weights/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [{ id: 'x' }] });
    expect(res.status).toBe(400);
  });

  it('upsert + goalKg round-trip', async () => {
    mocks.findMany.mockResolvedValue([activeRow()]);
    mocks.userFindUnique.mockResolvedValue({ goalKg: 70 });

    const res = await request(createApp())
      .post('/user/weights/sync')
      .set('x-user-token', 'jwt')
      .send({ upserts: [sample], deletes: [], goalKg: 70 });

    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalled();
    expect(res.body.weights).toHaveLength(1);
    expect(res.body.goalKg).toBe(70);
  });

  it('older upsert ignored', async () => {
    const stored = activeRow({
      clientUpdatedAt: new Date('2026-08-13T12:00:00.000Z'),
      kg: 80,
    });
    mocks.findFirst.mockResolvedValue(stored);
    mocks.findMany.mockResolvedValue([stored]);
    mocks.userFindUnique.mockResolvedValue({ goalKg: null });

    const res = await request(createApp())
      .post('/user/weights/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [{ ...sample, kg: 60, clientUpdatedAt: '2026-08-13T09:00:00.000Z' }],
        deletes: [],
      });

    expect(res.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.body.weights[0].kg).toBe(80);
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
      .post('/user/weights/sync')
      .set('x-user-token', 'jwt')
      .send({
        upserts: [],
        deletes: [{ id: 'w1', clientUpdatedAt: '2026-08-13T10:00:00.000Z' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.tombstones).toEqual(['w1']);
  });
});
