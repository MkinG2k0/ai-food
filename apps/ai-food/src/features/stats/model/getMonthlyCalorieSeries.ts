import type { Meal } from '@ai-food/shared-types';
import { averageLoggedCalories } from './chartScale';
import {
  getCaloriePointsForDays,
  type DailyCaloriePoint,
} from './getWeeklyCalorieSeries';
import {
  eachElapsedDay,
  getMonthWeekBuckets,
  monthElapsedDays,
  monthStartFor,
} from './monthPeriod';

export interface MonthlyCalorieSeries {
  monthStart: Date;
  weeks: DailyCaloriePoint[];
  /** Average over days with calories > 0 in the elapsed month. */
  dailyAverage: number | null;
}

function averageLoggedPoint(
  points: DailyCaloriePoint[],
  start: Date,
  end: Date,
): DailyCaloriePoint {
  const logged = points.filter((p) => p.calories > 0);
  if (logged.length === 0) {
    return { date: start, endDate: end, calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const n = logged.length;
  return {
    date: start,
    endDate: end,
    calories: logged.reduce((sum, p) => sum + p.calories, 0) / n,
    protein: logged.reduce((sum, p) => sum + p.protein, 0) / n,
    carbs: logged.reduce((sum, p) => sum + p.carbs, 0) / n,
    fat: logged.reduce((sum, p) => sum + p.fat, 0) / n,
  };
}

/**
 * Calendar month for `monthOffset` relative to `referenceDate`
 * (`0` = month containing referenceDate). Bars are 4–5 week chunks;
 * each bar is the daily average of logged days in that chunk.
 */
export function getMonthlyCalorieSeries(
  meals: Meal[],
  monthOffset: number = 0,
  referenceDate: Date = new Date(),
): MonthlyCalorieSeries {
  const monthStart = monthStartFor(referenceDate, monthOffset);
  const buckets = getMonthWeekBuckets(monthStart, referenceDate);
  const weeks = buckets.map((bucket) => {
    const days = eachElapsedDay(bucket.start, bucket.end, referenceDate);
    return averageLoggedPoint(
      getCaloriePointsForDays(meals, days),
      bucket.start,
      bucket.end,
    );
  });

  const elapsed = monthElapsedDays(monthStart, referenceDate);
  const dailyAverage = averageLoggedCalories(
    getCaloriePointsForDays(meals, elapsed),
  );

  return { monthStart, weeks, dailyAverage };
}

export function calorieBarRangeLabel(point: DailyCaloriePoint): string {
  const end = point.endDate ?? point.date;
  if (point.date.getDate() === end.getDate()) {
    return String(point.date.getDate());
  }
  return `${point.date.getDate()}–${end.getDate()}`;
}
