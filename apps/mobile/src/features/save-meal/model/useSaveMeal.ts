import { useQueryClient } from '@tanstack/react-query';
import { useDiaryStore } from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { saveMealImage } from '@/shared/lib';
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

    const placeholderItem: FoodItem = {
      id: itemId,
      name: trimmedDescription || 'Анализ…',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      portion: '1 порция',
    };

    const imageUri = image ? await saveMealImage(image) : undefined;

    if (!image) {
      addMeal({
        id: mealId,
        timestamp: new Date().toISOString(),
        items: [
          {
            ...placeholderItem,
            name: trimmedDescription || 'Без названия',
          },
        ],
        totalCalories: 0,
        status: 'ready',
      });
      return;
    }

    const pendingMeal: Meal = {
      id: mealId,
      timestamp: new Date().toISOString(),
      items: [placeholderItem],
      totalCalories: 0,
      imageUri,
      status: 'analyzing',
    };

    addMeal(pendingMeal);

    try {
      const response = await queryClient.fetchQuery({
        queryKey: ['analyze-food', image.name, image.size, image.lastModified],
        queryFn: () => analyzeFoodApi(image),
      });
      const { result } = response;
      updateMeal(mealId, {
        status: 'ready',
        totalCalories: result.calories,
        items: [
          {
            id: itemId,
            name: result.foodName,
            calories: result.calories,
            protein: result.protein,
            carbs: result.carbs,
            fat: result.fat,
            portion: '1 порция',
          },
        ],
      });
    } catch {
      updateMeal(mealId, { status: 'error' });
    }
  };
}
