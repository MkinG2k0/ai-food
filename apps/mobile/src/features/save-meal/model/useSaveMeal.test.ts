import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSaveMeal } from './useSaveMeal';
import { useDiaryStore } from '@/entities/meal';
import { isSameDay } from '@/shared/lib';

vi.mock('@/features/analyze-food', () => ({
  analyzeFoodApi: vi.fn().mockResolvedValue({
    result: {
      foodName: 'Test Food',
      calories: 300,
      protein: 20,
      carbs: 30,
      fat: 10,
      fiber: 5,
      confidence: 0.9,
    },
    processingTime: 100,
  }),
  useAnalyzeFood: vi.fn(),
}));

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    saveMealImage: vi.fn().mockResolvedValue('meal-images/test.jpg'),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSaveMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
  });

  it('uses past selectedDate for text meal timestamp', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    past.setHours(0, 0, 0, 0);
    useDiaryStore.getState().setSelectedDate(past);

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: 'Салат' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal).toBeDefined();
    expect(isSameDay(new Date(meal.timestamp), past)).toBe(true);
  });

  it('uses today for meal timestamp when selectedDate is today', async () => {
    const today = new Date();
    useDiaryStore.getState().setSelectedDate(today);

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: 'Каша' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(isSameDay(new Date(meal.timestamp), new Date())).toBe(true);
  });

  it('sets analyzing meal timestamp from past selectedDate for photo path', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    past.setHours(12, 0, 0, 0);
    useDiaryStore.getState().setSelectedDate(past);

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['fake'], 'food.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file, description: 'фото' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal).toBeDefined();
    expect(isSameDay(new Date(meal.timestamp), past)).toBe(true);
  });
});
