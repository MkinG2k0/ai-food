import type { FoodItem, Meal } from '@ai-food/shared-types';
import { sanitizeGrams, sanitizeNutrient } from '@/entities/meal';
import type { ImportedMealDraft } from './types';
import { timestampFromLocalDateTime } from './timestampFromLocalDateTime';

export function buildImportedMeal(
  draft: ImportedMealDraft,
  ids: { mealId: string; itemId: string },
): Meal | null {
  const name = draft.name.trim();
  const calories = sanitizeNutrient(draft.calories);
  if (!name || calories <= 0) return null;

  const item: FoodItem = {
    id: ids.itemId,
    name,
    calories,
    protein: sanitizeNutrient(draft.protein),
    fat: sanitizeNutrient(draft.fat),
    carbs: sanitizeNutrient(draft.carbs),
    fiber: sanitizeNutrient(draft.fiber),
    grams: sanitizeGrams(0),
  };

  return {
    id: ids.mealId,
    timestamp: timestampFromLocalDateTime(draft.date, draft.time),
    name,
    items: [item],
    totalCalories: calories,
    status: 'ready',
    portions: 1,
  };
}
