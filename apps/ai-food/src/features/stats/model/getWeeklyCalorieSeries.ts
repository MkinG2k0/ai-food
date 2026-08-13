import type { Meal } from '@ai-food/shared-types';
import { getWeekStart, isSameDay } from '@/shared/lib';
import { isReadyMeal, sumMealMacros } from './readyMeals';

export interface DailyCaloriePoint {
  date: Date;
  /** Inclusive end when this point is a multi-day bucket (month weeks). */
  endDate?: Date;
  /** Sum of meal.totalCalories for the day, or daily average for a bucket. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const KCAL_PER_G = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

/** Energy contribution of logged macros (Atwater factors). */
export function macroCalories(point: Pick<DailyCaloriePoint, 'protein' | 'carbs' | 'fat'>): {
  carbs: number;
  fat: number;
  protein: number;
  total: number;
} {
  const carbs = point.carbs * KCAL_PER_G.carbs;
  const fat = point.fat * KCAL_PER_G.fat;
  const protein = point.protein * KCAL_PER_G.protein;
  return { carbs, fat, protein, total: carbs + fat + protein };
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

export function getCaloriePointsForDays(
  meals: Meal[],
  days: Date[],
): DailyCaloriePoint[] {
  const readyMeals = meals.filter(isReadyMeal);

  return days.map((day) => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const meal of readyMeals) {
      if (!isSameDay(new Date(meal.timestamp), day)) continue;
      calories += meal.totalCalories;
      const macros = sumMealMacros(meal);
      protein += macros.protein;
      carbs += macros.carbs;
      fat += macros.fat;
    }

    return { date: day, calories, protein, carbs, fat };
  });
}

/**
 * Calendar week Mon→Sun for `weekOffset` relative to `referenceDate`
 * (`0` = week containing referenceDate). Same offset model as home WeekStrip.
 * Only ready meals (status omitted or 'ready') contribute calories/macros.
 */
export function getWeeklyCalorieSeries(
  meals: Meal[],
  weekOffset: number = 0,
  referenceDate: Date = new Date(),
): DailyCaloriePoint[] {
  return getCaloriePointsForDays(meals, weekDaysFor(referenceDate, weekOffset));
}
