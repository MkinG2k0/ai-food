import type { Meal, MicronutrientId, MicronutrientUnit } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import { getWeekStart, isSameDay } from '@/shared/lib';

export interface MicronutrientWeekPoint {
  id: MicronutrientId;
  /** Sum of portion amounts in the week divided by 7 */
  dailyAvg: number;
  unit: MicronutrientUnit;
}

export function micronutrientWeekTotal(point: MicronutrientWeekPoint): number {
  return point.dailyAvg;
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

function emptySums(): Record<MicronutrientId, number> {
  return Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, 0])) as Record<
    MicronutrientId,
    number
  >;
}

/**
 * Sums quantitative micronutrient amounts across ready meals in the
 * Mon→Sun week, then returns dailyAvg = sum / 7.
 * Legacy level-only rows (no finite amount) are ignored.
 */
export function getWeeklyMicronutrientSeries(
  meals: Meal[],
  weekOffset: number = 0,
  referenceDate: Date = new Date(),
): MicronutrientWeekPoint[] {
  const days = weekDaysFor(referenceDate, weekOffset);
  const readyMeals = meals.filter((m) => (m.status ?? 'ready') === 'ready');
  const sums = emptySums();

  for (const meal of readyMeals) {
    const mealDay = new Date(meal.timestamp);
    if (!days.some((day) => isSameDay(mealDay, day))) continue;
    if (!meal.micronutrients?.length) continue;

    for (const row of meal.micronutrients) {
      if (!(row.id in sums)) continue;
      const amount = (row as { amount?: number }).amount;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
        continue;
      }
      sums[row.id] += amount;
    }
  }

  return MICRONUTRIENT_IDS.map((id) => ({
    id,
    dailyAvg: sums[id] / 7,
    unit: MICRONUTRIENT_UNITS[id],
  }));
}

export function weekHasMicronutrientData(series: MicronutrientWeekPoint[]): boolean {
  return series.some((p) => p.dailyAvg > 0);
}
