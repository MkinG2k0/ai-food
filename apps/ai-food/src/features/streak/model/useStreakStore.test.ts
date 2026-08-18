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
import { EMPTY_CALORIE_STREAK_PERSIST, localDateKey } from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useStreak, useStreakStore } from './useStreakStore';

function mealOn(date: Date, totalCalories = 100): Meal {
  return {
    id: crypto.randomUUID(),
    timestamp: date.toISOString(),
    items: [
      {
        id: 'item-1',
        name: 'Test',
        calories: totalCalories,
        protein: 10,
        carbs: 10,
        fat: 5,
        fiber: 2,
        grams: 100,
      },
    ],
    totalCalories,
    status: 'ready',
  };
}

const maintainProfile = {
  gender: 'male' as const,
  age: 28,
  height: 178,
  weight: 78,
  targetWeight: 78,
  targetWeightDate: '2026-10-16',
  activity: 'medium' as const,
  goal: 'maintain' as const,
  dietType: 'none' as const,
};

describe('useStreakStore', () => {
  beforeEach(async () => {
    await act(async () => {
      await useStreakStore.persist.rehydrate();
      await useProfileStore.persist.rehydrate();
    });
    useStreakStore.setState({
      currentLength: 0,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      lastCelebratedLocalDate: '',
      bestStreak: 0,
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
      clientUpdatedAt: new Date(0).toISOString(),
    });
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
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

  it('reconciles calorieStreak.currentLength from diary after hydrate', async () => {
    const yesterday = new Date(2026, 7, 17, 12, 0, 0, 0);
    const now = new Date(2026, 7, 18, 12, 0, 0, 0);

    useProfileStore.setState({
      profile: maintainProfile,
      targets: { kcal: 2000, protein: 150, fat: 60, carbs: 200, fiber: 25 },
    });
    useDiaryStore.setState({
      meals: [mealOn(yesterday, 2000)],
    });

    const { result } = renderHook(() => useStreak(now));

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
      expect(result.current.snapshot.calorie.currentLength).toBe(1);
      expect(useStreakStore.getState().calorieStreak.currentLength).toBe(1);
    });
  });
});
