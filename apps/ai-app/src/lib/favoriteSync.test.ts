import { describe, expect, it } from 'vitest';
import { shouldApplyUpsert } from './mealSync.js';
import { favoritePayloadSchema, favoriteSyncBodySchema } from './favoriteSync.js';

describe('favoriteSync schemas', () => {
  it('accepts favorite with image stubs', () => {
    const parsed = favoriteSyncBodySchema.safeParse({
      upserts: [
        {
          id: 'f1',
          sourceMealId: 'm1',
          name: 'Суп',
          items: [],
          totalCalories: 200,
          imageUri: 'meal-images/x.jpg',
          clientUpdatedAt: '2026-08-13T10:00:00.000Z',
        },
      ],
      deletes: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('requires clientUpdatedAt', () => {
    expect(
      favoritePayloadSchema.safeParse({
        id: 'f1',
        sourceMealId: 'm1',
        name: 'Суп',
        items: [],
        totalCalories: 200,
      }).success,
    ).toBe(false);
  });
});

describe('favorite LWW reuse', () => {
  it('newer upsert wins', () => {
    expect(
      shouldApplyUpsert(
        {
          clientUpdatedAt: new Date('2026-08-13T09:00:00.000Z'),
          deletedAt: null,
        },
        '2026-08-13T10:00:00.000Z',
      ),
    ).toBe(true);
  });
});
