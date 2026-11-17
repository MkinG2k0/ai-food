import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isMealAnalyzeInFlight,
  resetMealAnalyzeInFlight,
} from '@/entities/meal/model/analyzeInFlight';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import {
  beginAnalyzingMeal,
  cancelAnalyzingMeal,
} from './analyzingMeal';

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

describe('cancelAnalyzingMeal', () => {
  beforeEach(() => {
    resetMealAnalyzeInFlight();
    useDiaryStore.setState({
      meals: [],
      pendingDeletes: [],
      selectedDate: new Date('2026-08-13T12:00:00.000Z'),
    });
    vi.mocked(queueDiarySync).mockClear();
  });

  afterEach(() => {
    resetMealAnalyzeInFlight();
  });

  it('ends in-flight analyze, records tombstone, and queues delete sync', () => {
    const { mealId } = beginAnalyzingMeal({ description: 'тест' });
    expect(isMealAnalyzeInFlight(mealId)).toBe(true);
    expect(useDiaryStore.getState().meals.some((m) => m.id === mealId)).toBe(
      true,
    );
    expect(queueDiarySync).toHaveBeenCalledWith({
      mode: 'upsert',
      mealIds: [mealId],
    });

    cancelAnalyzingMeal(mealId);

    expect(isMealAnalyzeInFlight(mealId)).toBe(false);
    expect(
      useDiaryStore.getState().pendingDeletes.some((d) => d.id === mealId),
    ).toBe(true);
    expect(queueDiarySync).toHaveBeenCalledWith({
      mode: 'delete',
      mealIds: [mealId],
    });
  });
});
