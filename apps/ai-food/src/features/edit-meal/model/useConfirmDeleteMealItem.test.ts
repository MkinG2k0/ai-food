import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import type { Meal } from '@ai-food/shared-types';
import { useConfirmDeleteMealItem } from './useConfirmDeleteMealItem';

const meal: Meal = {
  id: 'meal-1',
  timestamp: '2026-08-12T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Яблоко',
      calories: 80,
      protein: 0,
      carbs: 20,
      fat: 0,
      fiber: 3,
      grams: 150,
    },
    {
      id: 'item-2',
      name: 'Йогурт',
      calories: 120,
      protein: 8,
      carbs: 12,
      fat: 4,
      fiber: 0,
      grams: 125,
    },
  ],
  totalCalories: 200,
  status: 'ready',
};

describe('useConfirmDeleteMealItem', () => {
  beforeEach(async () => {
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({ meals: [meal], selectedDate: new Date() });
  });

  it('opens and closes confirm dialog state', () => {
    const { result } = renderHook(() => useConfirmDeleteMealItem());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.pending).toBeNull();

    act(() => {
      result.current.openConfirm('meal-1', 'item-1');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.pending).toEqual({ mealId: 'meal-1', itemId: 'item-1' });

    act(() => {
      result.current.closeConfirm();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('removes item on confirmDelete and clears pending', () => {
    const { result } = renderHook(() => useConfirmDeleteMealItem());

    act(() => {
      result.current.openConfirm('meal-1', 'item-1');
    });

    let deleted: { mealId: string; itemId: string } | null = null;
    act(() => {
      deleted = result.current.confirmDelete();
    });

    expect(deleted).toEqual({ mealId: 'meal-1', itemId: 'item-1' });
    expect(result.current.pending).toBeNull();
    expect(useDiaryStore.getState().meals[0].items).toHaveLength(1);
    expect(useDiaryStore.getState().meals[0].items[0].id).toBe('item-2');
  });

  it('returns null when confirmDelete called without pending', () => {
    const { result } = renderHook(() => useConfirmDeleteMealItem());

    let deleted: { mealId: string; itemId: string } | null = { mealId: '', itemId: '' };
    act(() => {
      deleted = result.current.confirmDelete();
    });

    expect(deleted).toBeNull();
  });
});
