import type { DailyTargets, Meal } from '@ai-food/shared-types';
import { isSameDay } from './dateUtils';

const FALLBACK_TARGETS = {
  kcal: 2000,
  protein: 150,
  fat: 70,
  carbs: 250,
} as const;

export interface DayKbjuMacros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface DayKbjuResult {
  consumed: DayKbjuMacros;
  goals: DayKbjuMacros;
  hasReadyMeals: boolean;
  /** Progress ratios clamped 0..1 for calendar rings. */
  progress: DayKbjuMacros;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Ready-meal totals for a calendar day vs profile/fallback goals.
 * Mirrors DailyHeader / computeTodayKbjuSnapshot aggregation.
 */
export function computeDayKbju(
  meals: Meal[],
  targets: DailyTargets | null | undefined,
  date: Date,
): DayKbjuResult {
  const dayMeals = meals.filter(
    (m) =>
      isSameDay(new Date(m.timestamp), date) &&
      (m.status ?? 'ready') === 'ready',
  );

  const consumed: DayKbjuMacros = {
    kcal: dayMeals.reduce((sum, m) => sum + m.totalCalories, 0),
    protein: dayMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.protein, 0),
      0,
    ),
    fat: dayMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.fat, 0),
      0,
    ),
    carbs: dayMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.carbs, 0),
      0,
    ),
  };

  const goals: DayKbjuMacros = {
    kcal: targets?.kcal ?? FALLBACK_TARGETS.kcal,
    protein: targets?.protein ?? FALLBACK_TARGETS.protein,
    fat: targets?.fat ?? FALLBACK_TARGETS.fat,
    carbs: targets?.carbs ?? FALLBACK_TARGETS.carbs,
  };

  return {
    consumed,
    goals,
    hasReadyMeals: dayMeals.length > 0,
    progress: {
      kcal: clamp01(goals.kcal > 0 ? consumed.kcal / goals.kcal : 0),
      protein: clamp01(goals.protein > 0 ? consumed.protein / goals.protein : 0),
      fat: clamp01(goals.fat > 0 ? consumed.fat / goals.fat : 0),
      carbs: clamp01(goals.carbs > 0 ? consumed.carbs / goals.carbs : 0),
    },
  };
}
