import type { FoodItem, Meal } from '@ai-food/shared-types';
import { sanitizeGrams, sanitizeNutrient } from '@/entities/meal';
import type { OffProduct } from './fetchProductByBarcode';

export function scaleOffProductToItem(
  product: OffProduct,
  grams: number,
  itemId: string = crypto.randomUUID(),
): FoodItem {
  const g = Math.max(1, sanitizeGrams(grams));
  const { per100g } = product;
  return {
    id: itemId,
    name: product.name,
    calories: sanitizeNutrient((per100g.calories * g) / 100),
    protein: sanitizeNutrient((per100g.protein * g) / 100),
    carbs: sanitizeNutrient((per100g.carbs * g) / 100),
    fat: sanitizeNutrient((per100g.fat * g) / 100),
    fiber: sanitizeNutrient((per100g.fiber * g) / 100),
    grams: g,
  };
}

export function buildBarcodeMeal(
  product: OffProduct,
  grams: number,
  ids: {
    mealId: string;
    itemId: string;
    timestamp: string;
    imageUri?: string;
  },
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
    ...(ids.imageUri
      ? { imageUri: ids.imageUri, imageUris: [ids.imageUri] }
      : {}),
  };
}
