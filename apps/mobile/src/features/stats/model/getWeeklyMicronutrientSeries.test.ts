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
  it('returns all eight nutrients with zero counts when empty', () => {
    const series = getWeeklyMicronutrientSeries([], 0, TODAY);
    expect(series).toHaveLength(8);
    expect(series.every((p) => micronutrientWeekTotal(p) === 0)).toBe(true);
    expect(weekHasMicronutrientData(series)).toBe(false);
  });

  it('aggregates levels from ready meals in the week', () => {
    const meals = [
      makeMeal({
        id: 'a',
        timestamp: localIso(2026, 7, 16, 9),
        totalCalories: 200,
        micronutrients: [
          { id: 'vitaminC', level: 'high' },
          { id: 'iron', level: 'medium' },
          { id: 'vitaminD', level: 'none' },
        ],
      }),
      makeMeal({
        id: 'b',
        timestamp: localIso(2026, 7, 17, 12),
        totalCalories: 300,
        micronutrients: [
          { id: 'vitaminC', level: 'medium' },
          { id: 'iron', level: 'high' },
        ],
      }),
      makeMeal({
        id: 'out',
        timestamp: localIso(2026, 7, 6, 12),
        totalCalories: 100,
        micronutrients: [{ id: 'vitaminC', level: 'high' }],
      }),
      makeMeal({
        id: 'analyzing',
        timestamp: localIso(2026, 7, 16, 15),
        totalCalories: 0,
        status: 'analyzing',
        micronutrients: [{ id: 'calcium', level: 'high' }],
      }),
    ];

    const series = getWeeklyMicronutrientSeries(meals, 0, TODAY);
    const byId = Object.fromEntries(series.map((p) => [p.id, p]));

    expect(byId.vitaminC).toEqual({ id: 'vitaminC', high: 1, medium: 1, low: 0 });
    expect(byId.iron).toEqual({ id: 'iron', high: 1, medium: 1, low: 0 });
    expect(byId.vitaminD).toEqual({ id: 'vitaminD', high: 0, medium: 0, low: 0 });
    expect(byId.calcium).toEqual({ id: 'calcium', high: 0, medium: 0, low: 0 });
    expect(weekHasMicronutrientData(series)).toBe(true);
  });
});
