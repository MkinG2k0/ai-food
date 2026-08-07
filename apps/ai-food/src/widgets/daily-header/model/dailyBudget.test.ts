import { describe, expect, it } from 'vitest';
import {
  dailyBudgetNumbers,
  groupMealsByPeriod,
  mealPeriodFromTimestamp,
  topMealsByCalories,
} from './dailyBudget';

describe('mealPeriodFromTimestamp', () => {
  it('maps hours to breakfast / lunch / dinner / snack', () => {
    expect(mealPeriodFromTimestamp('2026-08-07T05:00:00')).toBe('breakfast');
    expect(mealPeriodFromTimestamp('2026-08-07T10:59:00')).toBe('breakfast');
    expect(mealPeriodFromTimestamp('2026-08-07T11:00:00')).toBe('lunch');
    expect(mealPeriodFromTimestamp('2026-08-07T15:30:00')).toBe('lunch');
    expect(mealPeriodFromTimestamp('2026-08-07T16:00:00')).toBe('dinner');
    expect(mealPeriodFromTimestamp('2026-08-07T21:59:00')).toBe('dinner');
    expect(mealPeriodFromTimestamp('2026-08-07T22:00:00')).toBe('snack');
    expect(mealPeriodFromTimestamp('2026-08-07T03:00:00')).toBe('snack');
  });
});

describe('groupMealsByPeriod', () => {
  it('sums kcal and counts per period in fixed order', () => {
    const buckets = groupMealsByPeriod([
      { timestamp: '2026-08-07T08:00:00', totalCalories: 300 },
      { timestamp: '2026-08-07T08:30:00', totalCalories: 100 },
      { timestamp: '2026-08-07T13:00:00', totalCalories: 600 },
      { timestamp: '2026-08-07T23:00:00', totalCalories: 150 },
    ]);

    expect(buckets.map((b) => b.id)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ]);
    expect(buckets[0]).toMatchObject({
      label: 'Завтрак',
      kcal: 400,
      mealCount: 2,
    });
    expect(buckets[1]).toMatchObject({ kcal: 600, mealCount: 1 });
    expect(buckets[2]).toMatchObject({ kcal: 0, mealCount: 0 });
    expect(buckets[3]).toMatchObject({
      label: 'Перекус',
      kcal: 150,
      mealCount: 1,
    });
  });
});

describe('topMealsByCalories', () => {
  it('returns up to limit meals sorted by kcal desc', () => {
    const top = topMealsByCalories(
      [
        { id: 'a', totalCalories: 200 },
        { id: 'b', totalCalories: 500 },
        { id: 'c', totalCalories: 350 },
        { id: 'd', totalCalories: 100 },
      ],
      3,
    );
    expect(top.map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('dailyBudgetNumbers', () => {
  it('computes remaining and progress under goal', () => {
    expect(dailyBudgetNumbers(400.4, 2000)).toEqual({
      consumed: 400,
      goal: 2000,
      remaining: 1600,
      overBy: 0,
      progressPct: 20,
      overGoal: false,
    });
  });

  it('computes overage when above goal', () => {
    expect(dailyBudgetNumbers(2100, 2000)).toEqual({
      consumed: 2100,
      goal: 2000,
      remaining: 0,
      overBy: 100,
      progressPct: 100,
      overGoal: true,
    });
  });
});
