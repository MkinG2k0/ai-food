import type { FoodItem, Meal } from '@ai-food/shared-types';
import type { OffProduct } from './fetchProductByBarcode';

function scale(per100: number, grams: number): number {
  return Math.round((per100 * grams) / 100);
}

export function scaleOffProductToItem(
  product: OffProduct,
  grams: number,
  itemId: string = crypto.randomUUID(),
): FoodItem {
  const g = Math.max(1, Math.round(grams));
  const { per100g } = product;
  return {
    id: itemId,
    name: product.name,
    calories: scale(per100g.calories, g),
    protein: scale(per100g.protein, g),
    carbs: scale(per100g.carbs, g),
    fat: scale(per100g.fat, g),
    fiber: scale(per100g.fiber, g),
    grams: g,
  };
}

export function buildBarcodeMeal(
  product: OffProduct,
  grams: number,
  ids: { mealId: string; itemId: string; timestamp: string },
): Meal {
  const item = scaleOffProductToItem(product, grams, ids.itemId);
  return {
    id: ids.mealId,
    timestamp: ids.timestamp,
    name: product.brands ? `${product.name} (${product.brands})` : product.name,
    items: [item],
    totalCalories: item.calories,
    totalGrams: item.grams,
    portions: 1,
    status: 'ready',
    confidence: 1,
  };
}
