import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import { useFavoritesStore } from './useFavoritesStore';
import { useQuickAddFavorite } from './useQuickAddFavorite';

const readyMeal: Meal = {
  id: 'meal-1',
  timestamp: '2026-07-16T10:00:00.000Z',
  name: 'Овсянка',
  items: [
    {
      id: 'item-1',
      name: 'Овсяные хлопья',
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
      fiber: 4,
      grams: 40,
    },
    {
      id: 'item-2',
      name: 'Молоко',
      calories: 60,
      protein: 3,
      carbs: 5,
      fat: 3,
      fiber: 0,
      grams: 100,
    },
  ],
  totalCalories: 210,
  portions: 1,
  imageUri: 'file://meals/oats.jpg',
  status: 'ready',
  healthiness: 8,
  confidence: 0.85,
};

beforeEach(async () => {
  await act(async () => {
    await useFavoritesStore.persist.rehydrate();
    await useDiaryStore.persist.rehydrate();
  });
  useFavoritesStore.setState({ favorites: [] });
  useDiaryStore.setState({
    meals: [],
    selectedDate: new Date('2026-07-10T12:00:00.000Z'),
  });
});

describe('useQuickAddFavorite', () => {
  it('returns undefined when favorite id is missing', () => {
    const { result } = renderHook(() => useQuickAddFavorite());
    expect(result.current('missing-id')).toBeUndefined();
    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });

  it('adds a ready Meal to diary with new ids and selectedDate timestamp', async () => {
    await act(async () => {
      useFavoritesStore.getState().addFavorite(readyMeal);
    });
    const favoriteId = useFavoritesStore.getState().favorites[0].id;

    const { result } = renderHook(() => useQuickAddFavorite());
    let newMealId: string | undefined;
    await act(async () => {
      newMealId = result.current(favoriteId);
    });

    expect(newMealId).toBeTruthy();
    const meals = useDiaryStore.getState().meals;
    expect(meals).toHaveLength(1);
    const meal = meals[0];
    expect(meal.id).toBe(newMealId);
    expect(meal.id).not.toBe(readyMeal.id);
    expect(meal.name).toBe('Овсянка');
    expect(meal.totalCalories).toBe(210);
    expect(meal.portions).toBe(1);
    expect(meal.status).toBe('ready');
    expect(meal.imageUri).toBe('file://meals/oats.jpg');
    expect(meal.healthiness).toBe(8);
    expect(meal.confidence).toBe(0.85);
    expect(meal.items).toHaveLength(2);
    expect(meal.items[0].id).not.toBe('item-1');
    expect(meal.items[1].id).not.toBe('item-2');
    expect(meal.items[0].name).toBe('Овсяные хлопья');
    expect(meal.items[0].calories).toBe(150);
    expect(meal.items[1].fiber).toBe(0);
    expect(meal.timestamp.startsWith('2026-07-10')).toBe(true);
  });
});
