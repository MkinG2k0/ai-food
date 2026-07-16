import type { Meal, MicronutrientId, MicronutrientLevel } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';
import { getWeekStart, isSameDay } from '@/shared/lib';

export interface MicronutrientWeekPoint {
  id: MicronutrientId;
  high: number;
  medium: number;
  low: number;
}

export function micronutrientWeekTotal(point: MicronutrientWeekPoint): number {
  return point.high + point.medium + point.low;
}

function weekDaysFor(referenceDate: Date, weekOffset: number): Date[] {
  const monday = getWeekStart(referenceDate);
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    day.setHours(0, 0, 0, 0);
    return day;
  });
}

function emptyCounts(): Record<MicronutrientId, MicronutrientWeekPoint> {
  return Object.fromEntries(
    MICRONUTRIENT_IDS.map((id) => [id, { id, high: 0, medium: 0, low: 0 }]),
  ) as Record<MicronutrientId, MicronutrientWeekPoint>;
}

/**
 * Aggregates qualitative micronutrient levels across ready meals in the
 * Mon→Sun week for `weekOffset` (same model as calorie chart).
 * `none` levels are ignored. Meals without micronutrients contribute nothing.
 */
export function getWeeklyMicronutrientSeries(
  meals: Meal[],
  weekOffset: number = 0,
  referenceDate: Date = new Date(),
): MicronutrientWeekPoint[] {
  const days = weekDaysFor(referenceDate, weekOffset);
  const readyMeals = meals.filter((m) => (m.status ?? 'ready') === 'ready');
  const counts = emptyCounts();

  for (const meal of readyMeals) {
    const mealDay = new Date(meal.timestamp);
    if (!days.some((day) => isSameDay(mealDay, day))) continue;
    if (!meal.micronutrients?.length) continue;

    for (const row of meal.micronutrients) {
      const level = row.level as MicronutrientLevel;
      if (level === 'none') continue;
      if (!(row.id in counts)) continue;
      counts[row.id][level] += 1;
    }
  }

  return MICRONUTRIENT_IDS.map((id) => counts[id]);
}

export function weekHasMicronutrientData(series: MicronutrientWeekPoint[]): boolean {
  return series.some((p) => micronutrientWeekTotal(p) > 0);
}
