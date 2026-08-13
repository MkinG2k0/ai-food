import { describe, expect, it } from 'vitest';
import {
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
