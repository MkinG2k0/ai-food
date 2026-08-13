import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  calorieBarRangeLabel,
  getMonthlyCalorieSeries,
} from './getMonthlyCalorieSeries';

function localIso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h, 0, 0, 0).toISOString();
}

function makeMeal(
  partial: Partial<Meal> & Pick<Meal, 'id' | 'timestamp' | 'totalCalories'>,
): Meal {
  return {
    items: [],
    ...partial,
  };
}

/** Thursday 13 Aug 2026 */
const TODAY = new Date(2026, 7, 13, 12, 0, 0, 0);

describe('getMonthlyCalorieSeries', () => {
  it('returns 5 week buckets for August with the current week clipped', () => {
    const series = getMonthlyCalorieSeries([], 0, TODAY);
    expect(series.weeks).toHaveLength(5);
    expect(series.weeks.map((w) => calorieBarRangeLabel(w))).toEqual([
      '1–7',
      '8–13',
      '15–21',
      '22–28',
      '29–31',
    ]);
    expect(series.dailyAverage).toBeNull();
  });

  it('averages only logged days inside a week bucket', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 8, 10),
        totalCalories: 400,
        items: [
          {
            id: 'i1',
            name: 'oats',
            calories: 400,
            protein: 10,
            carbs: 60,
            fat: 8,
            fiber: 4,
            grams: 100,
          },
        ],
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 8, 12),
        totalCalories: 200,
        items: [
          {
            id: 'i2',
            name: 'egg',
            calories: 200,
            protein: 14,
            carbs: 2,
            fat: 14,
            fiber: 0,
            grams: 100,
          },
        ],
      }),
    ];

    const series = getMonthlyCalorieSeries(meals, 0, TODAY);
    const week2 = series.weeks[1];
    expect(week2.calories).toBe(300);
    expect(week2.protein).toBe(12);
    expect(week2.carbs).toBe(31);
    expect(week2.fat).toBe(11);
    expect(series.dailyAverage).toBe(300);
  });

  it('ignores future-dated meals in the current month', () => {
    const meals = [
      makeMeal({
        id: 'future',
        timestamp: localIso(2026, 8, 20),
        totalCalories: 900,
      }),
      makeMeal({
        id: 'past',
        timestamp: localIso(2026, 8, 5),
        totalCalories: 500,
      }),
    ];

    const series = getMonthlyCalorieSeries(meals, 0, TODAY);
    expect(series.weeks[0].calories).toBe(500);
    expect(series.weeks[2].calories).toBe(0);
    expect(series.dailyAverage).toBe(500);
  });

  it('shifts to the previous calendar month', () => {
    const meals = [
      makeMeal({
        id: 'july',
        timestamp: localIso(2026, 7, 16),
        totalCalories: 800,
      }),
    ];

    const series = getMonthlyCalorieSeries(meals, -1, TODAY);
    expect(series.monthStart.getMonth()).toBe(6);
    expect(series.weeks[2].calories).toBe(800);
    expect(series.dailyAverage).toBe(800);
  });
});
