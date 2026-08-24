import type { FoodItem } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import type { PartialNutritionXml } from '@/features/analyze-food';

/**
 * Progressive meal update while status stays `analyzing`.
 *
 * Uses only top-level macros (foodName / calories / protein / …).
 * Partial `items` are ignored here — mid-stream item sums jump
 * (e.g. 32 → first ingredient 6 → … → 32) and flicker the card.
 * Full composition is applied once in `applyAnalyzeResultToMeal`.
 */
export function applyPartialAnalyzeResultToMeal(
  mealId: string,
  partial: PartialNutritionXml,
  fallbackItemId?: string,
): void {
  if (partial.noFood) return;

  const hasScalars =
    partial.foodName !== undefined ||
    partial.calories !== undefined ||
    partial.protein !== undefined ||
    partial.carbs !== undefined ||
    partial.fat !== undefined ||
    partial.fiber !== undefined ||
    partial.totalGrams !== undefined;

  if (!hasScalars) return;

  const meal = useDiaryStore.getState().meals.find((m) => m.id === mealId);
  const prev = meal?.items[0];

  const calories = partial.calories ?? prev?.calories ?? 0;
  const protein = partial.protein ?? prev?.protein ?? 0;
  const carbs = partial.carbs ?? prev?.carbs ?? 0;
  const fat = partial.fat ?? prev?.fat ?? 0;
  const fiber = partial.fiber ?? prev?.fiber ?? 0;
  const name =
    partial.foodName ??
    (prev?.name && prev.name !== 'Анализ…' ? prev.name : 'Анализ…');

  const item: FoodItem = {
    id: fallbackItemId ?? prev?.id ?? crypto.randomUUID(),
    name,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    grams: prev?.grams ?? 100,
  };

  useDiaryStore.getState().updateMeal(mealId, {
    status: 'analyzing',
    name: partial.foodName ?? meal?.name,
    totalCalories: calories,
    items: [item],
    ...(partial.totalGrams !== undefined ? { totalGrams: partial.totalGrams } : {}),
    healthiness: partial.healthiness ?? meal?.healthiness,
    confidence: partial.confidence ?? meal?.confidence,
    micronutrients: partial.micronutrients ?? meal?.micronutrients,
    portionReference: partial.portionReference ?? meal?.portionReference,
    addedSugar: partial.addedSugar ?? meal?.addedSugar,
    confidenceReason: partial.confidenceReason ?? meal?.confidenceReason,
    healthinessReason: partial.healthinessReason ?? meal?.healthinessReason,
    disclaimers: partial.disclaimers ?? meal?.disclaimers,
  });
}
