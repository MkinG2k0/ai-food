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
      healthiness: 7,
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
    saveMealImage: vi.fn().mockImplementation(async (file: File) => {
      return `meal-images/${file.name}`;
    }),
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
    vi.mocked(analyzeFoodApi).mockClear();
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Test Food',
        calories: 300,
        protein: 20,
        carbs: 30,
        fat: 10,
        fiber: 5,
        confidence: 0.9,
        healthiness: 7,
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

  it('passes all images to analyzeFoodApi and saves all uris in diary', async () => {
    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ images: [a, b] });
    });

    expect(analyzeFoodApi).toHaveBeenCalledWith(
      { images: [a, b] },
      expect.objectContaining({}),
    );
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.imageUri).toBeTruthy();
    expect(meal.imageUris).toHaveLength(2);
    expect(meal.imageUris?.[0]).toBe(meal.imageUri);
  });

  it('passes image with user description to analyzeFoodApi', async () => {
    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['fake'], 'food.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file, description: '  куриный салат  ' });
    });

    expect(analyzeFoodApi).toHaveBeenCalledWith(
      { image: file, description: 'куриный салат' },
      expect.objectContaining({}),
    );
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.name).toBe('Test Food');
    expect(meal.imageUri).toBeTruthy();
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
        healthiness: 5,
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
    expect(meal.healthiness).toBe(5);
    expect(meal.confidence).toBe(0.91);
  });

  it('persists micronutrients from analyze result onto the meal', async () => {
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Шпинатный салат',
        calories: 180,
        protein: 8,
        carbs: 12,
        fat: 10,
        fiber: 5,
        confidence: 0.88,
        healthiness: 9,
        items: [
          {
            name: 'Шпинат',
            calories: 180,
            protein: 8,
            carbs: 12,
            fat: 10,
            fiber: 5,
            grams: 120,
          },
        ],
        micronutrients: [
          { id: 'iron', amount: 3.5, unit: 'mg' },
          { id: 'vitaminC', amount: 20, unit: 'mg' },
          { id: 'vitaminD', amount: 0, unit: 'µg' },
        ],
      },
      processingTime: 80,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['fake'], 'salad.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.micronutrients).toEqual([
      { id: 'iron', amount: 3.5, unit: 'mg' },
      { id: 'vitaminC', amount: 20, unit: 'mg' },
      { id: 'vitaminD', amount: 0, unit: 'µg' },
    ]);
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
        healthiness: 8,
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
    expect(meal.healthiness).toBe(8);
    expect(meal.confidence).toBe(0.9);
  });

  it('analyzes text description via AI and persists nutrition result', async () => {
    vi.mocked(analyzeFoodApi).mockResolvedValue({
      result: {
        foodName: 'Домашний салат',
        calories: 220,
        protein: 12,
        carbs: 18,
        fat: 10,
        fiber: 4,
        confidence: 0.85,
        healthiness: 8,
        items: [
          {
            name: 'Салат',
            calories: 220,
            protein: 12,
            carbs: 18,
            fat: 10,
            fiber: 4,
            grams: 250,
          },
        ],
      },
      processingTime: 90,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: '  Домашний салат  ' });
    });

    expect(analyzeFoodApi).toHaveBeenCalledWith(
      { description: 'Домашний салат' },
      expect.objectContaining({}),
    );

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.name).toBe('Домашний салат');
    expect(meal.status).toBe('ready');
    expect(meal.totalCalories).toBe(220);
    expect(meal.items[0].calories).toBe(220);
    expect(meal.items[0].grams).toBe(250);
    expect(meal.healthiness).toBe(8);
    expect(meal.confidence).toBe(0.85);
  });

  it('sets text meal to error when description analysis fails', async () => {
    vi.mocked(analyzeFoodApi).mockRejectedValue({
      message: 'fail',
      code: 'ANALYSIS_FAILED',
      status: 500,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: 'суп' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('error');
  });

  it('stores analyzeErrorCode NO_FOOD_DETECTED when photo has no food', async () => {
    vi.mocked(analyzeFoodApi).mockRejectedValue({
      message: 'На фото не обнаружена еда. Сфотографируйте блюдо и попробуйте снова.',
      code: 'NO_FOOD_DETECTED',
      status: 422,
    });

    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });
    const file = new File(['img'], 'cat.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current({ image: file });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('error');
    expect(meal.analyzeErrorCode).toBe('NO_FOOD_DETECTED');
  });

  it('sets meal.name to Без названия when no-image description is empty', async () => {
    const { result } = renderHook(() => useSaveMeal(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current({ description: '   ' });
    });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.name).toBe('Без названия');
    expect(analyzeFoodApi).not.toHaveBeenCalled();
  });
});
