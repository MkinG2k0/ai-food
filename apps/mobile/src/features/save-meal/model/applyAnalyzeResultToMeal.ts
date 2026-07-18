import type { FoodItem, NutritionResult } from '@ai-food/shared-types';
import { resolveItemGrams, useDiaryStore } from '@/entities/meal';

/** Shared success mapping for first analyze and retry — keeps field lists in sync. */
export function applyAnalyzeResultToMeal(
  mealId: string,
  result: NutritionResult,
  fallbackItemId?: string,
): void {
  const updateMeal = useDiaryStore.getState().updateMeal;

  if (result.items.length > 0) {
    const items: FoodItem[] = result.items.map((item) => ({
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
    updateMeal(mealId, {
      status: 'ready',
      name: result.foodName,
      totalCalories,
      items,
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
        grams: 100,
      },
    ],
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
