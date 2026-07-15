import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiaryStore } from './useDiaryStore';
import { isSameDay } from '@/shared/lib';
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
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
  });

  it('starts with empty meals', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.meals).toHaveLength(0);
  });

  it('exposes selectedDate defaulting to today', () => {
    const { result } = renderHook(() => useDiaryStore());
    expect(result.current.selectedDate).toBeInstanceOf(Date);
    expect(isSameDay(result.current.selectedDate, new Date())).toBe(true);
  });

  it('updates selectedDate via setSelectedDate', () => {
    const { result } = renderHook(() => useDiaryStore());
    const past = new Date();
    past.setDate(past.getDate() - 3);
    act(() => result.current.setSelectedDate(past));
    expect(isSameDay(result.current.selectedDate, past)).toBe(true);
  });

  it('clearDiary does not wipe selectedDate', () => {
    const { result } = renderHook(() => useDiaryStore());
    const past = new Date();
    past.setDate(past.getDate() - 2);
    act(() => {
      result.current.setSelectedDate(past);
      result.current.addMeal(mockMeal);
      result.current.clearDiary();
    });
    expect(result.current.meals).toHaveLength(0);
    expect(isSameDay(result.current.selectedDate, past)).toBe(true);
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
