import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import { localDateKey } from '@/entities/streak';
import { useStreak, useStreakStore } from './useStreakStore';

function mealOn(date: Date): Meal {
  return {
    id: crypto.randomUUID(),
    timestamp: date.toISOString(),
    items: [
      {
        id: 'item-1',
        name: 'Test',
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        fiber: 2,
        grams: 100,
      },
    ],
    totalCalories: 100,
    status: 'ready',
  };
}

describe('useStreakStore', () => {
  beforeEach(async () => {
    await act(async () => {
      await useStreakStore.persist.rehydrate();
    });
    useStreakStore.setState({
      currentLength: 0,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      lastCelebratedLocalDate: '',
      bestStreak: 0,
      clientUpdatedAt: new Date(0).toISOString(),
    });
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
  });

  it('reconciles freeze consumption after hydrate when meals change', async () => {
    const friday = new Date(2026, 7, 14, 12, 0, 0, 0);
    const sunday = new Date(2026, 7, 16, 12, 0, 0, 0);
    const now = new Date(2026, 7, 17, 12, 0, 0, 0);

    useStreakStore.setState({ freezeCount: 1 });
    useDiaryStore.setState({
      meals: [mealOn(friday), mealOn(sunday)],
    });

    const { result } = renderHook(() => useStreak(now));

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
      expect(useStreakStore.getState().consumedFreezeDateKeys).toEqual([
        '2026-08-15',
      ]);
    });
  });

  it('markCelebrated prevents shouldCelebrate on the same day', async () => {
    const now = new Date(2026, 7, 18, 12, 0, 0, 0);
    useDiaryStore.setState({ meals: [mealOn(now)] });

    const { result } = renderHook(() => useStreak(now));

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
      expect(result.current.snapshot.shouldCelebrate).toBe(true);
    });

    act(() => {
      result.current.markCelebrated(localDateKey(now));
    });

    expect(result.current.snapshot.shouldCelebrate).toBe(false);
  });
});
