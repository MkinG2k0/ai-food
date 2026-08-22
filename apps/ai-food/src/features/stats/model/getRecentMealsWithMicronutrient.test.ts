import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { getRecentMealsWithMicronutrient } from './getRecentMealsWithMicronutrient';

function meal(
  overrides: Partial<Meal> & Pick<Meal, 'id' | 'timestamp'>,
): Meal {
  return {
    items: [],
    totalCalories: 0,
    ...overrides,
  };
}

const NOW = new Date('2026-08-22T12:00:00.000Z');

describe('getRecentMealsWithMicronutrient', () => {
  it('returns up to 3 newest ready meals with positive amount', () => {
    const meals = [
      meal({
        id: '1',
        timestamp: '2026-08-20T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 2, unit: 'mg' }],
      }),
      meal({
        id: '2',
        timestamp: '2026-08-22T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 4, unit: 'mg' }],
      }),
      meal({
        id: '3',
        timestamp: '2026-08-21T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 0, unit: 'mg' }],
      }),
      meal({
        id: '4',
        timestamp: '2026-08-23T10:00:00.000Z',
        status: 'analyzing',
        micronutrients: [{ id: 'iron', amount: 9, unit: 'mg' }],
      }),
      meal({
        id: '5',
        timestamp: '2026-08-19T10:00:00.000Z',
        micronutrients: [{ id: 'calcium', amount: 100, unit: 'mg' }],
      }),
      meal({
        id: '6',
        timestamp: '2026-08-18T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 1.5, unit: 'mg' }],
      }),
      meal({
        id: '7',
        timestamp: '2026-08-17T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 0.5, unit: 'mg' }],
      }),
    ];

    const result = getRecentMealsWithMicronutrient(meals, 'iron', 3, NOW);
    expect(result.map((r) => r.meal.id)).toEqual(['2', '1', '6']);
    expect(result[0].amount).toBe(4);
  });

  it('ignores meals older than ~1 month', () => {
    const meals = [
      meal({
        id: 'old',
        timestamp: '2026-07-01T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 8, unit: 'mg' }],
      }),
      meal({
        id: 'recent',
        timestamp: '2026-08-10T10:00:00.000Z',
        micronutrients: [{ id: 'iron', amount: 3, unit: 'mg' }],
      }),
    ];

    const result = getRecentMealsWithMicronutrient(meals, 'iron', 3, NOW);
    expect(result.map((r) => r.meal.id)).toEqual(['recent']);
  });

  it('returns empty when no meals match', () => {
    expect(getRecentMealsWithMicronutrient([], 'vitaminD', 3, NOW)).toEqual([]);
  });
});
