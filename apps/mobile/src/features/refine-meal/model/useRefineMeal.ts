import { Filesystem, Directory } from '@capacitor/filesystem';
import type { ApiError, FoodItem, Meal } from '@ai-food/shared-types';
import { resolveItemGrams, useDiaryStore } from '@/entities/meal';
import { refineMealApi } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

async function loadMealImageDataUrl(imageUri: string): Promise<string | undefined> {
  try {
    const { data } = await Filesystem.readFile({
      path: imageUri,
      directory: Directory.Data,
    });
    if (typeof data === 'string' && data.length > 0) {
      return `data:image/jpeg;base64,${data}`;
    }
  } catch {
    // D-05: image load failure → text-only refine
  }
  return undefined;
}

function mapResultToItems(
  result: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    items: Array<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      grams?: number;
      fiber?: number;
    }>;
  },
  fallbackItemId?: string,
): { items: FoodItem[]; totalCalories: number } {
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
    return { items, totalCalories };
  }

  return {
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
  };
}

export function useRefineMeal() {
  const updateMeal = useDiaryStore((s) => s.updateMeal);

  return async (mealId: string, correction: string): Promise<void> => {
    const trimmed = correction.trim();
    if (!trimmed) {
      rejectApiError('Введите текст уточнения.', 'ANALYSIS_FAILED', 400);
    }

    const meal = useDiaryStore.getState().meals.find((m: Meal) => m.id === mealId);
    if (!meal) {
      rejectApiError('Приём пищи не найден.', 'ANALYSIS_FAILED', 404);
    }

    const imageDataUrl = meal.imageUri
      ? await loadMealImageDataUrl(meal.imageUri)
      : undefined;

    const response = await refineMealApi({
      correction: trimmed,
      customInstructions: useSettingsStore.getState().customInstructions,
      dietType: useProfileStore.getState().profile?.dietType ?? 'none',
      model: useSettingsStore.getState().aiModel,
      mealContext: {
        name: meal.name,
        items: meal.items.map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber ?? 0,
          grams: item.grams,
        })),
      },
      imageDataUrl,
    });

    const { result } = response;
    const { items, totalCalories } = mapResultToItems(
      result,
      meal.items[0]?.id,
    );

    updateMeal(mealId, {
      name: result.foodName,
      items,
      totalCalories,
      status: 'ready',
      healthiness: result.healthiness,
      confidence: result.confidence,
      micronutrients: result.micronutrients,
    });
  };
}
