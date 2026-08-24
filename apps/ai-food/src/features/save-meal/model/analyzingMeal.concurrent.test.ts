import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { resetMealAnalyzeInFlight } from '@/entities/meal/model/analyzeInFlight';
import { useDiaryStore } from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { beginAnalyzingMeal, runMealAnalyze } from './analyzingMeal';

vi.mock('@/features/analyze-food', () => ({
  analyzeFoodApi: vi.fn(),
}));

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

const mockAnalyzeResponse = {
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
        grams: 100,
      },
    ],
  },
  processingTime: 100,
};

function makeImage(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

describe('runMealAnalyze concurrency', () => {
  beforeEach(() => {
    resetMealAnalyzeInFlight();
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    vi.mocked(analyzeFoodApi).mockReset();
  });

  afterEach(() => {
    resetMealAnalyzeInFlight();
  });

  it('starts multiple analyzeFoodApi calls without waiting for the first to finish', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    vi.mocked(analyzeFoodApi)
      .mockImplementationOnce(async () => {
        await firstGate;
        return mockAnalyzeResponse;
      })
      .mockImplementationOnce(async () => mockAnalyzeResponse);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const handleA = beginAnalyzingMeal();
    const handleB = beginAnalyzingMeal();

    const doneA = runMealAnalyze(queryClient, handleA, { image: makeImage('a.jpg') });
    const doneB = runMealAnalyze(queryClient, handleB, { image: makeImage('b.jpg') });

    await vi.waitFor(() => expect(analyzeFoodApi).toHaveBeenCalledTimes(2));

    releaseFirst();
    await Promise.all([doneA, doneB]);
  });

  it('allows overlapping analyzeFoodApi calls during burst', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    vi.mocked(analyzeFoodApi).mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (inFlight === 1) {
        await firstGate;
      }
      inFlight -= 1;
      return mockAnalyzeResponse;
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const handles = [
      beginAnalyzingMeal(),
      beginAnalyzingMeal(),
      beginAnalyzingMeal(),
    ];
    const jobs = handles.map((handle, index) =>
      runMealAnalyze(queryClient, handle, {
        image: makeImage(`meal-${index}.jpg`),
      }),
    );

    await vi.waitFor(() => expect(analyzeFoodApi).toHaveBeenCalledTimes(3));
    expect(maxInFlight).toBeGreaterThan(1);

    releaseFirst();
    await Promise.all(jobs);
  });
});
