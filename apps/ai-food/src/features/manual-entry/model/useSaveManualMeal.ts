import { useDiaryStore } from '@/entities/meal';
import { recordUsageEvent } from '@/features/auth';
import { saveMealImage, timestampForSelectedDate } from '@/shared/lib';
import {
  buildManualMeal,
  type BuildManualMealInput,
} from './buildManualMeal';

export type SaveManualMealInput = BuildManualMealInput & {
  image?: File | null;
};

export function useSaveManualMeal() {
  return async (input: SaveManualMealInput): Promise<string | null> => {
    const { selectedDate, addMeal } = useDiaryStore.getState();
    const mealId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const timestamp = timestampForSelectedDate(selectedDate);

    let imageUris: string[] | undefined;
    if (input.image) {
      const uri = await saveMealImage(input.image);
      imageUris = [uri];
    }

    const meal = buildManualMeal(
      {
        name: input.name,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        fiber: input.fiber,
        grams: input.grams,
        composition: input.composition,
      },
      { mealId, itemId, timestamp, imageUris },
    );

    if (!meal) return null;

    addMeal(meal);
    void recordUsageEvent('manual');
    return meal.id;
  };
}
