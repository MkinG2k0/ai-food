import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  isMealAnalyzeInFlight,
  mealShowsAnalyzeLoader,
  mealShowsAnalyzeRetry,
  resetMealAnalyzeInFlight,
  useDiaryStore,
} from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import {
  beginAnalyzingMeal,
  runMealAnalyze,
} from './analyzingMeal';

vi.mock('@/features/analyze-food', () => ({
  analyzeFoodApi: vi.fn(),
}));

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

const okResponse = {
  result: {
    foodName: 'Салат',
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: 3,
    confidence: 0.9,
    healthiness: 8,
    items: [
      {
        name: 'Салат',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        grams: 150,
      },
    ],
  },
  processingTime: 50,
};

describe('runMealAnalyze lifecycle sync', () => {
  beforeEach(() => {
    resetMealAnalyzeInFlight();
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    vi.mocked(analyzeFoodApi).mockReset();
  });

  afterEach(() => {
    resetMealAnalyzeInFlight();
  });

  it('UPSTREAM_ERROR ends in-flight and shows Retry without loader', async () => {
    vi.mocked(analyzeFoodApi).mockImplementation(async (_input, options) => {
      options?.onJobId?.('job-up');
      throw {
        message: 'Upstream request failed.',
        code: 'UPSTREAM_ERROR',
        status: 500,
      };
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const handle = beginAnalyzingMeal({ description: 'суп' });
    expect(mealShowsAnalyzeLoader(
      useDiaryStore.getState().meals[0],
    )).toBe(true);

    await runMealAnalyze(queryClient, handle, { description: 'суп' });

    const meal = useDiaryStore.getState().meals[0];
    expect(isMealAnalyzeInFlight(handle.mealId)).toBe(false);
    expect(meal.status).toBe('error');
    expect(meal.analyzeErrorCode).toBe('UPSTREAM_ERROR');
    expect(meal.analyzeJobId).toBeUndefined();
    expect(mealShowsAnalyzeLoader(meal)).toBe(false);
    expect(mealShowsAnalyzeRetry(meal)).toBe(true);
  });

  it('success clears analyzing and does not show Retry', async () => {
    vi.mocked(analyzeFoodApi).mockResolvedValue(okResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const handle = beginAnalyzingMeal({ description: 'салат' });

    await runMealAnalyze(queryClient, handle, { description: 'салат' });

    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('ready');
    expect(mealShowsAnalyzeLoader(meal)).toBe(false);
    expect(mealShowsAnalyzeRetry(meal)).toBe(false);
    expect(isMealAnalyzeInFlight(handle.mealId)).toBe(false);
  });

  it('client abort leaves meal analyzing for the newer attempt to own', async () => {
    let rejectFirst!: (error: unknown) => void;
    vi.mocked(analyzeFoodApi).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const handle = beginAnalyzingMeal({ description: 'суп' });
    const pending = runMealAnalyze(queryClient, handle, {
      description: 'суп',
    });

    // Simulate Retry: begin a new analyze which aborts the first signal.
    const { beginMealAnalyze } = await import('@/entities/meal');
    beginMealAnalyze(handle.mealId);
    rejectFirst({ message: 'aborted', code: 'ANALYSIS_FAILED', status: 499 });
    await pending;

    // Aborted attempt must not stamp a terminal error over the new in-flight.
    const meal = useDiaryStore.getState().meals[0];
    expect(meal.status).toBe('analyzing');
    expect(meal.analyzeErrorCode).toBeUndefined();
  });
});
