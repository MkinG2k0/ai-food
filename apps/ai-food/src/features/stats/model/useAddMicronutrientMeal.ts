import type { MicronutrientId, MicronutrientUnit } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import { buildMicronutrientMeal } from './buildMicronutrientMeal';

export function useAddMicronutrientMeal() {
  return (
    nutrientId: MicronutrientId,
    amount: number,
    options?: {
      unit?: MicronutrientUnit;
      displayName?: string;
    },
  ): string | null => {
    const { addMeal } = useDiaryStore.getState();
    const mealId = crypto.randomUUID();
    const meal = buildMicronutrientMeal({
      nutrientId,
      amount,
      mealId,
      itemId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      unit: options?.unit,
      displayName: options?.displayName,
    });
    if (!meal) return null;

    addMeal(meal);
    queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
    return mealId;
  };
}
