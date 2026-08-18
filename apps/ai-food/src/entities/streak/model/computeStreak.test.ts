import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  applyStreakState,
  CALORIE_STREAK_TOLERANCE,
  EMPTY_CALORIE_STREAK_PERSIST,
  EMPTY_STREAK_PERSIST,
  isCalorieGoalHit,
  localDateKey,
  streakDaysLabel,
} from './computeStreak';

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

describe('localDateKey', () => {
  it('uses local calendar date, not UTC slice', () => {
    const localEarly = new Date(2026, 7, 18, 1, 0, 0, 0);
    expect(localDateKey(localEarly)).toBe('2026-08-18');
    expect(localEarly.toISOString().slice(0, 10)).toBe('2026-08-17');
  });
});

describe('streakDaysLabel', () => {
  it('pluralizes Russian day labels', () => {
    expect(streakDaysLabel(1)).toBe('день');
    expect(streakDaysLabel(2)).toBe('дня');
    expect(streakDaysLabel(5)).toBe('дней');
    expect(streakDaysLabel(21)).toBe('день');
    expect(streakDaysLabel(22)).toBe('дня');
  });
});

describe('applyStreakState', () => {
  it('counts ready meal today as streak length 1 and celebrates once', () => {
    const now = localNoon(2026, 8, 18);
    const meals = [mealOn(now)];
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);

    expect(result.snapshot.currentLength).toBe(1);
    expect(result.snapshot.todayCounted).toBe(true);
    expect(result.snapshot.shouldCelebrate).toBe(true);
    expect(result.snapshot.nextMilestone).toBe(3);
    expect(result.snapshot.remainingDays).toBe(2);
  });

  it('ignores analyzing and error meals', () => {
    const now = localNoon(2026, 8, 18);
    const meals = [
      mealOn(now, 'analyzing'),
      mealOn(now, 'error'),
    ];
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);
    expect(result.snapshot.currentLength).toBe(0);
    expect(result.snapshot.todayCounted).toBe(false);
  });

  it('treats omitted status as ready', () => {
    const now = localNoon(2026, 8, 18);
    const meal = mealOn(now);
    delete meal.status;
    const result = applyStreakState([meal], EMPTY_STREAK_PERSIST, now);
    expect(result.snapshot.currentLength).toBe(1);
  });

  it('fills only Monday in the current week row when now is Wednesday', () => {
    const now = localNoon(2026, 8, 19);
    const monday = localNoon(2026, 8, 17);
    const meals = [mealOn(monday)];
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);

    expect(result.snapshot.weekDays[0]?.filled).toBe(true);
    expect(result.snapshot.weekDays.slice(1).every((day) => !day.filled)).toBe(
      true,
    );
  });

  it('shows next milestone 3 from length 1 and 100 achieved at length 100', () => {
    const now = localNoon(2026, 8, 18);
    const oneDay = applyStreakState([mealOn(now)], EMPTY_STREAK_PERSIST, now);
    expect(oneDay.snapshot.nextMilestone).toBe(3);
    expect(oneDay.snapshot.remainingDays).toBe(2);

    const meals = Array.from({ length: 100 }, (_, index) =>
      mealOn(localNoon(2026, 8, 18 - index)),
    );
    const hundred = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);
    expect(hundred.snapshot.currentLength).toBe(100);
    expect(hundred.snapshot.nextMilestone).toBeNull();
    expect(hundred.snapshot.achieved100).toBe(true);
  });

  it('grants one freeze the first time streak reaches 7', () => {
    const now = localNoon(2026, 8, 18);
    const meals = Array.from({ length: 7 }, (_, index) =>
      mealOn(localNoon(2026, 8, 18 - index)),
    );

    const first = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);
    expect(first.persistPatch.freezeCount).toBe(1);
    expect(first.persistPatch.grantedMilestones).toEqual([7]);

    const persist = {
      ...EMPTY_STREAK_PERSIST,
      freezeCount: 1,
      grantedMilestones: [7],
    };
    const again = applyStreakState(meals, persist, now);
    expect(again.persistPatch.freezeCount).toBeUndefined();
  });

  it('consumes one freeze to bridge a single missed day', () => {
    const now = localNoon(2026, 8, 17);
    const friday = localNoon(2026, 8, 14);
    const sunday = localNoon(2026, 8, 16);
    const meals = [mealOn(friday), mealOn(sunday)];

    const result = applyStreakState(
      meals,
      { ...EMPTY_STREAK_PERSIST, freezeCount: 1 },
      now,
    );

    expect(result.snapshot.currentLength).toBe(3);
    expect(result.persistPatch.consumedFreezeDateKeys).toEqual(['2026-08-15']);
    expect(result.persistPatch.freezeCount).toBe(0);
  });

  it('does not consume freeze across two consecutive missed days', () => {
    const now = localNoon(2026, 8, 17);
    const thursday = localNoon(2026, 8, 13);
    const sunday = localNoon(2026, 8, 16);
    const meals = [mealOn(thursday), mealOn(sunday)];

    const result = applyStreakState(
      meals,
      { ...EMPTY_STREAK_PERSIST, freezeCount: 1 },
      now,
    );

    expect(result.snapshot.currentLength).toBe(1);
    expect(result.persistPatch.consumedFreezeDateKeys).toBeUndefined();
  });

  it('does not consume yesterday while today is still uncounted', () => {
    const now = localNoon(2026, 8, 18);
    const result = applyStreakState(
      [],
      { ...EMPTY_STREAK_PERSIST, freezeCount: 1 },
      now,
    );

    expect(result.snapshot.shouldCelebrate).toBe(false);
    expect(result.snapshot.currentLength).toBe(0);
    expect(result.persistPatch.consumedFreezeDateKeys).toBeUndefined();
  });

  it('does not celebrate again after lastCelebratedLocalDate is set', () => {
    const now = localNoon(2026, 8, 18);
    const meals = [mealOn(now)];
    const persist = {
      ...EMPTY_STREAK_PERSIST,
      lastCelebratedLocalDate: localDateKey(now),
    };
    const result = applyStreakState(meals, persist, now);
    expect(result.snapshot.shouldCelebrate).toBe(false);
  });

  it('tracks best streak as personal record', () => {
    const now = localNoon(2026, 8, 18);
    const meals = Array.from({ length: 4 }, (_, index) =>
      mealOn(localNoon(2026, 8, 18 - index)),
    );
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);
    expect(result.snapshot.bestStreak).toBe(4);
    expect(result.persistPatch.currentLength).toBe(4);
    expect(result.snapshot.personalBestLabel).toBe('Личный рекорд');
  });

  it('persists currentLength when streak breaks to zero', () => {
    const now = localNoon(2026, 8, 18);
    const oldMeal = mealOn(localNoon(2026, 7, 1));
    const result = applyStreakState(
      [oldMeal],
      { ...EMPTY_STREAK_PERSIST, currentLength: 7, bestStreak: 7 },
      now,
    );
    expect(result.snapshot.currentLength).toBe(0);
    expect(result.persistPatch.currentLength).toBe(0);
  });
});

