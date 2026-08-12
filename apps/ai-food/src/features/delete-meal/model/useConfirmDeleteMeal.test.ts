import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  beginMealAnalyze,
  useDiaryStore,
} from '@/entities/meal';
import { resetMealAnalyzeInFlight } from '@/entities/meal/model/analyzeInFlight';
import type { Meal } from '@ai-food/shared-types';
import { useConfirmDeleteMeal } from './useConfirmDeleteMeal';

const meal: Meal = {
  id: 'meal-analyzing',
  timestamp: '2026-08-12T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Анализ…',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      grams: 100,
    },
  ],
  totalCalories: 0,
  status: 'analyzing',
};

describe('useConfirmDeleteMeal', () => {
  beforeEach(async () => {
    resetMealAnalyzeInFlight();
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({ meals: [meal], selectedDate: new Date() });
  });

  it('aborts in-flight analyze when confirming delete', () => {
    const signal = beginMealAnalyze(meal.id);
    const { result } = renderHook(() => useConfirmDeleteMeal());

    act(() => {
      result.current.openConfirm(meal.id);
    });

    let deletedId: string | null = null;
    act(() => {
      deletedId = result.current.confirmDelete();
    });

    expect(deletedId).toBe(meal.id);
    expect(signal.aborted).toBe(true);
    expect(useDiaryStore.getState().meals).toHaveLength(0);
  });
});
