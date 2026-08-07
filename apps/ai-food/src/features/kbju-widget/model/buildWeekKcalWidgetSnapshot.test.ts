import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { buildWeekKcalWidgetSnapshot } from './buildWeekKcalWidgetSnapshot';

/** Friday 2026-08-07 → week Mon 2026-08-03 … Sun 2026-08-09 */
const NOW = new Date('2026-08-07T12:00:00');

function meal(partial: Partial<Meal> & Pick<Meal, 'id' | 'timestamp'>): Meal {
  return {
    items: [],
    totalCalories: 0,
    ...partial,
  };
}

describe('buildWeekKcalWidgetSnapshot', () => {
  it('places a ready weekday meal on that day; weekStart is Monday', () => {
    const meals: Meal[] = [
      meal({
        id: 'wed',
        timestamp: '2026-08-05T13:00:00',
        status: 'ready',
        totalCalories: 450,
        items: [
          {
            id: 'i1',
            name: 'Lunch',
            calories: 450,
            protein: 30,
            fat: 15,
            carbs: 40,
            fiber: 5,
            grams: 200,
          },
        ],
      }),
    ];

    const snapshot = buildWeekKcalWidgetSnapshot(meals, null, NOW);

    expect(snapshot.weekStart).toBe('2026-08-03');
    expect(snapshot.goalKcal).toBe(2000);
    expect(snapshot.days).toHaveLength(7);
    expect(snapshot.days.map((d) => d.date)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);

    const wed = snapshot.days[2];
    expect(wed).toEqual({
      date: '2026-08-05',
      calories: 450,
      protein: 30,
      carbs: 40,
      fat: 15,
    });
  });

  it('ignores analyzing meals', () => {
    const meals: Meal[] = [
      meal({
        id: 'pending',
        timestamp: '2026-08-07T10:00:00',
        status: 'analyzing',
        totalCalories: 999,
        items: [
          {
            id: 'i2',
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
    ];

    const snapshot = buildWeekKcalWidgetSnapshot(meals, null, NOW);
    const fri = snapshot.days.find((d) => d.date === '2026-08-07');
    expect(fri).toEqual({
      date: '2026-08-07',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('empty week → zero days and fallback goalKcal', () => {
    const snapshot = buildWeekKcalWidgetSnapshot([], null, NOW);

    expect(snapshot.weekStart).toBe('2026-08-03');
    expect(snapshot.goalKcal).toBe(2000);
    expect(snapshot.days.every((d) => d.calories === 0 && d.protein === 0)).toBe(
      true,
    );
  });

  it('uses profile kcal target when provided', () => {
    const snapshot = buildWeekKcalWidgetSnapshot(
      [],
      { kcal: 1800, protein: 120, fat: 60, carbs: 200, fiber: 25 },
      NOW,
    );
    expect(snapshot.goalKcal).toBe(1800);
  });
});
