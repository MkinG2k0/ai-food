import type { DailyTargets, Meal } from '@ai-food/shared-types';
import { getWeeklyCalorieSeries } from '@/features/stats';

const FALLBACK_GOAL_KCAL = 2000;

export interface WeekKcalWidgetDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Lean week series for Android weekly calorie chart widget (D-07). */
export interface WeekKcalWidgetSnapshot {
  weekStart: string;
  goalKcal: number;
  days: WeekKcalWidgetDay[];
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Current calendar week Mon→Sun snapshot from diary meals + goal.
 * Native widget reimplements chart scale from this lean JSON (D-09).
 */
export function buildWeekKcalWidgetSnapshot(
  meals: Meal[],
  targets: DailyTargets | null | undefined,
  now: Date = new Date(),
): WeekKcalWidgetSnapshot {
  const series = getWeeklyCalorieSeries(meals, 0, now);
  const days: WeekKcalWidgetDay[] = series.map((point) => ({
    date: formatLocalDate(point.date),
    calories: point.calories,
    protein: point.protein,
    carbs: point.carbs,
    fat: point.fat,
  }));

  return {
    weekStart: days[0]?.date ?? formatLocalDate(now),
    goalKcal: targets?.kcal ?? FALLBACK_GOAL_KCAL,
    days,
  };
}
