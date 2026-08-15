import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import type { Meal, NutritionResult } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { resetMealAnalyzeInFlight } from '@/entities/meal/model/analyzeInFlight';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const waitForAnalyzeJob = vi.fn();
const parseAnalyzeFoodResponse = vi.fn();

vi.mock('@/features/analyze-food', () => ({
  waitForAnalyzeJob: (...args: unknown[]) => waitForAnalyzeJob(...args),
  parseAnalyzeFoodResponse: (...args: unknown[]) =>
    parseAnalyzeFoodResponse(...args),
}));

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

import { resumePendingAnalyzes } from './resumePendingAnalyzes';

const result: NutritionResult = {
  foodName: 'Омлет',
  calories: 250,
  protein: 18,
  carbs: 4,
  fat: 18,
  fiber: 0,
  confidence: 0.9,
  healthiness: 7,
  items: [
    {
      name: 'Омлет',
      calories: 250,
      protein: 18,
      carbs: 4,
      fat: 18,
      grams: 150,
      fiber: 0,
    },
  ],
};

function analyzingMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    timestamp: '2026-08-15T15:00:00.000Z',
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
    analyzeJobId: 'job-1',
    ...overrides,
  };
}

describe('resumePendingAnalyzes', () => {
  beforeEach(async () => {
    resetMealAnalyzeInFlight();
    waitForAnalyzeJob.mockReset();
    parseAnalyzeFoodResponse.mockReset();
    parseAnalyzeFoodResponse.mockReturnValue({
      result,
      processingTime: 0,
    });
    await act(async () => {
      await useDiaryStore.persist.rehydrate();
    });
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
  });

  afterEach(() => {
    resetMealAnalyzeInFlight();
  });

  it('applies a finished gateway job to the analyzing meal', async () => {
    useDiaryStore.setState({ meals: [analyzingMeal()] });
    waitForAnalyzeJob.mockResolvedValue('<foodName>Омлет</foodName>');
    const retry = vi.fn();

    await resumePendingAnalyzes(retry);

    const meal = useDiaryStore.getState().meals[0];
    expect(waitForAnalyzeJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({}),
    );
    expect(retry).not.toHaveBeenCalled();
    expect(meal.status).toBe('ready');
    expect(meal.name).toBe('Омлет');
    expect(meal.totalCalories).toBe(250);
    expect(meal.analyzeJobId).toBeUndefined();
  });

  it('retries locally when the gateway job is gone', async () => {
    useDiaryStore.setState({ meals: [analyzingMeal()] });
    waitForAnalyzeJob.mockRejectedValue({
      code: 'JOB_NOT_FOUND',
      status: 404,
      message: 'gone',
    });
    const retry = vi.fn().mockResolvedValue(undefined);

    await resumePendingAnalyzes(retry);

    expect(waitForAnalyzeJob).toHaveBeenCalled();
    expect(retry).toHaveBeenCalledWith('meal-1');
    expect(useDiaryStore.getState().meals[0].status).toBe('analyzing');
  });
});
