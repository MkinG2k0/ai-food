import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { buildNutritionReportData } from './buildReportData';
import { rollingDaysEndingToday } from './reportPeriods';

function meal(partial: Partial<Meal> & Pick<Meal, 'id' | 'timestamp'>): Meal {
  return {
    items: [
      {
        id: 'i1',
        name: 'Тест',
        calories: 100,
        protein: 10,
        fat: 5,
        carbs: 8,
        grams: 100,
        fiber: 2,
      },
    ],
    totalCalories: 100,
    status: 'ready',
    ...partial,
  };
}

describe('buildNutritionReportData', () => {
  const period = rollingDaysEndingToday(new Date(2026, 7, 18), 7);

  it('averages macros across all days in period', () => {
    const data = buildNutritionReportData({
      period,
      meals: [
        meal({
          id: 'm1',
          timestamp: new Date(2026, 7, 17, 14, 0).toISOString(),
          totalCalories: 700,
          items: [
            {
              id: 'i1',
              name: 'Обед',
              calories: 700,
              protein: 20,
              fat: 30,
              carbs: 60,
              grams: 200,
              fiber: 6,
            },
          ],
        }),
      ],
      profile: {
        gender: 'male',
        age: 26,
        height: 173,
        weight: 63,
        targetWeight: 71,
        targetWeightDate: '2026-12-31',
        activity: 'medium',
        goal: 'gain',
        dietType: 'none',
      },
      targets: {
        kcal: 2063,
        protein: 155,
        fat: 46,
        carbs: 258,
        fiber: 29,
      },
      weightEntries: [{ id: 'w1', date: '2026-08-17', kg: 63.5 }],
      weightGoalKg: 71,
    });

    expect(data.summary.mealCount).toBe(1);
    expect(data.summary.dayCount).toBe(7);
    expect(data.summary.avgKcal).toBe(100);
    expect(data.days.find((d) => d.dateLabel.includes('17'))?.meals).toHaveLength(1);
    expect(data.days.filter((d) => d.meals.length === 0)).toHaveLength(6);
    expect(data.weight.deltaToGoal).toBe(7.5);
    expect(data.weight.currentKg).toBe(63.5);
    expect(data.weight.points).toEqual([
      { date: '2026-08-17', kg: 63.5 },
    ]);
  });

  it('plots onboarding start weight and a later logged entry', () => {
    const data = buildNutritionReportData({
      period,
      meals: [],
      profile: {
        gender: 'male',
        age: 26,
        height: 173,
        weight: 70,
        targetWeight: 80.5,
        targetWeightDate: '2026-09-15',
        planStartDate: '2026-08-17',
        planStartWeight: 70,
        activity: 'medium',
        goal: 'gain',
        dietType: 'none',
      },
      targets: null,
      weightEntries: [{ id: 'w2', date: '2026-08-18', kg: 72 }],
      weightGoalKg: 80.5,
    });

    expect(data.weight.currentKg).toBe(72);
    expect(data.weight.periodStartKg).toBe(70);
    expect(data.weight.periodEndKg).toBe(72);
    expect(data.weight.points).toEqual([
      { date: '2026-08-17', kg: 70 },
      { date: '2026-08-18', kg: 72 },
    ]);
  });
});
