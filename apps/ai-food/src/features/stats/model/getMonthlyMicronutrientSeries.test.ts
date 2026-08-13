import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { weekHasMicronutrientData } from './getWeeklyMicronutrientSeries';
import { getMonthlyMicronutrientSeries } from './getMonthlyMicronutrientSeries';

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

describe('getMonthlyMicronutrientSeries', () => {
  it('divides totals by distinct days with ready meals', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 8, 4),
        totalCalories: 200,
        micronutrients: [{ id: 'vitaminC', amount: 70, unit: 'mg' }],
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 8, 10),
        totalCalories: 300,
        micronutrients: [{ id: 'vitaminC', amount: 30, unit: 'mg' }],
      }),
      makeMeal({
        id: 'same-day',
        timestamp: localIso(2026, 8, 10, 18),
        totalCalories: 100,
        micronutrients: [{ id: 'vitaminC', amount: 10, unit: 'mg' }],
      }),
    ];

    const series = getMonthlyMicronutrientSeries(meals, 0, TODAY);
    const vitaminC = series.find((p) => p.id === 'vitaminC');
    expect(vitaminC?.dailyAvg).toBeCloseTo((70 + 30 + 10) / 2, 5);
    expect(weekHasMicronutrientData(series)).toBe(true);
  });

  it('ignores meals after today in the current month', () => {
    const meals = [
      makeMeal({
        id: 'future',
        timestamp: localIso(2026, 8, 20),
        totalCalories: 200,
        micronutrients: [{ id: 'iron', amount: 20, unit: 'mg' }],
      }),
    ];

    const series = getMonthlyMicronutrientSeries(meals, 0, TODAY);
    const iron = series.find((p) => p.id === 'iron');
    expect(iron?.dailyAvg).toBe(0);
    expect(weekHasMicronutrientData(series)).toBe(false);
  });
});
