import type {
  Meal,
  MicronutrientId,
  MicronutrientUnit,
} from '@ai-food/shared-types';
import { isReadyMeal } from './readyMeals';

export interface MealWithMicronutrient {
  meal: Meal;
  amount: number;
  unit: MicronutrientUnit;
}

/** Look back window for «последние блюда» in micronutrient detail. */
export const RECENT_MICRONUTRIENT_MEALS_DAYS = 31;

/**
 * Latest ready meals (within the last ~month) that include a positive
 * estimate for the given micronutrient.
 */
export function getRecentMealsWithMicronutrient(
  meals: Meal[],
  id: MicronutrientId,
  limit = 3,
  now: Date = new Date(),
): MealWithMicronutrient[] {
  const cutoffMs =
    now.getTime() - RECENT_MICRONUTRIENT_MEALS_DAYS * 24 * 60 * 60 * 1000;
  const matched: MealWithMicronutrient[] = [];

  for (const meal of meals) {
    if (!isReadyMeal(meal)) continue;
    const ts = new Date(meal.timestamp).getTime();
    if (!Number.isFinite(ts) || ts < cutoffMs) continue;
    const row = meal.micronutrients?.find(
      (m) =>
        m.id === id &&
        typeof m.amount === 'number' &&
        Number.isFinite(m.amount) &&
        m.amount > 0,
    );
    if (!row) continue;
    matched.push({ meal, amount: row.amount, unit: row.unit });
  }

  matched.sort(
    (a, b) =>
      new Date(b.meal.timestamp).getTime() - new Date(a.meal.timestamp).getTime(),
  );

  return matched.slice(0, Math.max(0, limit));
}
