import type { Meal } from '@ai-food/shared-types';

export type MealPeriodId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_PERIOD_LABELS: Record<MealPeriodId, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

const PERIOD_ORDER: MealPeriodId[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

/** Bucket meal by local clock hour (no explicit mealType on Meal). */
export function mealPeriodFromTimestamp(iso: string): MealPeriodId {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export interface MealPeriodBucket {
  id: MealPeriodId;
  label: string;
  kcal: number;
  mealCount: number;
}

export function groupMealsByPeriod(
  meals: Pick<Meal, 'timestamp' | 'totalCalories'>[],
): MealPeriodBucket[] {
  const totals: Record<MealPeriodId, { kcal: number; mealCount: number }> = {
    breakfast: { kcal: 0, mealCount: 0 },
    lunch: { kcal: 0, mealCount: 0 },
    dinner: { kcal: 0, mealCount: 0 },
    snack: { kcal: 0, mealCount: 0 },
  };

  for (const meal of meals) {
    const id = mealPeriodFromTimestamp(meal.timestamp);
    totals[id].kcal += meal.totalCalories;
    totals[id].mealCount += 1;
  }

  return PERIOD_ORDER.map((id) => ({
    id,
    label: MEAL_PERIOD_LABELS[id],
    kcal: Math.round(totals[id].kcal),
    mealCount: totals[id].mealCount,
  }));
}

/** Highest-calorie meals first; stable for equal kcal by keeping relative order. */
export function topMealsByCalories<T extends Pick<Meal, 'totalCalories'>>(
  meals: T[],
  limit = 3,
): T[] {
  return [...meals]
    .sort((a, b) => b.totalCalories - a.totalCalories)
    .slice(0, limit);
}

export interface DailyBudgetNumbers {
  consumed: number;
  goal: number;
  remaining: number;
  overBy: number;
  progressPct: number;
  overGoal: boolean;
}

export function dailyBudgetNumbers(
  consumedKcal: number,
  goalKcal: number,
): DailyBudgetNumbers {
  const consumed = Math.round(consumedKcal);
  const goal = Math.round(goalKcal);
  const remaining = Math.max(0, goal - consumed);
  const overBy = Math.max(0, consumed - goal);
  const progressPct =
    goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;

  return {
    consumed,
    goal,
    remaining,
    overBy,
    progressPct,
    overGoal: consumed > goal,
  };
}
