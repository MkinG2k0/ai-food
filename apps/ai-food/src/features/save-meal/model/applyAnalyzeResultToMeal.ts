import type { FoodItem, NutritionResult } from '@ai-food/shared-types';
import {
  normalizePortions,
  resolveItemGrams,
  scaleItemsGramsToTotal,
  sumItemGrams,
  useDiaryStore,
} from '@/entities/meal';

/** Shared success mapping for first analyze and retry — keeps field lists in sync. */
export function applyAnalyzeResultToMeal(
  mealId: string,
  result: NutritionResult,
  fallbackItemId?: string,
): void {
  const updateMeal = useDiaryStore.getState().updateMeal;
  const portions = normalizePortions(result.itemCount ?? 1);

  if (result.items.length > 0) {
    let items: FoodItem[] = result.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber ?? 0,
      grams: resolveItemGrams({ grams: item.grams ?? 100 }),
    }));
    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const compositionSum = sumItemGrams(items);
    let totalGrams =
      result.totalGrams !== undefined ? result.totalGrams : compositionSum;

    // Keep dish weight and composition grams in sync (same shares)
    if (compositionSum > 0 && totalGrams !== compositionSum) {
      const scaled = scaleItemsGramsToTotal(items, totalGrams);
      items = scaled.items;
      totalGrams = scaled.totalGrams;
    } else if (compositionSum > 0) {
      totalGrams = compositionSum;
    }

    updateMeal(mealId, {
      status: 'ready',
      name: result.foodName,
      totalCalories,
      items,
      portions,
      totalGrams,
      healthiness: result.healthiness,
      confidence: result.confidence,
      micronutrients: result.micronutrients,
      portionReference: result.portionReference,
      addedSugar: result.addedSugar,
      confidenceReason: result.confidenceReason,
      healthinessReason: result.healthinessReason,
      disclaimers: result.disclaimers,
      analyzeErrorCode: undefined,
    });
    return;
  }

  const fallbackGrams = result.totalGrams ?? 100;
  updateMeal(mealId, {
    status: 'ready',
    name: result.foodName,
    totalCalories: result.calories,
    items: [
      {
        id: fallbackItemId ?? crypto.randomUUID(),
        name: result.foodName,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        grams: fallbackGrams,
      },
    ],
    portions,
    totalGrams: fallbackGrams,
    healthiness: result.healthiness,
    confidence: result.confidence,
    micronutrients: result.micronutrients,
    portionReference: result.portionReference,
    addedSugar: result.addedSugar,
    confidenceReason: result.confidenceReason,
    healthinessReason: result.healthinessReason,
    disclaimers: result.disclaimers,
    analyzeErrorCode: undefined,
  });
}
