import { useQueryClient } from '@tanstack/react-query';
import { useDiaryStore } from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { saveMealImage, timestampForSelectedDate } from '@/shared/lib';
import type { Meal, FoodItem } from '@ai-food/shared-types';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';

export interface SubmitFoodInput {
  image?: File | null;
  description?: string | null;
}

export function useSaveMeal() {
  const queryClient = useQueryClient();
  const addMeal = useDiaryStore((s) => s.addMeal);
  const updateMeal = useDiaryStore((s) => s.updateMeal);

  return async ({ image, description }: SubmitFoodInput) => {
    const mealId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const trimmedDescription = description?.trim() || '';
    const { selectedDate } = useDiaryStore.getState();
    const timestamp = timestampForSelectedDate(selectedDate);

    const placeholderItem: FoodItem = {
      id: itemId,
      name: trimmedDescription || 'Анализ…',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      grams: 100,
    };

    // Empty text without photo: manual stub, no AI call
    if (!image && !trimmedDescription) {
      addMeal({
        id: mealId,
        timestamp,
        name: 'Без названия',
        items: [
          {
            ...placeholderItem,
            name: 'Без названия',
          },
        ],
        totalCalories: 0,
        portions: 1,
        status: 'ready',
      });
      return;
    }

    const imageUri = image ? await saveMealImage(image) : undefined;

    const pendingMeal: Meal = {
      id: mealId,
      timestamp,
      name: trimmedDescription || undefined,
      items: [placeholderItem],
      totalCalories: 0,
      portions: 1,
      imageUri,
      status: 'analyzing',
    };

    addMeal(pendingMeal);

    try {
      const customInstructions = useSettingsStore.getState().customInstructions;
      const dietType = useProfileStore.getState().profile?.dietType ?? 'none';
      const response = await queryClient.fetchQuery({
        queryKey: image
          ? [
              'analyze-food',
              image.name,
              image.size,
              image.lastModified,
              customInstructions,
              dietType,
            ]
          : ['analyze-food', 'text', trimmedDescription, customInstructions, dietType],
        queryFn: () =>
          image
            ? analyzeFoodApi(image, { customInstructions, dietType })
            : analyzeFoodApi(
                { description: trimmedDescription },
                { customInstructions, dietType },
              ),
      });
      applyAnalyzeResultToMeal(mealId, response.result, itemId);
    } catch {
      updateMeal(mealId, { status: 'error' });
    }
  };
}
