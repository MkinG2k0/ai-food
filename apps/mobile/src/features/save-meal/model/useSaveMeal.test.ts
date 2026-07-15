import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSaveMeal } from './useSaveMeal';
import { useDiaryStore } from '@/entities/meal';
import { isSameDay } from '@/shared/lib';
import { analyzeFoodApi } from '@/features/analyze-food';

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
      items: [
        {
          name: 'Test Food',
          calories: 300,
          protein: 20,
          carbs: 30,
          fat: 10,
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
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Test Food',
        calories: 300,
        protein: 20,
        carbs: 30,
        fat: 10,
        fiber: 5,
        confidence: 0.9,
        items: [
          {
            name: 'Test Food',
            calories: 300,
            protein: 20,
            carbs: 30,
            fat: 10,
          },
        ],
      },
      processingTime: 100,
    });
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

  it('maps multiple analyze items to FoodItem[] with unique ids', async () => {
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Бургер с картошкой',
        calories: 850,
        protein: 35,
        carbs: 78,
        fat: 42,
        fiber: 7,
        confidence: 0.91,
        items: [
          {
            name: 'Бургер',
            calories: 550,
            protein: 28,
            carbs: 40,
            fat: 28,
            grams: 150,
          },
          {
            name: 'Картофель фри',
            calories: 300,
            protein: 7,
            carbs: 38,
            fat: 14,
          },
        ],
      },
      processingTime: 100,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['fake'], 'burger.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.items).toHaveLength(2);
    expect(meal.items[0].name).toBe('Бургер');
    expect(meal.items[0].calories).toBe(550);
    expect(meal.items[0].grams).toBe(150);
    expect(meal.items[1].name).toBe('Картофель фри');
    expect(meal.items[1].calories).toBe(300);
    expect(meal.items[1].grams).toBe(100);
    expect(meal.items[0].id).not.toBe(meal.items[1].id);
    expect(meal.totalCalories).toBe(850);
    expect(meal.name).toBe('Бургер с картошкой');
  });

  it('falls back to single FoodItem from foodName when items is empty', async () => {
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Овсянка с ягодами',
        calories: 350,
        protein: 12,
        carbs: 55,
        fat: 8,
        fiber: 6,
        confidence: 0.9,
        items: [],
      },
      processingTime: 100,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['fake'], 'oats.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0].name).toBe('Овсянка с ягодами');
    expect(meal.items[0].calories).toBe(350);
    expect(meal.items[0].protein).toBe(12);
    expect(meal.items[0].grams).toBe(100);
    expect(meal.totalCalories).toBe(350);
    expect(meal.name).toBe('Овсянка с ягодами');
  });

  it('sets meal.name from trimmed description for no-image meals', async () => {
    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: '  Домашний салат  ' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.name).toBe('Домашний салат');
    expect(meal.status).toBe('ready');
    expect(meal.items[0].grams).toBe(100);
  });

  it('sets meal.name to Без названия when no-image description is empty', async () => {
    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: '   ' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.name).toBe('Без названия');
  });
});
