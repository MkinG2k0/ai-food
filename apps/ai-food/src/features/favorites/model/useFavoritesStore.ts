import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodItem, Meal } from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';
import { mealDisplayName } from '@/entities/meal';
import type { FavoriteFood } from './favoriteFood';

export const MAX_FAVORITES = 50;

export type ToggleFavoriteResult = 'added' | 'removed' | 'limit' | false;

interface FavoritesState {
  favorites: FavoriteFood[];
  addFavorite: (meal: Meal) => boolean;
  removeFavorite: (favoriteId: string) => void;
  toggleFavorite: (meal: Meal) => ToggleFavoriteResult;
  isFavorite: (mealId: string) => boolean;
}

function isMealFavoritable(meal: Meal): boolean {
  return meal.status !== 'analyzing' && meal.status !== 'error';
}

function deepCopyItems(items: FoodItem[]): FoodItem[] {
  return items.map((item) => ({ ...item }));
}

function mealToFavorite(meal: Meal): FavoriteFood {
  return {
    id: crypto.randomUUID(),
    sourceMealId: meal.id,
    name: mealDisplayName(meal),
    items: deepCopyItems(meal.items),
    totalCalories: meal.totalCalories,
    portions: meal.portions,
    imageUri: meal.imageUri,
    imageUris: meal.imageUris,
    healthiness: meal.healthiness,
    confidence: meal.confidence,
    micronutrients: meal.micronutrients
      ? meal.micronutrients.map((m) => ({ ...m }))
      : undefined,
    createdAt: new Date().toISOString(),
  };
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (meal) => {
        if (!isMealFavoritable(meal)) return false;

        const { favorites } = get();
        if (favorites.some((f) => f.sourceMealId === meal.id)) return false;
        if (favorites.length >= MAX_FAVORITES) return false;

        const favorite = mealToFavorite(meal);
        set({ favorites: [favorite, ...favorites] });
        return true;
      },
      removeFavorite: (favoriteId) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== favoriteId),
        })),
      toggleFavorite: (meal) => {
        if (!isMealFavoritable(meal)) return false;

        const existing = get().favorites.find((f) => f.sourceMealId === meal.id);
        if (existing) {
          get().removeFavorite(existing.id);
          return 'removed';
        }

        if (get().favorites.length >= MAX_FAVORITES) return 'limit';

        const added = get().addFavorite(meal);
        return added ? 'added' : false;
      },
      isFavorite: (mealId) =>
        get().favorites.some((f) => f.sourceMealId === mealId),
    }),
    {
      name: 'ai-food-favorites',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
