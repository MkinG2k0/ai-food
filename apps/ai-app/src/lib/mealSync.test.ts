import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyMealSync,
  lwwWins,
  mealSyncBodySchema,
  shouldApplyDelete,
  shouldApplyUpsert,
} from './mealSync.js';

describe('lwwWins', () => {
  it('wins when stored is missing', () => {
    expect(lwwWins('2026-08-13T12:00:00.000Z', null)).toBe(true);
    expect(lwwWins('2026-08-13T12:00:00.000Z', undefined)).toBe(true);
  });

  it('wins when incoming is newer or equal', () => {
    expect(
      lwwWins('2026-08-13T12:00:00.000Z', '2026-08-13T11:00:00.000Z'),
    ).toBe(true);
    expect(
      lwwWins('2026-08-13T12:00:00.000Z', '2026-08-13T12:00:00.000Z'),
    ).toBe(true);
  });

  it('loses when incoming is older', () => {
    expect(
      lwwWins('2026-08-13T11:00:00.000Z', '2026-08-13T12:00:00.000Z'),
    ).toBe(false);
  });
});

describe('shouldApplyUpsert / shouldApplyDelete', () => {
  const older = {
    clientUpdatedAt: new Date('2026-08-13T10:00:00.000Z'),
    deletedAt: null as Date | null,
  };
  const tombstone = {
    clientUpdatedAt: new Date('2026-08-13T11:00:00.000Z'),
    deletedAt: new Date('2026-08-13T11:00:00.000Z'),
  };

  it('applies upsert when no row', () => {
    expect(shouldApplyUpsert(null, '2026-08-13T12:00:00.000Z')).toBe(true);
  });

  it('applies newer upsert over active and tombstone (undelete)', () => {
    expect(shouldApplyUpsert(older, '2026-08-13T12:00:00.000Z')).toBe(true);
    expect(shouldApplyUpsert(tombstone, '2026-08-13T12:00:00.000Z')).toBe(true);
  });

  it('ignores older upsert against tombstone', () => {
    expect(shouldApplyUpsert(tombstone, '2026-08-13T10:00:00.000Z')).toBe(
      false,
    );
  });

  it('applies delete when clock wins; ignores older delete', () => {
    expect(shouldApplyDelete(older, '2026-08-13T12:00:00.000Z')).toBe(true);
    expect(shouldApplyDelete(older, '2026-08-13T09:00:00.000Z')).toBe(false);
    expect(shouldApplyDelete(null, '2026-08-13T12:00:00.000Z')).toBe(true);
  });
});

describe('mealSyncBodySchema', () => {
  it('accepts empty upserts/deletes and optional since', () => {
    const parsed = mealSyncBodySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.upserts).toEqual([]);
      expect(parsed.data.deletes).toEqual([]);
    }
  });

  it('rejects meal without clientUpdatedAt', () => {
    const parsed = mealSyncBodySchema.safeParse({
      upserts: [
        {
          id: 'm1',
          timestamp: '2026-08-13T10:00:00.000Z',
          items: [],
          totalCalories: 100,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('applyMealSync ownership', () => {
  const mocks = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  function prismaStub() {
    return {
      meal: {
        findFirst: mocks.findFirst,
        findUnique: mocks.findUnique,
        findMany: mocks.findMany,
        create: mocks.create,
        update: mocks.update,
      },
    } as never;
  }

  const upsert = {
    id: 'shared-id',
    timestamp: '2026-08-13T10:00:00.000Z',
    items: [],
    totalCalories: 200,
    clientUpdatedAt: '2026-08-13T12:00:00.000Z',
  };

  beforeEach(() => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([]);
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('skips upsert when meal id belongs to another user', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'shared-id',
      userId: 'other-user',
    });

    await applyMealSync(prismaStub(), 'user-1', {
      upserts: [upsert],
      deletes: [],
    });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('ignores delete tombstone when meal id belongs to another user', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'shared-id',
      userId: 'other-user',
    });

    await applyMealSync(prismaStub(), 'user-1', {
      upserts: [],
      deletes: [
        {
          id: 'shared-id',
          clientUpdatedAt: '2026-08-13T12:00:00.000Z',
        },
      ],
    });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
