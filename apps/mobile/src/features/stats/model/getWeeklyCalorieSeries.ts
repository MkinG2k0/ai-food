import type { Meal } from '@ai-food/shared-types';
import { isSameDay } from '@/shared/lib';

export interface DailyCaloriePoint {
  date: Date;
  calories: number;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Rolling 7 local calendar days ending at `today` (oldest → newest).
 * Only ready meals (status omitted or 'ready') contribute totalCalories.
 */
export function getWeeklyCalorieSeries(
  meals: Meal[],
  today: Date = new Date(),
): DailyCaloriePoint[] {
  const end = startOfLocalDay(today);
  const readyMeals = meals.filter((m) => (m.status ?? 'ready') === 'ready');

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(end);
    day.setDate(end.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);

    const calories = readyMeals.reduce((sum, meal) => {
      if (!isSameDay(new Date(meal.timestamp), day)) return sum;
      return sum + meal.totalCalories;
    }, 0);

    return { date: day, calories };
  });
}
