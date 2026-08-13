import type { FoodItem, Meal } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import { timestampForSelectedDate } from '@/shared/lib';
import { useFavoritesStore } from './useFavoritesStore';

export function useQuickAddFavorite() {
  return (favoriteId: string): string | undefined => {
    const favorite = useFavoritesStore
      .getState()
      .favorites.find((f) => f.id === favoriteId);
    if (!favorite) return undefined;

    const { selectedDate, addMeal } = useDiaryStore.getState();
    const mealId = crypto.randomUUID();
    const items: FoodItem[] = favorite.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    const meal: Meal = {
      id: mealId,
      timestamp: timestampForSelectedDate(selectedDate),
      name: favorite.name,
      items,
      totalCalories: favorite.totalCalories,
      portions: favorite.portions ?? 1,
      imageUri: favorite.imageUri,
      imageUris: favorite.imageUris,
      status: 'ready',
      healthiness: favorite.healthiness,
      confidence: favorite.confidence,
      micronutrients: favorite.micronutrients
        ? favorite.micronutrients.map((m) => ({ ...m }))
        : undefined,
    };

    addMeal(meal);
    queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
    return mealId;
  };
}
