import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { EMPTY_STREAK_PERSIST } from '@/entities/streak';
import {
  buildStreakWidgetSnapshot,
  calorieInputFromProfile,
} from './buildStreakWidgetSnapshot';

function mealOn(
  date: Date,
  status: Meal['status'] = 'ready',
  totalCalories = 100,
): Meal {
  return {
    id: crypto.randomUUID(),
    timestamp: date.toISOString(),
    items: [
      {
        id: 'item-1',
        name: 'Test',
        calories: totalCalories,
        protein: 10,
        carbs: 10,
        fat: 5,
        fiber: 2,
        grams: 100,
      },
    ],
    totalCalories,
    status,
  };
}

function localNoon(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

describe('calorieInputFromProfile', () => {
  it('accepts lose/maintain/gain with a positive kcal target', () => {
    expect(calorieInputFromProfile('lose', 1800)).toEqual({
      goal: 'lose',
      kcalTarget: 1800,
    });
  });

  it('rejects missing goal or non-positive target', () => {
    expect(calorieInputFromProfile(undefined, 1800)).toBeNull();
    expect(calorieInputFromProfile('lose', 0)).toBeNull();
  });
});

describe('buildStreakWidgetSnapshot', () => {
  it('counts a ready meal today and fills Monday of that week', () => {
    const now = localNoon(2026, 8, 17);
    const snapshot = buildStreakWidgetSnapshot(
      [mealOn(now)],
      EMPTY_STREAK_PERSIST,
      null,
      now,
    );

    expect(snapshot.loggingLength).toBe(1);
    expect(snapshot.calorieLength).toBe(0);
    expect(snapshot.loggingWeek).toHaveLength(7);
    expect(snapshot.calorieWeek).toHaveLength(7);
    expect(snapshot.loggingWeek[0]).toBe(true);
    expect(snapshot.loggingWeek.slice(1).every((filled) => !filled)).toBe(true);
  });

  it('fills calorie week when yesterday hit the lose-goal band', () => {
    const now = localNoon(2026, 8, 19);
    const yesterday = localNoon(2026, 8, 18);
    const snapshot = buildStreakWidgetSnapshot(
      [mealOn(yesterday, 'ready', 1700), mealOn(now, 'ready', 1700)],
      EMPTY_STREAK_PERSIST,
      { goal: 'lose', kcalTarget: 1800 },
      now,
    );

    expect(snapshot.loggingLength).toBe(2);
    expect(snapshot.calorieLength).toBe(1);
    expect(snapshot.calorieWeek[1]).toBe(true);
    expect(snapshot.calorieWeek[2]).toBe(false);
  });

  it('empty diary → zeros', () => {
    const now = localNoon(2026, 8, 19);
    const snapshot = buildStreakWidgetSnapshot(
      [],
      EMPTY_STREAK_PERSIST,
      null,
      now,
    );
    expect(snapshot.loggingLength).toBe(0);
    expect(snapshot.calorieLength).toBe(0);
    expect(snapshot.loggingWeek.every((filled) => !filled)).toBe(true);
    expect(snapshot.calorieWeek.every((filled) => !filled)).toBe(true);
  });
});
