import type { FoodItem, Meal } from '@ai-food/shared-types';
import { sanitizeNutrient, sumItemCalories } from './mealNutritionMath';

export const DEFAULT_PORTIONS = 1;
export const PORTION_STEP = 0.5;
export const MIN_PORTIONS = 0.5;
export const MAX_PORTIONS = 20;

/** Resolve persisted or legacy meal portions. */
export function resolveMealPortions(meal: Pick<Meal, 'portions'>): number {
  return normalizePortions(meal.portions ?? DEFAULT_PORTIONS);
}

/** Clamp and snap to 0.5 steps. */
export function normalizePortions(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PORTIONS;
  const snapped = Math.round(value / PORTION_STEP) * PORTION_STEP;
  return Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, snapped));
}

export function formatPortions(portions: number): string {
  const n = normalizePortions(portions);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Scale all item nutrients/grams by ratio and return with new totalCalories. */
export function scaleMealByPortionRatio(
  items: FoodItem[],
  ratio: number,
): { items: FoodItem[]; totalCalories: number } {
  if (!Number.isFinite(ratio) || ratio === 1) {
    return { items, totalCalories: sumItemCalories(items) };
  }

  const nextItems = items.map((item) => ({
    ...item,
    calories: sanitizeNutrient(item.calories * ratio),
    protein: sanitizeNutrient(item.protein * ratio),
    carbs: sanitizeNutrient(item.carbs * ratio),
    fat: sanitizeNutrient(item.fat * ratio),
    fiber: sanitizeNutrient((item.fiber ?? 0) * ratio),
    grams: sanitizeNutrient(item.grams * ratio),
  }));

  return {
    items: nextItems,
    totalCalories: sumItemCalories(nextItems),
  };
}
