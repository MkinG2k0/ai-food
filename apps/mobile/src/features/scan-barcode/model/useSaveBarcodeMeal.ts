import { useDiaryStore } from '@/entities/meal';
import { timestampForSelectedDate } from '@/shared/lib';
import type { OffProduct } from '../api/fetchProductByBarcode';
import { buildBarcodeMeal } from '../api/mapOffProductToMeal';

export function useSaveBarcodeMeal() {
  return (product: OffProduct, grams: number): string => {
    const { selectedDate, addMeal } = useDiaryStore.getState();
    const meal = buildBarcodeMeal(product, grams, {
      mealId: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      timestamp: timestampForSelectedDate(selectedDate),
    });
    addMeal(meal);
    return meal.id;
  };
}
