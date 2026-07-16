import { useQueryClient } from '@tanstack/react-query';
import { resolveItemGrams, useDiaryStore } from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { saveMealImage, timestampForSelectedDate } from '@/shared/lib';
import type { Meal, FoodItem } from '@ai-food/shared-types';

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

    const imageUri = image ? await saveMealImage(image) : undefined;

    if (!image) {
      const dishName = trimmedDescription || 'Без названия';
      addMeal({
        id: mealId,
        timestamp,
        name: dishName,
        items: [
          {
            ...placeholderItem,
            name: dishName,
          },
        ],
        totalCalories: 0,
        portions: 1,
        status: 'ready',
      });
      return;
    }

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
        queryKey: [
          'analyze-food',
          image.name,
          image.size,
          image.lastModified,
          customInstructions,
          dietType,
        ],
        queryFn: () => analyzeFoodApi(image, { customInstructions, dietType }),
      });
      const { result } = response;
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
        });
      } else {
        updateMeal(mealId, {
          status: 'ready',
          name: result.foodName,
          totalCalories: result.calories,
          items: [
            {
              id: itemId,
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
        });
      }
    } catch {
      updateMeal(mealId, { status: 'error' });
    }
  };
}
