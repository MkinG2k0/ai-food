import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiaryStore } from './useDiaryStore';
import type { Meal } from '@ai-food/shared-types';

const mockMeal: Meal = {
  id: '1',
  timestamp: '2026-06-24T10:00:00.000Z',
  items: [
    {
      id: 'item-1',
      name: 'Chicken Salad',
      calories: 320,
      protein: 35,
      carbs: 18,
      fat: 12,
      portion: '1 serving',
    },
  ],
  totalCalories: 320,
};

describe('useDiaryStore', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [] });
  });

  it('starts with empty meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.meals).toHaveLength(0);
  });

  it('adds a meal', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    expect(result.current.meals).toHaveLength(1);
    expect(result.current.meals[0]).toEqual(mockMeal);
  });

  it('prepends newer meals (newest first)', () => {
    const { result } = renderHook(() => useDiaryStore());
    const meal2: Meal = { ...mockMeal, id: '2', timestamp: '2026-06-24T11:00:00.000Z' };
    act(() => result.current.addMeal(mockMeal));
    act(() => result.current.addMeal(meal2));
    expect(result.current.meals[0].id).toBe('2');
    expect(result.current.meals[1].id).toBe('1');
  });

  it('clears all meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    act(() => result.current.clearDiary());
    expect(result.current.meals).toHaveLength(0);
  });

  it('updates a meal by id', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    act(() =>
      result.current.updateMeal('1', {
        status: 'ready',
        totalCalories: 400,
      })
    );
    expect(result.current.meals[0].totalCalories).toBe(400);
    expect(result.current.meals[0].status).toBe('ready');
  });

  it('removes a meal by id', () => {
    const { result } = renderHook(() => useDiaryStore());
    act(() => result.current.addMeal(mockMeal));
    act(() => result.current.removeMeal('1'));
    expect(result.current.meals).toHaveLength(0);
  });
});
