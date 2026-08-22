import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NutritionResult } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';

function baseResult(overrides: Partial<NutritionResult> = {}): NutritionResult {
  return {
    foodName: 'Салат',
    foodType: 'salad',
    calories: 300,
    protein: 20,
    carbs: 30,
    fat: 10,
    fiber: 5,
    confidence: 0.9,
    healthiness: 7,
    items: [],
    ...overrides,
  };
}

describe('applyAnalyzeResultToMeal', () => {
  beforeEach(() => {
    useDiaryStore.setState({
      meals: [
        {
          id: 'meal-1',
          timestamp: '2026-08-22T10:00:00.000Z',
          items: [],
          totalCalories: 0,
          status: 'analyzing',
          analyzeErrorCode: 'TIMEOUT',
          analyzeJobId: 'job-old',
        },
      ],
      selectedDate: new Date(),
    });
  });

  it('scales item grams to totalGrams and clears analyze fields', () => {
    applyAnalyzeResultToMeal(
      'meal-1',
      baseResult({
        totalGrams: 200,
        items: [
          {
            name: 'Помидор',
            calories: 100,
            protein: 2,
            carbs: 10,
            fat: 1,
            grams: 50,
          },
          {
            name: 'Огурец',
            calories: 50,
            protein: 1,
            carbs: 5,
            fat: 0,
            grams: 50,
          },
        ],
      }),
    );

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(meal.foodType).toBe('salad');
    expect(meal.totalGrams).toBe(200);
    expect(meal.items).toHaveLength(2);
    expect(meal.items[0].grams + meal.items[1].grams).toBeCloseTo(200, 5);
    expect(meal.analyzeErrorCode).toBeUndefined();
    expect(meal.analyzeJobId).toBeUndefined();
  });

  it('falls back to a single item when items are empty', () => {
    applyAnalyzeResultToMeal(
      'meal-1',
      baseResult({
        foodName: 'Яблоко',
        foodType: 'soup',
        calories: 80,
        protein: 0.5,
        carbs: 20,
        fat: 0.2,
        fiber: 2,
        totalGrams: 150,
        items: [],
      }),
      'fallback-id',
    );

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0]).toMatchObject({
      id: 'fallback-id',
      name: 'Яблоко',
      calories: 80,
      grams: 150,
    });
    expect(meal.foodType).toBe('soup');
    expect(meal.totalGrams).toBe(150);
    expect(meal.analyzeErrorCode).toBeUndefined();
    expect(meal.analyzeJobId).toBeUndefined();
  });
});
