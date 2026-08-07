import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { computeTodayKbjuSnapshot } from './computeTodayKbjuSnapshot';

const NOW = new Date('2026-08-07T12:00:00');

function meal(partial: Partial<Meal> & Pick<Meal, 'id' | 'timestamp'>): Meal {
  return {
    items: [],
    totalCalories: 0,
    ...partial,
  };
}

describe('computeTodayKbjuSnapshot', () => {
  it('counts only ready meals on today; skips analyzing and error', () => {
    const meals: Meal[] = [
      meal({
        id: '1',
        timestamp: '2026-08-07T08:00:00',
        status: 'ready',
        totalCalories: 500,
        items: [
          {
            id: 'i1',
            name: 'Oats',
            calories: 500,
            protein: 20,
            fat: 10,
            carbs: 60,
            fiber: 8,
            grams: 100,
          },
        ],
      }),
      meal({
        id: '2',
        timestamp: '2026-08-07T09:00:00',
        status: undefined,
        totalCalories: 300,
        items: [
          {
            id: 'i2',
            name: 'Egg',
            calories: 300,
            protein: 15,
            fat: 20,
            carbs: 5,
            fiber: 0,
            grams: 50,
          },
        ],
      }),
      meal({
        id: '3',
        timestamp: '2026-08-07T10:00:00',
        status: 'analyzing',
        totalCalories: 999,
        items: [
          {
            id: 'i3',
            name: 'Pending',
            calories: 999,
            protein: 99,
            fat: 99,
            carbs: 99,
            fiber: 0,
            grams: 1,
          },
        ],
      }),
      meal({
        id: '4',
        timestamp: '2026-08-07T11:00:00',
        status: 'error',
        totalCalories: 888,
        items: [
          {
            id: 'i4',
            name: 'Failed',
            calories: 888,
            protein: 88,
            fat: 88,
            carbs: 88,
            fiber: 0,
            grams: 1,
          },
        ],
      }),
      meal({
        id: '5',
        timestamp: '2026-08-06T12:00:00',
        status: 'ready',
        totalCalories: 700,
        items: [
          {
            id: 'i5',
            name: 'Yesterday',
            calories: 700,
            protein: 40,
            fat: 30,
            carbs: 50,
            fiber: 5,
            grams: 200,
          },
        ],
      }),
    ];

    const snapshot = computeTodayKbjuSnapshot(meals, null, NOW);

    expect(snapshot.date).toBe('2026-08-07');
    expect(snapshot.consumed).toEqual({
      kcal: 800,
      protein: 35,
      fat: 30,
      carbs: 65,
    });
    expect(snapshot.goals).toEqual({
      kcal: 2000,
      protein: 150,
      fat: 70,
      carbs: 250,
    });
    expect(snapshot.consumed).not.toHaveProperty('fiber');
    expect(snapshot.goals).not.toHaveProperty('fiber');
  });

  it('uses profile targets when provided', () => {
    const snapshot = computeTodayKbjuSnapshot(
      [],
      { kcal: 1800, protein: 120, fat: 60, carbs: 200, fiber: 25 },
      NOW,
    );

    expect(snapshot.consumed).toEqual({
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
    expect(snapshot.goals).toEqual({
      kcal: 1800,
      protein: 120,
      fat: 60,
      carbs: 200,
    });
  });

  it('empty meals → consumed zeros with FALLBACK goals', () => {
    const snapshot = computeTodayKbjuSnapshot([], null, NOW);

    expect(snapshot.date).toBe('2026-08-07');
    expect(snapshot.consumed).toEqual({
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
    expect(snapshot.goals).toEqual({
      kcal: 2000,
      protein: 150,
      fat: 70,
      carbs: 250,
    });
  });
});
