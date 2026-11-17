import type { FoodItem } from '@ai-food/shared-types';
import { scaleItemsGramsToTotal } from './mealGrams';
import {
  scalePortionNutrientsByGrams,
  sanitizeFoodItemPatch,
  sumItemCalories,
  type NutrientKey,
} from './mealNutritionMath';

const NUTRIENT_KEYS: NutrientKey[] = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
];

function patchHasNutrient(patch: Partial<FoodItem>): boolean {
  return NUTRIENT_KEYS.some((key) => key in patch);
}

/** Scale one item's KBJU with a new weight; grams=0 clears nutrients. */
export function foodItemWithScaledGrams(
  item: FoodItem,
  newGrams: number,
): FoodItem {
  const safePatch = sanitizeFoodItemPatch({ grams: newGrams });
  const grams = safePatch.grams ?? 0;
  if (grams === 0) {
    return {
      ...item,
      grams: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    };
  }
  return {
    ...item,
    grams,
    ...scalePortionNutrientsByGrams(item, item.grams, grams),
  };
}

/**
 * Apply a FoodItem patch. Grams-only patches rescale KBJU by density;
 * explicit nutrient keys in the patch win (UI already computed them).
 */
export function applyFoodItemPatch(
  item: FoodItem,
  patch: Partial<FoodItem>,
): FoodItem {
  const safePatch = sanitizeFoodItemPatch(patch);
  if (safePatch.grams !== undefined && !patchHasNutrient(safePatch)) {
    const { grams, ...rest } = safePatch;
    const scaled = foodItemWithScaledGrams(item, grams);
    return { ...scaled, ...rest, grams: scaled.grams };
  }
  return { ...item, ...safePatch };
}

/**
 * Redistribute composition to a new dish total and scale each item's KBJU
 * by its own grams ratio so meal totals roll up with weight.
 */
export function scaleMealItemsToTotalGrams(
  items: FoodItem[],
  targetTotalGrams: number,
): { items: FoodItem[]; totalGrams: number; totalCalories: number } {
  if (items.length === 0) {
    const { items: next, totalGrams } = scaleItemsGramsToTotal(
      items,
      targetTotalGrams,
    );
    return { items: next, totalGrams, totalCalories: 0 };
  }

  const { items: gramScaled, totalGrams } = scaleItemsGramsToTotal(
    items,
    targetTotalGrams,
  );
  const nextItems = gramScaled.map((item, index) => {
    const prev = items[index]!;
    if (item.grams === prev.grams) return item;
    return {
      ...item,
      ...scalePortionNutrientsByGrams(prev, prev.grams, item.grams),
    };
  });

  return {
    items: nextItems,
    totalGrams,
    totalCalories: sumItemCalories(nextItems),
  };
}

export function sumItemMacros(items: FoodItem[]): {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  return items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + (item.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}
