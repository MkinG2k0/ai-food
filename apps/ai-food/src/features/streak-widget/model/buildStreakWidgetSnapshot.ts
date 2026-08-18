import type { Meal } from '@ai-food/shared-types';
import {
  applyStreakState,
  EMPTY_STREAK_PERSIST,
  type CalorieStreakInput,
  type StreakPersist,
} from '@/entities/streak';

/** Lean payload for Android streak AppWidgets (Preferences JSON). */
export interface StreakWidgetSnapshot {
  loggingLength: number;
  calorieLength: number;
  loggingWeek: boolean[];
  calorieWeek: boolean[];
}

export const STREAK_WIDGET_PREFS_KEY = 'ai-food-widget-streak';

export function calorieInputFromProfile(
  goal: string | undefined,
  kcalTarget: number | undefined,
): CalorieStreakInput | null {
  if (goal !== 'lose' && goal !== 'maintain' && goal !== 'gain') return null;
  if (kcalTarget == null || !Number.isFinite(kcalTarget) || kcalTarget <= 0) {
    return null;
  }
  return { goal, kcalTarget };
}

export function buildStreakWidgetSnapshot(
  meals: Meal[],
  persist: StreakPersist = EMPTY_STREAK_PERSIST,
  calorie: CalorieStreakInput | null = null,
  now: Date = new Date(),
): StreakWidgetSnapshot {
  const { snapshot } = applyStreakState(meals, persist, now, calorie);
  return {
    loggingLength: snapshot.currentLength,
    calorieLength: snapshot.calorie.currentLength,
    loggingWeek: snapshot.weekDays.map((day) => day.filled),
    calorieWeek: snapshot.calorie.weekDays.map((day) => day.filled),
  };
}
