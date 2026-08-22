import type { Meal, MicronutrientId } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import { isSameDay } from '@/shared/lib';
import { isReadyMeal } from './readyMeals';
import { monthElapsedDays, monthStartFor } from './monthPeriod';
import type { MicronutrientWeekPoint } from './getWeeklyMicronutrientSeries';

function emptySums(): Record<MicronutrientId, number> {
  return Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, 0])) as Record<
    MicronutrientId,
    number
  >;
}

function emptySeen(): Record<MicronutrientId, boolean> {
  return Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, false])) as Record<
    MicronutrientId,
    boolean
  >;
}

/**
 * Sums micronutrients across ready meals in the elapsed month, then
 * dailyAvg = sum / distinct days with a ready meal (logged-only).
 */
export function getMonthlyMicronutrientSeries(
  meals: Meal[],
  monthOffset: number = 0,
  referenceDate: Date = new Date(),
): MicronutrientWeekPoint[] {
  const monthStart = monthStartFor(referenceDate, monthOffset);
  const days = monthElapsedDays(monthStart, referenceDate);
  const readyMeals = meals.filter(isReadyMeal);
  const sums = emptySums();
  const seen = emptySeen();
  const loggedDayKeys = new Set<string>();

  for (const meal of readyMeals) {
    const mealDay = new Date(meal.timestamp);
    if (!days.some((day) => isSameDay(mealDay, day))) continue;
    loggedDayKeys.add(mealDay.toDateString());
    if (!meal.micronutrients?.length) continue;

    for (const row of meal.micronutrients) {
      if (!(row.id in sums)) continue;
      const amount = (row as { amount?: number }).amount;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
        continue;
      }
      sums[row.id] += amount;
      seen[row.id] = true;
    }
  }

  const loggedDays = loggedDayKeys.size;
  const divisor = loggedDays > 0 ? loggedDays : 1;

  return MICRONUTRIENT_IDS.map((id) => ({
    id,
    dailyAvg: loggedDays === 0 ? 0 : sums[id] / divisor,
    unit: MICRONUTRIENT_UNITS[id],
    hasData: seen[id],
  }));
}
