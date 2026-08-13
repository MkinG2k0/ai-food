import { describe, expect, it } from 'vitest';
import { shouldApplyDelete, shouldApplyUpsert } from './mealSync.js';
import { weightPayloadSchema, weightSyncBodySchema } from './weightSync.js';

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
