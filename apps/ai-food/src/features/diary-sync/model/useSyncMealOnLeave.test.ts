import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const syncDiaryMeals = vi.fn();
const getAuthState = vi.fn();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

vi.mock('./syncDiaryMeals', () => ({
  syncDiaryMeals: (...args: unknown[]) => syncDiaryMeals(...args),
}));

import { useDiaryStore } from '@/entities/meal';
import { useSyncMealOnLeave } from './useSyncMealOnLeave';

describe('useSyncMealOnLeave', () => {
  beforeEach(() => {
    syncDiaryMeals.mockReset();
    syncDiaryMeals.mockResolvedValue(undefined);
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useDiaryStore.setState({
      meals: [
        {
          id: 'meal-1',
          timestamp: '2026-08-22T08:00:00.000Z',
          items: [],
          totalCalories: 100,
          status: 'ready',
        },
      ],
      selectedDate: new Date(),
    });
  });

  it('upserts meal on unmount when user is logged in', () => {
    const { unmount } = renderHook(({ id }) => useSyncMealOnLeave(id), {
      initialProps: { id: 'meal-1' },
    });

    unmount();

    expect(syncDiaryMeals).toHaveBeenCalledWith({
      mode: 'upsert',
      mealIds: ['meal-1'],
    });
  });

  it('skips sync on unmount for guest users', () => {
    getAuthState.mockReturnValue({ userToken: null });
    const { unmount } = renderHook(() => useSyncMealOnLeave('meal-1'));
    unmount();
    expect(syncDiaryMeals).not.toHaveBeenCalled();
  });

  it('skips sync when meal was removed before unmount', () => {
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    const { unmount } = renderHook(() => useSyncMealOnLeave('meal-1'));
    unmount();
    expect(syncDiaryMeals).not.toHaveBeenCalled();
  });
});
