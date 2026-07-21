import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { Meal } from '@ai-food/shared-types';
import { useRetryAnalyzeMeal } from './useRetryAnalyzeMeal';
import { useDiaryStore } from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { loadMealImageAsFile } from '@/shared/lib';

vi.mock('@/features/analyze-food', () => ({
  analyzeFoodApi: vi.fn().mockResolvedValue({
    result: {
      foodName: 'Retried Food',
      calories: 400,
      protein: 25,
      carbs: 40,
      fat: 12,
      fiber: 6,
      confidence: 0.92,
      healthiness: 7,
      items: [
        {
          name: 'Retried Food',
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 12,
          fiber: 6,
          grams: 200,
        },
      ],
    },
    processingTime: 100,
  }),
  useAnalyzeFood: vi.fn(),
}));

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    loadMealImageAsFile: vi.fn(),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function errorMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    timestamp: new Date().toISOString(),
    name: 'Салат',
    items: [
      {
        id: 'item-1',
        name: 'Салат',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        grams: 100,
      },
    ],
    totalCalories: 0,
    portions: 1,
    status: 'error',
    ...overrides,
  };
}

describe('useRetryAnalyzeMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    vi.mocked(analyzeFoodApi).mockClear();
    vi.mocked(loadMealImageAsFile).mockReset();
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Retried Food',
        calories: 400,
        protein: 25,
        carbs: 40,
        fat: 12,
        fiber: 6,
        confidence: 0.92,
        healthiness: 7,
        items: [
          {
            name: 'Retried Food',
            calories: 400,
            protein: 25,
            carbs: 40,
            fat: 12,
            fiber: 6,
            grams: 200,
          },
        ],
      },
      processingTime: 100,
    });
  });

  it('retries photo meal: analyzing → File from storage → ready with nutrition', async () => {
    const file = new File(['bytes'], 'retry.jpg', { type: 'image/jpeg' });
    vi.mocked(loadMealImageAsFile).mockResolvedValue(file);
    useDiaryStore.setState({
      meals: [
        errorMeal({
          imageUri: 'meal-images/abc.jpg',
          name: undefined,
        }),
      ],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(loadMealImageAsFile).toHaveBeenCalledWith('meal-images/abc.jpg');
    expect(analyzeFoodApi).toHaveBeenCalledWith(
      file,
      expect.objectContaining({}),
    );

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.name).toBe('Retried Food');
    expect(meal.totalCalories).toBe(400);
    expect(meal.items[0].name).toBe('Retried Food');
    expect(meal.healthiness).toBe(7);
    expect(meal.confidence).toBe(0.92);
  });

  it('retries multi-angle meal with all saved photos', async () => {
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    vi.mocked(loadMealImageAsFile)
      .mockResolvedValueOnce(a)
      .mockResolvedValueOnce(b);
    useDiaryStore.setState({
      meals: [
        errorMeal({
          imageUri: 'meal-images/a.jpg',
          imageUris: ['meal-images/a.jpg', 'meal-images/b.jpg'],
          name: undefined,
        }),
      ],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(loadMealImageAsFile).toHaveBeenCalledWith('meal-images/a.jpg');
    expect(loadMealImageAsFile).toHaveBeenCalledWith('meal-images/b.jpg');
    expect(analyzeFoodApi).toHaveBeenCalledWith(
      { images: [a, b] },
      expect.objectContaining({}),
    );
    expect(useDiaryStore.getState().meals[0].status).toBe('ready');
  });

  it('retries text meal with description when no imageUri', async () => {
    useDiaryStore.setState({
      meals: [errorMeal({ name: 'Домашний суп', imageUri: undefined })],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(loadMealImageAsFile).not.toHaveBeenCalled();
    expect(analyzeFoodApi).toHaveBeenCalledWith(
      { description: 'Домашний суп' },
      expect.objectContaining({}),
    );

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.name).toBe('Retried Food');
  });

  it('sets status error again when analyzeFoodApi rejects', async () => {
    vi.mocked(analyzeFoodApi).mockRejectedValue({
      message: 'fail',
      code: 'ANALYSIS_FAILED',
      status: 500,
    });
    useDiaryStore.setState({
      meals: [errorMeal({ name: 'суп' })],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(analyzeFoodApi).toHaveBeenCalled();
    expect(useDiaryStore.getState().meals[0].status).toBe('error');
  });

  it('does not call analyzeFoodApi for unknown meal id', async () => {
    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('missing');
    });

    expect(analyzeFoodApi).not.toHaveBeenCalled();
  });

  it('does not call analyzeFoodApi when no image and unusable name', async () => {
    useDiaryStore.setState({
      meals: [
        errorMeal({
          name: 'Анализ…',
          imageUri: undefined,
        }),
      ],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(analyzeFoodApi).not.toHaveBeenCalled();
    expect(useDiaryStore.getState().meals[0].status).toBe('error');
  });

  it('leaves status error when image load returns null', async () => {
    vi.mocked(loadMealImageAsFile).mockResolvedValue(null);
    useDiaryStore.setState({
      meals: [
        errorMeal({
          imageUri: 'meal-images/gone.jpg',
          name: undefined,
        }),
      ],
    });

    const { result } = renderHook(() => useRetryAnalyzeMeal(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current('meal-1');
    });

    expect(analyzeFoodApi).not.toHaveBeenCalled();
    expect(useDiaryStore.getState().meals[0].status).toBe('error');
  });
});
