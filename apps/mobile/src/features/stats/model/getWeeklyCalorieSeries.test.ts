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

/** Fixed "today": 2026-07-16 local midnight */
const TODAY = new Date(2026, 6, 16, 0, 0, 0, 0);

describe('getWeeklyCalorieSeries', () => {
  it('returns exactly 7 zeros for empty meals, oldest → newest with today last', () => {
    const series = getWeeklyCalorieSeries([], TODAY);

    expect(series).toHaveLength(7);
    expect(series.every((p) => p.calories === 0)).toBe(true);
    expect(series[6].date.getFullYear()).toBe(2026);
    expect(series[6].date.getMonth()).toBe(6);
    expect(series[6].date.getDate()).toBe(16);
    expect(series[0].date.getDate()).toBe(10);
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

    const series = getWeeklyCalorieSeries(meals, TODAY);

    expect(series).toHaveLength(7);
    expect(series[6].calories).toBe(750);
    expect(series.slice(0, 6).every((p) => p.calories === 0)).toBe(true);
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

    const series = getWeeklyCalorieSeries(meals, TODAY);

    // Jul 15 is yesterday = index 5
    expect(series[5].calories).toBe(300);
  });

  it('ignores meals outside the 7-day window', () => {
    const meals = [
      makeMeal({
        id: 'too-old',
        timestamp: localIso(2026, 7, 9),
        totalCalories: 500,
      }),
      makeMeal({
        id: 'in-window',
        timestamp: localIso(2026, 7, 10),
        totalCalories: 120,
      }),
      makeMeal({
        id: 'future',
        timestamp: localIso(2026, 7, 17),
        totalCalories: 400,
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, TODAY);

    expect(series[0].calories).toBe(120); // Jul 10
    expect(series.every((p, i) => (i === 0 ? p.calories === 120 : p.calories === 0))).toBe(
      true,
    );
  });

  it('keeps stable length 7 with today as last point', () => {
    const meals = [
      makeMeal({
        id: 'd1',
        timestamp: localIso(2026, 7, 12),
        totalCalories: 50,
      }),
      makeMeal({
        id: 'd2',
        timestamp: localIso(2026, 7, 14),
        totalCalories: 80,
      }),
    ];

    const series = getWeeklyCalorieSeries(meals, TODAY);

    expect(series).toHaveLength(7);
    expect(series.map((p) => p.date.getDate())).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(series.map((p) => p.calories)).toEqual([0, 0, 50, 0, 80, 0, 0]);
  });
});
