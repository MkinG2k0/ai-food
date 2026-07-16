import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { getWeeklyCalorieSeries } from './getWeeklyCalorieSeries';

function localIso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h, 0, 0, 0).toISOString();
}

function makeMeal(partial: Partial<Meal> & Pick<Meal, 'id' | 'timestamp' | 'totalCalories'>): Meal {
  return {
    items: [],
    ...partial,
  };
}

/** Fixed reference: 2026-07-16 (Thu) → week Mon 13 … Sun 19 */
const TODAY = new Date(2026, 6, 16, 0, 0, 0, 0);

describe('getWeeklyCalorieSeries', () => {
  it('returns Mon→Sun calendar week for weekOffset 0', () => {
    const series = getWeeklyCalorieSeries([], 0, TODAY);

    expect(series).toHaveLength(7);
    expect(series.every((p) => p.calories === 0)).toBe(true);
    expect(series.map((p) => p.date.getDate())).toEqual([13, 14, 15, 16, 17, 18, 19]);
    expect(series[0].date.getDay()).toBe(1);
    expect(series[6].date.getDay()).toBe(0);
  });

  it('shifts to previous calendar week for weekOffset -1', () => {
    const series = getWeeklyCalorieSeries([], -1, TODAY);

    expect(series.map((p) => p.date.getDate())).toEqual([6, 7, 8, 9, 10, 11, 12]);
  });

  it('sums totalCalories for multiple ready meals on the same day', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 7, 16, 9),
        totalCalories: 300,
        status: 'ready',
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 7, 16, 18),
        totalCalories: 450,
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, 0, TODAY);

    // Jul 16 is Thursday → index 3
    expect(series[3].calories).toBe(750);
    expect(series.filter((_, i) => i !== 3).every((p) => p.calories === 0)).toBe(true);
  });

  it('sums protein/carbs/fat from meal items for the day', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 7, 16, 9),
        totalCalories: 400,
        items: [
          {
            id: 'i1',
            name: 'rice',
            calories: 200,
            protein: 5,
            carbs: 40,
            fat: 1,
            fiber: 1,
            grams: 100,
          },
        ],
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 7, 16, 18),
        totalCalories: 300,
        items: [
          {
            id: 'i2',
            name: 'chicken',
            calories: 300,
            protein: 30,
            carbs: 0,
            fat: 10,
            fiber: 0,
            grams: 150,
          },
        ],
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, 0, TODAY);

    expect(series[3].protein).toBe(35);
    expect(series[3].carbs).toBe(40);
    expect(series[3].fat).toBe(11);
  });

  it('ignores analyzing and error meals; omitted status counts as ready', () => {
    const meals = [
      makeMeal({
        id: 'ready-omit',
        timestamp: localIso(2026, 7, 15),
        totalCalories: 200,
      }),
      makeMeal({
        id: 'analyzing',
        timestamp: localIso(2026, 7, 15),
        totalCalories: 999,
        status: 'analyzing',
      }),
      makeMeal({
        id: 'error',
        timestamp: localIso(2026, 7, 15),
        totalCalories: 888,
        status: 'error',
      }),
      makeMeal({
        id: 'ready',
        timestamp: localIso(2026, 7, 15),
        totalCalories: 100,
        status: 'ready',
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, 0, TODAY);

    // Jul 15 is Wednesday → index 2
    expect(series[2].calories).toBe(300);
  });

  it('ignores meals outside the calendar week', () => {
    const meals = [
      makeMeal({
        id: 'prev-week',
        timestamp: localIso(2026, 7, 12),
        totalCalories: 500,
      }),
      makeMeal({
        id: 'in-week',
        timestamp: localIso(2026, 7, 13),
        totalCalories: 120,
      }),
      makeMeal({
        id: 'next-week',
        timestamp: localIso(2026, 7, 20),
        totalCalories: 400,
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, 0, TODAY);

    expect(series[0].calories).toBe(120); // Jul 13 Mon
    expect(series.every((p, i) => (i === 0 ? p.calories === 120 : p.calories === 0))).toBe(
      true,
    );
  });
});