describe('CALORIE_STREAK_TOLERANCE', () => {
  it('is 0.20', () => {
    expect(CALORIE_STREAK_TOLERANCE).toBe(0.2);
  });
});

describe('isCalorieGoalHit', () => {
  it('applies D-03 bounds for G=2000', () => {
    expect(isCalorieGoalHit(1820, 2000, 'gain')).toBe(true);
    expect(isCalorieGoalHit(2500, 2000, 'gain')).toBe(true);
    expect(isCalorieGoalHit(1500, 2000, 'gain')).toBe(false);

    expect(isCalorieGoalHit(1820, 2000, 'maintain')).toBe(true);
    expect(isCalorieGoalHit(2500, 2000, 'maintain')).toBe(false);
    expect(isCalorieGoalHit(1500, 2000, 'maintain')).toBe(false);

    expect(isCalorieGoalHit(2200, 2000, 'lose')).toBe(true);
    expect(isCalorieGoalHit(2400, 2000, 'lose')).toBe(true);
    expect(isCalorieGoalHit(2401, 2000, 'lose')).toBe(false);
    expect(isCalorieGoalHit(100, 2000, 'lose')).toBe(true);
  });
});

describe('applyStreakState calorie track', () => {
  const yesterday = localNoon(2026, 8, 17);
  const now = localNoon(2026, 8, 18);

  function calorieResult(
    kcal: number,
    goal: 'lose' | 'maintain' | 'gain',
    extras: {
      persist?: typeof EMPTY_STREAK_PERSIST;
      meals?: Meal[];
      at?: Date;
    } = {},
  ) {
    const at = extras.at ?? now;
    const meals = extras.meals ?? [mealOn(yesterday, 'ready', kcal)];
    return applyStreakState(meals, extras.persist ?? EMPTY_STREAK_PERSIST, at, {
      goal,
      kcalTarget: 2000,
    });
  }

  it('counts gain hits at 1820 and 2500 yesterday and misses 1500', () => {
    expect(calorieResult(1820, 'gain').snapshot.calorie.currentLength).toBe(1);
    expect(calorieResult(2500, 'gain').snapshot.calorie.currentLength).toBe(1);
    expect(calorieResult(1500, 'gain').snapshot.calorie.currentLength).toBe(0);
  });

  it('counts maintain hits at 1820 yesterday and misses 2500 and 1500', () => {
    expect(calorieResult(1820, 'maintain').snapshot.calorie.currentLength).toBe(1);
    expect(calorieResult(2500, 'maintain').snapshot.calorie.currentLength).toBe(0);
    expect(calorieResult(1500, 'maintain').snapshot.calorie.currentLength).toBe(0);
  });

  it('counts lose hits at 2200 and 100 yesterday and misses 2401', () => {
    expect(calorieResult(2200, 'lose').snapshot.calorie.currentLength).toBe(1);
    expect(calorieResult(100, 'lose').snapshot.calorie.currentLength).toBe(1);
    expect(calorieResult(2401, 'lose').snapshot.calorie.currentLength).toBe(0);
  });

  it('never hits a day with no ready meal, including analyzing-only and lose 0 kcal', () => {
    const empty = applyStreakState([], EMPTY_STREAK_PERSIST, now, {
      goal: 'lose',
      kcalTarget: 2000,
    });
    expect(empty.snapshot.calorie.currentLength).toBe(0);

    const analyzing = applyStreakState(
      [mealOn(yesterday, 'analyzing', 1800)],
      EMPTY_STREAK_PERSIST,
      now,
      { goal: 'lose', kcalTarget: 2000 },
    );
    expect(analyzing.snapshot.calorie.currentLength).toBe(0);

    const zeroKcal = applyStreakState(
      [mealOn(yesterday, 'ready', 0)],
      EMPTY_STREAK_PERSIST,
      now,
      { goal: 'lose', kcalTarget: 2000 },
    );
    expect(zeroKcal.snapshot.calorie.currentLength).toBe(0);
  });

  it('excludes today from calorie length while logging still counts today', () => {
    const today = localNoon(2026, 8, 19);
    const meals = [
      mealOn(localNoon(2026, 8, 18), 'ready', 2000),
      mealOn(today, 'ready', 2000),
    ];
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, today, {
      goal: 'maintain',
      kcalTarget: 2000,
    });

    expect(result.snapshot.currentLength).toBe(2);
    expect(result.snapshot.todayCounted).toBe(true);
    expect(result.snapshot.calorie.currentLength).toBe(1);
    expect(result.snapshot.calorie.todayCounted).toBe(false);

    const todayKey = localDateKey(today);
    const calorieToday = result.snapshot.calorie.weekDays.find(
      (day) => localDateKey(day.date) === todayKey,
    );
    const loggingToday = result.snapshot.weekDays.find(
      (day) => localDateKey(day.date) === todayKey,
    );
    expect(calorieToday?.filled).toBe(false);
    expect(loggingToday?.filled).toBe(true);
  });

  it('grants a calorie freeze at 7 without changing logging freezeCount', () => {
    const meals = Array.from({ length: 7 }, (_, index) =>
      mealOn(localNoon(2026, 8, 17 - index), 'ready', 2000),
    );
    const persist = {
      ...EMPTY_STREAK_PERSIST,
      freezeCount: 1,
      grantedMilestones: [7],
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
    };
    const result = applyStreakState(meals, persist, now, {
      goal: 'maintain',
      kcalTarget: 2000,
    });

    expect(result.snapshot.calorie.currentLength).toBe(7);
    expect(result.persistPatch.calorieStreak?.freezeCount).toBe(1);
    expect(result.persistPatch.calorieStreak?.grantedMilestones).toEqual([7]);
    expect(result.persistPatch.freezeCount).toBeUndefined();
    expect(result.snapshot.freezeCount).toBe(1);
  });

  it('consumes Saturday from the calorie freeze pool only', () => {
    const monday = localNoon(2026, 8, 17);
    const meals = [
      mealOn(localNoon(2026, 8, 14), 'ready', 2000),
      mealOn(localNoon(2026, 8, 16), 'ready', 2000),
    ];
    const persist = {
      ...EMPTY_STREAK_PERSIST,
      freezeCount: 0,
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST, freezeCount: 1 },
    };
    const result = applyStreakState(meals, persist, monday, {
      goal: 'maintain',
      kcalTarget: 2000,
    });

    expect(result.snapshot.calorie.currentLength).toBe(3);
    expect(result.persistPatch.calorieStreak?.consumedFreezeDateKeys).toEqual([
      '2026-08-15',
    ]);
    expect(result.persistPatch.consumedFreezeDateKeys).toBeUndefined();
  });

  it('does not consume a calorie freeze across two consecutive misses', () => {
    const monday = localNoon(2026, 8, 17);
    const meals = [
      mealOn(localNoon(2026, 8, 13), 'ready', 2000),
      mealOn(localNoon(2026, 8, 16), 'ready', 2000),
    ];
    const persist = {
      ...EMPTY_STREAK_PERSIST,
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST, freezeCount: 1 },
    };
    const result = applyStreakState(meals, persist, monday, {
      goal: 'maintain',
      kcalTarget: 2000,
    });

    expect(result.snapshot.calorie.currentLength).toBe(1);
    expect(result.snapshot.calorie.freezeCount).toBe(1);
    expect(result.persistPatch.calorieStreak?.consumedFreezeDateKeys ?? []).toEqual(
      [],
    );
  });

  it('returns empty calorie length when CalorieStreakInput is missing', () => {
    const meals = [mealOn(yesterday, 'ready', 2000)];
    const result = applyStreakState(meals, EMPTY_STREAK_PERSIST, now);
    expect(result.snapshot.calorie.currentLength).toBe(0);
  });
});
