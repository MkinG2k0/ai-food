import type { DailyTargets, Meal } from '@ai-food/shared-types';
import { isSameDay } from './dateUtils';

const FALLBACK_TARGETS = {
  kcal: 2000,
  protein: 150,
  fat: 70,
  carbs: 250,
} as const;

export interface TodayKbjuMacros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Lean snapshot for Android home widget (no fiber). */
export interface TodayKbjuSnapshot {
  date: string;
  consumed: TodayKbjuMacros;
  goals: TodayKbjuMacros;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today ready-meal totals vs profile/fallback goals — mirrors DailyHeader
 * aggregation without fiber (widget D-01 / D-08).
 */
export function computeTodayKbjuSnapshot(
  meals: Meal[],
  targets: DailyTargets | null | undefined,
  now: Date = new Date(),
): TodayKbjuSnapshot {
  const dayMeals = meals.filter(
    (m) =>
      isSameDay(new Date(m.timestamp), now) &&
      (m.status ?? 'ready') === 'ready',
  );

  const consumed: TodayKbjuMacros = {
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

  const goals: TodayKbjuMacros = {
    kcal: targets?.kcal ?? FALLBACK_TARGETS.kcal,
    protein: targets?.protein ?? FALLBACK_TARGETS.protein,
    fat: targets?.fat ?? FALLBACK_TARGETS.fat,
    carbs: targets?.carbs ?? FALLBACK_TARGETS.carbs,
  };

  return {
    date: formatLocalDate(now),
    consumed,
    goals,
  };
}
