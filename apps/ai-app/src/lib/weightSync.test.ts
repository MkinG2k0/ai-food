import { describe, expect, it } from 'vitest';
import { shouldApplyDelete, shouldApplyUpsert } from './mealSync.js';
import {
  applyWeightSync,
  weightPayloadSchema,
  weightSyncBodySchema,
} from './weightSync.js';

type WeightRow = {
  id: string;
  userId: string;
  date: string;
  kg: number;
  clientUpdatedAt: Date;
  deletedAt: Date | null;
};

function mockWeightPrisma(initial: WeightRow[] = []) {
  const rows = new Map(initial.map((row) => [row.id, { ...row }]));
  let goalKg: number | null = null;

  return {
    weightEntry: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        rows.get(where.id) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { id: string };
        create: WeightRow;
        update: Partial<WeightRow>;
      }) => {
        const prev = rows.get(where.id);
        const next = prev ? { ...prev, ...update } : { ...create };
        rows.set(where.id, next);
        return next;
      },
      findMany: async ({
        where,
      }: {
        where: { userId: string; OR?: unknown[] };
      }) =>
        [...rows.values()]
          .filter((row) => row.userId === where.userId)
          .sort(
            (a, b) => a.clientUpdatedAt.getTime() - b.clientUpdatedAt.getTime(),
          ),
    },
    user: {
      findUnique: async () => ({ goalKg }),
      update: async ({
        data,
      }: {
        where: { id: string };
        data: { goalKg: number | null };
      }) => {
        goalKg = data.goalKg;
        return { goalKg };
      },
    },
    rows,
  };
}

describe('weightSync schemas', () => {
  it('accepts valid upsert body with goalKg', () => {
    const parsed = weightSyncBodySchema.safeParse({
      upserts: [
        {
          id: 'w1',
          date: '2026-08-13',
          kg: 72.5,
          clientUpdatedAt: '2026-08-13T10:00:00.000Z',
        },
      ],
      deletes: [],
      goalKg: 70,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects bad date', () => {
    expect(
      weightPayloadSchema.safeParse({
        id: 'w1',
        date: '13-08-2026',
        kg: 70,
        clientUpdatedAt: '2026-08-13T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('applyWeightSync', () => {
  it('upserts an existing row instead of failing on duplicate id', async () => {
    const prisma = mockWeightPrisma([
      {
        id: 'w1',
        userId: 'user-1',
        date: '2026-08-13',
        kg: 70,
        clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    const result = await applyWeightSync(prisma as never, 'user-1', {
      upserts: [
        {
          id: 'w1',
          date: '2026-08-14',
          kg: 71,
          clientUpdatedAt: '2026-08-14T10:00:00.000Z',
        },
      ],
      deletes: [],
    });

    expect(result.weights).toEqual([
      {
        id: 'w1',
        date: '2026-08-14',
        kg: 71,
        clientUpdatedAt: '2026-08-14T10:00:00.000Z',
      },
    ]);
  });

  it('ignores upserts for another user id', async () => {
    const prisma = mockWeightPrisma([
      {
        id: 'w1',
        userId: 'other-user',
        date: '2026-08-13',
        kg: 70,
        clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    const result = await applyWeightSync(prisma as never, 'user-1', {
      upserts: [
        {
          id: 'w1',
          date: '2026-08-14',
          kg: 71,
          clientUpdatedAt: '2026-08-14T10:00:00.000Z',
        },
      ],
      deletes: [],
    });

    expect(result.weights).toEqual([]);
    expect(prisma.rows.get('w1')?.userId).toBe('other-user');
    expect(prisma.rows.get('w1')?.kg).toBe(70);
  });
});

describe('weight LWW reuse', () => {
  it('older upsert loses', () => {
    expect(
      shouldApplyUpsert(
        {
          clientUpdatedAt: new Date('2026-08-13T12:00:00.000Z'),
          deletedAt: null,
        },
        '2026-08-13T10:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('delete clock wins', () => {
    expect(
      shouldApplyDelete(
        {
          clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
          deletedAt: null,
        },
        '2026-08-13T11:00:00.000Z',
      ),
    ).toBe(true);
  });
});
