import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { computeDayKbju } from './computeDayKbju';

const day = new Date(2026, 7, 12, 12, 0, 0); // Aug 12 2026 local

function meal(
  overrides: Partial<Meal> & Pick<Meal, 'id' | 'status'>,
): Meal {
  return {
    timestamp: day.toISOString(),
    items: [
      {
        name: 'item',
        grams: 100,
        calories: 200,
        protein: 20,
        fat: 10,
        carbs: 15,
      },
    ],
    totalCalories: 200,
    name: 'Meal',
    ...overrides,
  };
}

describe('computeDayKbju', () => {
  it('returns hasReadyMeals false and zero consumed for analyzing/error only', () => {
    const meals: Meal[] = [
      meal({ id: 'a', status: 'analyzing', totalCalories: 500 }),
      meal({ id: 'b', status: 'error', totalCalories: 300 }),
    ];
    const result = computeDayKbju(meals, null, day);
    expect(result.hasReadyMeals).toBe(false);
    expect(result.consumed).toEqual({
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
  });

  it('sums ready meals vs fallback goals and clamps progress', () => {
    const meals: Meal[] = [
      meal({ id: 'r1', status: 'ready' }),
      meal({
        id: 'r2',
        status: 'ready',
        totalCalories: 2500,
        items: [
          {
            name: 'big',
            grams: 500,
            calories: 2500,
            protein: 200,
            fat: 100,
            carbs: 300,
          },
        ],
      }),
      meal({ id: 'skip', status: 'analyzing', totalCalories: 999 }),
    ];
    const result = computeDayKbju(meals, null, day);
    expect(result.hasReadyMeals).toBe(true);
    expect(result.consumed.kcal).toBe(2700);
    expect(result.goals.kcal).toBe(2000);
    expect(result.progress.kcal).toBe(1);
    expect(result.progress.protein).toBe(1);
  });

  it('uses profile targets when provided', () => {
    const meals: Meal[] = [meal({ id: 'r', status: 'ready' })];
    const result = computeDayKbju(
      meals,
      { kcal: 400, protein: 40, fat: 20, carbs: 30, fiber: 10 },
      day,
    );
    expect(result.goals.kcal).toBe(400);
    expect(result.progress.kcal).toBe(0.5);
    expect(result.progress.protein).toBe(0.5);
  });

  it('ignores meals on other days', () => {
    const other = new Date(2026, 7, 11, 12, 0, 0);
    const meals: Meal[] = [
      meal({ id: 'other', status: 'ready', timestamp: other.toISOString() }),
    ];
    const result = computeDayKbju(meals, null, day);
    expect(result.hasReadyMeals).toBe(false);
  });
});
