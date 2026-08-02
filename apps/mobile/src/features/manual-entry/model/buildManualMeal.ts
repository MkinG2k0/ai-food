import type { FoodItem, Meal } from '@ai-food/shared-types';
import {
  sanitizeGrams,
  sanitizeNutrient,
  sumItemCalories,
  sumItemGrams,
} from '@/entities/meal';

export interface ManualCompositionDraftItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  grams: number;
}

export interface BuildManualMealInput {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  grams?: number;
  composition: ManualCompositionDraftItem[];
}

export interface BuildManualMealIds {
  mealId: string;
  itemId: string;
  timestamp: string;
  imageUris?: string[];
}

function toFoodItem(
  draft: ManualCompositionDraftItem,
): FoodItem {
  return {
    id: draft.id,
    name: draft.name.trim(),
    calories: sanitizeNutrient(draft.calories),
    protein: sanitizeNutrient(draft.protein),
    carbs: sanitizeNutrient(draft.carbs),
    fat: sanitizeNutrient(draft.fat),
    fiber: sanitizeNutrient(draft.fiber),
    grams: sanitizeGrams(draft.grams),
  };
}

export function buildManualMeal(
  input: BuildManualMealInput,
  ids: BuildManualMealIds,
): Meal | null {
  const name = input.name.trim();
  if (!name) return null;

  let items: FoodItem[];

  if (input.composition.length === 0) {
    const calories = sanitizeNutrient(input.calories);
    if (calories <= 0) return null;
    const grams = sanitizeGrams(input.grams ?? 100);
    items = [
      {
        id: ids.itemId,
        name,
        calories,
        protein: sanitizeNutrient(input.protein),
        carbs: sanitizeNutrient(input.carbs),
        fat: sanitizeNutrient(input.fat),
        fiber: sanitizeNutrient(input.fiber ?? 0),
        grams,
      },
    ];
  } else {
    for (const row of input.composition) {
      if (!row.name.trim()) return null;
      if (sanitizeNutrient(row.calories) <= 0) return null;
    }
    items = input.composition.map(toFoodItem);
  }

  const totalCalories = sumItemCalories(items);
  const gramsSum = sumItemGrams(items);
  const imageUris = ids.imageUris?.length ? ids.imageUris : undefined;

  return {
    id: ids.mealId,
    timestamp: ids.timestamp,
    name,
    items,
    totalCalories,
    portions: 1,
    status: 'ready',
    ...(gramsSum > 0 ? { totalGrams: gramsSum } : {}),
    ...(imageUris
      ? { imageUri: imageUris[0], imageUris }
      : {}),
  };
}
