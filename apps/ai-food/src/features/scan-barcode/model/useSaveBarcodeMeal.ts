import { useDiaryStore } from '@/entities/meal';
import { recordUsageEvent } from '@/features/auth';
import { queueDiarySync } from '@/features/diary-sync';
import { saveMealImageFromUrl, timestampForSelectedDate } from '@/shared/lib';
import type { OffProduct } from '../api/fetchProductByBarcode';
import { buildBarcodeMeal } from '../api/mapOffProductToMeal';

export function useSaveBarcodeMeal() {
  return async (product: OffProduct, grams: number): Promise<string> => {
    const { selectedDate, addMeal } = useDiaryStore.getState();
    const imageUri = product.imageUrl
      ? (await saveMealImageFromUrl(product.imageUrl)) ?? undefined
      : undefined;

    const meal = buildBarcodeMeal(product, grams, {
      mealId: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      timestamp: timestampForSelectedDate(selectedDate),
      imageUri,
    });
    addMeal(meal);
    queueDiarySync({ mode: 'upsert', mealIds: [meal.id] });
    void recordUsageEvent('barcode');
    return meal.id;
  };
}
