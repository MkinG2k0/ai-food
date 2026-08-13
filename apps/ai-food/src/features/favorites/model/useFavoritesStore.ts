import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodItem, Meal } from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';
import { mealDisplayName } from '@/entities/meal';
import type { FavoriteFood } from './favoriteFood';

export const MAX_FAVORITES = 50;

export type ToggleFavoriteResult = 'added' | 'removed' | 'limit' | false;

export type FavoritePendingDelete = { id: string; clientUpdatedAt: string };

interface FavoritesState {
  favorites: FavoriteFood[];
  pendingDeletes: FavoritePendingDelete[];
  addFavorite: (meal: Meal) => boolean;
  removeFavorite: (favoriteId: string) => void;
  toggleFavorite: (meal: Meal) => ToggleFavoriteResult;
  isFavorite: (mealId: string) => boolean;
}

function nowClock(): string {
  return new Date().toISOString();
}

function isMealFavoritable(meal: Meal): boolean {
  return meal.status !== 'analyzing' && meal.status !== 'error';
}

function deepCopyItems(items: FoodItem[]): FoodItem[] {
  return items.map((item) => ({ ...item }));
}

function mealToFavorite(meal: Meal): FavoriteFood {
  const clientUpdatedAt = nowClock();
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
    createdAt: clientUpdatedAt,
    clientUpdatedAt,
  };
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      pendingDeletes: [],
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
        set((state) => {
          const existing = state.favorites.find((f) => f.id === favoriteId);
          const clock = existing?.clientUpdatedAt ?? nowClock();
          return {
            favorites: state.favorites.filter((f) => f.id !== favoriteId),
            pendingDeletes: [
              ...state.pendingDeletes.filter((d) => d.id !== favoriteId),
              { id: favoriteId, clientUpdatedAt: clock },
            ],
          };
        }),
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
      partialize: (state) => ({
        favorites: state.favorites,
        pendingDeletes: state.pendingDeletes,
      }),
    },
  ),
);
