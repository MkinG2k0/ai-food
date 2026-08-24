import { useQueryClient } from '@tanstack/react-query';
import { useDiaryStore } from '@/entities/meal';
import { timestampForSelectedDate } from '@/shared/lib';
import type { FoodItem } from '@ai-food/shared-types';
import { queueDiarySync } from '@/features/diary-sync';
import {
  beginAnalyzingMeal,
  persistMealImages,
  resolveSubmitImages,
  runMealAnalyze,
} from './analyzingMeal';

export interface SubmitFoodInput {
  image?: File | null;
  /** Several photos of the same dish (different angles). All saved to diary. */
  images?: File[] | null;
  description?: string | null;
}

export function useSaveMeal() {
  const queryClient = useQueryClient();
  const addMeal = useDiaryStore((s) => s.addMeal);

  return async (input: SubmitFoodInput) => {
    const { description } = input;
    const imageList = resolveSubmitImages(input);
    const trimmedDescription = description?.trim() || '';

    // Empty text without photo: manual stub, no AI call
    if (imageList.length === 0 && !trimmedDescription) {
      const mealId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const { selectedDate } = useDiaryStore.getState();
      const timestamp = timestampForSelectedDate(selectedDate);
      const placeholderItem: FoodItem = {
        id: itemId,
        name: 'Без названия',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        grams: 100,
      };
      addMeal({
        id: mealId,
        timestamp,
        name: 'Без названия',
        items: [placeholderItem],
        totalCalories: 0,
        portions: 1,
        status: 'ready',
      });
      queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
      return;
    }

    const handle = beginAnalyzingMeal({ description: trimmedDescription });
    if (imageList.length > 0) {
      persistMealImages(handle.mealId, imageList);
    }
    await runMealAnalyze(queryClient, handle, {
      ...(imageList.length === 1
        ? { image: imageList[0] }
        : imageList.length > 1
          ? { images: imageList }
          : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    });
  };
}
