import type { FoodItem } from '@ai-food/shared-types';
import { sanitizeGrams, scaleItemsGramsToTotal } from './mealGrams';
import {
  nutrientsFromPer100,
  nutrientsPer100FromPortion,
  scalePortionNutrientsByGrams,
  sanitizeFoodItemPatch,
  sumItemCalories,
  type NutrientKey,
  type PortionNutrients,
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

function portionFromItem(item: FoodItem): PortionNutrients {
  return {
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber ?? 0,
  };
}

/**
 * Scale one item's KBJU with a new weight.
 * At grams=0, nutrient fields keep per-100 density so a later positive
 * weight can restore KBJU (avoids 0→N stuck-at-zero round trip).
 */
export function foodItemWithScaledGrams(
  item: FoodItem,
  newGrams: number,
): FoodItem {
  const grams = sanitizeGrams(newGrams);
  const oldGrams = sanitizeGrams(item.grams);

  if (grams === 0) {
    if (oldGrams === 0) {
      return { ...item, grams: 0 };
    }
    return {
      ...item,
      grams: 0,
      ...nutrientsPer100FromPortion({ ...portionFromItem(item), grams: oldGrams }),
    };
  }

  if (oldGrams === 0) {
    // Nutrient fields hold per-100 density from a prior zeroing (or zeros).
    return {
      ...item,
      grams,
      ...nutrientsFromPer100(portionFromItem(item), grams),
    };
  }

  return {
    ...item,
    grams,
    ...scalePortionNutrientsByGrams(portionFromItem(item), oldGrams, grams),
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
 *
 * Target 0 keeps item grams/KBJU intact (only totalGrams becomes 0) so a
 * later positive total can restore shares — zeroing every item would lose
 * proportions and stick KBJU at 0 via scalePortionNutrientsByGrams.
 */
export function scaleMealItemsToTotalGrams(
  items: FoodItem[],
  targetTotalGrams: number,
): { items: FoodItem[]; totalGrams: number; totalCalories: number } {
  const safeTarget = sanitizeGrams(targetTotalGrams);
  if (items.length === 0) {
    return { items, totalGrams: safeTarget, totalCalories: 0 };
  }

  if (safeTarget === 0) {
    return {
      items,
      totalGrams: 0,
      totalCalories: sumItemCalories(items),
    };
  }

  const { items: gramScaled, totalGrams } = scaleItemsGramsToTotal(
    items,
    safeTarget,
  );
  const nextItems = gramScaled.map((item, index) =>
    foodItemWithScaledGrams(items[index]!, item.grams),
  );

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
