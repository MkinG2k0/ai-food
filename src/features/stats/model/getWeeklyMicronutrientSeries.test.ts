import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  getWeeklyMicronutrientSeries,
  micronutrientWeekTotal,
  weekHasMicronutrientData,
} from './getWeeklyMicronutrientSeries';

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

describe('getWeeklyMicronutrientSeries', () => {
  it('returns all eight nutrients with zero dailyAvg when empty', () => {
    const series = getWeeklyMicronutrientSeries([], 0, TODAY);
    expect(series).toHaveLength(8);
    expect(series.every((p) => micronutrientWeekTotal(p) === 0)).toBe(true);
    expect(weekHasMicronutrientData(series)).toBe(false);
    expect(series.every((p) => p.unit === 'mg' || p.unit === 'µg')).toBe(true);
  });

  it('sums amounts from ready meals and returns dailyAvg = sum/7', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 7, 16, 9),
        totalCalories: 200,
        micronutrients: [
          { id: 'vitaminC', amount: 70, unit: 'mg' },
          { id: 'iron', amount: 3, unit: 'mg' },
          { id: 'vitaminD', amount: 0, unit: 'µg' },
        ],
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 7, 17, 12),
        totalCalories: 300,
        micronutrients: [
          { id: 'vitaminC', amount: 35, unit: 'mg' },
          { id: 'iron', amount: 4, unit: 'mg' },
        ],
      }),
      makeMeal({
        id: 'out',
        timestamp: localIso(2026, 7, 6, 12),
        totalCalories: 100,
        micronutrients: [{ id: 'vitaminC', amount: 100, unit: 'mg' }],
      }),
      makeMeal({
        id: 'analyzing',
        timestamp: localIso(2026, 7, 16, 15),
        totalCalories: 0,
        status: 'analyzing',
        micronutrients: [{ id: 'calcium', amount: 200, unit: 'mg' }],
      }),
      makeMeal({
        id: 'legacy',
        timestamp: localIso(2026, 7, 16, 18),
        totalCalories: 50,
        micronutrients: [{ id: 'magnesium', level: 'high' } as never],
      }),
    ];

    const series = getWeeklyMicronutrientSeries(meals, 0, TODAY);
    const byId = Object.fromEntries(series.map((p) => [p.id, p]));

    expect(byId.vitaminC.dailyAvg).toBeCloseTo((70 + 35) / 7, 5);
    expect(byId.vitaminC.unit).toBe('mg');
    expect(byId.iron.dailyAvg).toBeCloseTo((3 + 4) / 7, 5);
    expect(byId.vitaminD.dailyAvg).toBe(0);
    expect(byId.calcium.dailyAvg).toBe(0);
    expect(byId.magnesium.dailyAvg).toBe(0);
    expect(weekHasMicronutrientData(series)).toBe(true);
  });
});
