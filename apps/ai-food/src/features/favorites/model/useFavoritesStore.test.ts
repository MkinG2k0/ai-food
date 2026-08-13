import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useFavoritesStore } from './useFavoritesStore';
import type { ToggleFavoriteResult } from './useFavoritesStore';

const readyMeal: Meal = {
  id: 'meal-1',
  timestamp: '2026-07-16T10:00:00.000Z',
  name: 'Куриный салат',
  items: [
    {
      id: 'item-1',
      name: 'Курица',
      calories: 200,
      protein: 30,
      carbs: 0,
      fat: 8,
      fiber: 0,
      grams: 120,
    },
    {
      id: 'item-2',
      name: 'Салат',
      calories: 50,
      protein: 2,
      carbs: 8,
      fat: 1,
      fiber: 3,
      grams: 80,
    },
  ],
  totalCalories: 250,
  portions: 1,
  status: 'ready',
  healthiness: 7,
  confidence: 0.9,
};

beforeEach(async () => {
  await act(async () => {
    await useFavoritesStore.persist.rehydrate();
  });
  useFavoritesStore.setState({ favorites: [], pendingDeletes: [] });
});

describe('useFavoritesStore', () => {
  it('persists under storage key ai-food-favorites', () => {
    expect(useFavoritesStore.persist.getOptions().name).toBe('ai-food-favorites');
  });

  it('starts with empty favorites', () => {
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
  });

  it('addFavorite stores FavoriteFood with sourceMealId and deep-copied items', async () => {
    let result = false;
    await act(async () => {
      result = useFavoritesStore.getState().addFavorite(readyMeal);
    });

    expect(result).toBe(true);
    const { favorites } = useFavoritesStore.getState();
    expect(favorites).toHaveLength(1);
    const fav = favorites[0];
    expect(fav.id).toBeTruthy();
    expect(fav.id).not.toBe(readyMeal.id);
    expect(fav.sourceMealId).toBe('meal-1');
    expect(fav.name).toBe('Куриный салат');
    expect(fav.totalCalories).toBe(250);
    expect(fav.portions).toBe(1);
    expect(fav.healthiness).toBe(7);
    expect(fav.confidence).toBe(0.9);
    expect(fav.createdAt).toBeTruthy();
    expect(fav.items).toHaveLength(2);
    expect(fav.items[0]).toEqual(readyMeal.items[0]);
    expect(fav.items[0]).not.toBe(readyMeal.items[0]);
    expect(fav.items[1]).not.toBe(readyMeal.items[1]);
  });

  it('addFavorite is idempotent when sourceMealId already present', async () => {
    await act(async () => {
      useFavoritesStore.getState().addFavorite(readyMeal);
      useFavoritesStore.getState().addFavorite({ ...readyMeal, name: 'Другое имя' });
    });
    expect(useFavoritesStore.getState().favorites).toHaveLength(1);
    expect(useFavoritesStore.getState().favorites[0].name).toBe('Куриный салат');
  });

  it('isFavorite returns true when sourceMealId matches', async () => {
    await act(async () => {
      useFavoritesStore.getState().addFavorite(readyMeal);
    });
    expect(useFavoritesStore.getState().isFavorite('meal-1')).toBe(true);
    expect(useFavoritesStore.getState().isFavorite('other')).toBe(false);
  });

  it('removeFavorite removes by favorite id', async () => {
    await act(async () => {
      useFavoritesStore.getState().addFavorite(readyMeal);
    });
    const favId = useFavoritesStore.getState().favorites[0].id;
    await act(async () => {
      useFavoritesStore.getState().removeFavorite(favId);
    });
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
    expect(useFavoritesStore.getState().isFavorite('meal-1')).toBe(false);
  });

  it('toggleFavorite adds then removes by sourceMealId', async () => {
    let first: ToggleFavoriteResult = false;
    await act(async () => {
      first = useFavoritesStore.getState().toggleFavorite(readyMeal);
    });
    expect(first).toBe('added');
    expect(useFavoritesStore.getState().isFavorite('meal-1')).toBe(true);

    let second: ToggleFavoriteResult = false;
    await act(async () => {
      second = useFavoritesStore.getState().toggleFavorite(readyMeal);
    });
    expect(second).toBe('removed');
    expect(useFavoritesStore.getState().isFavorite('meal-1')).toBe(false);
  });

  it('skips addFavorite for analyzing and error meals', async () => {
    await act(async () => {
      expect(
        useFavoritesStore.getState().addFavorite({
          ...readyMeal,
          id: 'analyzing-1',
          status: 'analyzing',
        }),
      ).toBe(false);
      expect(
        useFavoritesStore.getState().addFavorite({
          ...readyMeal,
          id: 'error-1',
          status: 'error',
        }),
      ).toBe(false);
    });
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
  });

  it('treats missing status as ready and allows favorite', async () => {
    const legacy: Meal = { ...readyMeal, id: 'legacy-1', status: undefined };
    await act(async () => {
      expect(useFavoritesStore.getState().addFavorite(legacy)).toBe(true);
    });
    expect(useFavoritesStore.getState().isFavorite('legacy-1')).toBe(true);
  });

  it('refuses addFavorite at cap of 50', async () => {
    await act(async () => {
      for (let i = 0; i < 50; i++) {
        useFavoritesStore.getState().addFavorite({
          ...readyMeal,
          id: `meal-${i}`,
          name: `Блюдо ${i}`,
        });
      }
    });
    expect(useFavoritesStore.getState().favorites).toHaveLength(50);

    let result = true;
    await act(async () => {
      result = useFavoritesStore.getState().addFavorite({
        ...readyMeal,
        id: 'meal-overflow',
        name: 'Лишнее',
      });
    });
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().favorites).toHaveLength(50);
  });

  it('toggleFavorite returns limit when at cap and not already favorite', async () => {
    await act(async () => {
      for (let i = 0; i < 50; i++) {
        useFavoritesStore.getState().addFavorite({
          ...readyMeal,
          id: `meal-${i}`,
        });
      }
    });
    let result: ToggleFavoriteResult = false;
    await act(async () => {
      result = useFavoritesStore.getState().toggleFavorite({
        ...readyMeal,
        id: 'meal-new',
      });
    });
    expect(result).toBe('limit');
  });
});
