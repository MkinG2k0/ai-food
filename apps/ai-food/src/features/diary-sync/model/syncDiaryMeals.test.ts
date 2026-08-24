import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncMealsApi = vi.fn();
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

vi.mock('../api/syncMealsApi', () => ({
  syncMealsApi: (...args: unknown[]) => syncMealsApi(...args),
}));

import { useDiaryStore } from '@/entities/meal';
import { syncDiaryMeals } from './syncDiaryMeals';

describe('syncDiaryMeals', () => {
  beforeEach(() => {
    syncMealsApi.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useDiaryStore.setState({
      meals: [
        {
          id: 'm1',
          timestamp: '2026-08-22T08:00:00.000Z',
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
          items: [],
          totalCalories: 100,
          status: 'ready',
          name: 'Local',
        },
      ],
      pendingDeletes: [
        { id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' },
      ],
      selectedDate: new Date(),
    });
  });

  it('no-ops without token', async () => {
    getAuthState.mockReturnValue({ userToken: null });
    await syncDiaryMeals({ mode: 'full' });
    expect(syncMealsApi).not.toHaveBeenCalled();
  });

  it('full mode posts payload, applies response, clears pendingDeletes', async () => {
    syncMealsApi.mockResolvedValue({
      meals: [
        {
          id: 'm1',
          timestamp: '2026-08-22T08:00:00.000Z',
          clientUpdatedAt: '2026-08-22T09:00:00.000Z',
          items: [],
          totalCalories: 200,
          status: 'ready',
          name: 'Remote',
        },
      ],
      tombstones: ['gone'],
    });

    await syncDiaryMeals({ mode: 'full' });

    expect(syncMealsApi).toHaveBeenCalledTimes(1);
    const body = syncMealsApi.mock.calls[0][0];
    expect(body.upserts.some((u: { id: string }) => u.id === 'm1')).toBe(true);
    expect(body.deletes).toEqual([
      { id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' },
    ]);

    const state = useDiaryStore.getState();
    expect(state.meals[0].name).toBe('Remote');
    expect(state.pendingDeletes).toEqual([]);
  });

  it('applies sync response onto latest local state, not the request snapshot', async () => {
    useDiaryStore.setState({
      meals: [
        {
          id: 'm1',
          timestamp: '2026-08-22T08:00:00.000Z',
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
          items: [],
          totalCalories: 100,
          status: 'analyzing',
          name: 'Анализ…',
        },
      ],
      pendingDeletes: [],
      selectedDate: new Date(),
    });

    let releaseSync!: () => void;
    const syncGate = new Promise<void>((resolve) => {
      releaseSync = resolve;
    });

    syncMealsApi.mockImplementation(async () => {
      await syncGate;
      return {
        meals: [
          {
            id: 'm1',
            timestamp: '2026-08-22T08:00:00.000Z',
            clientUpdatedAt: '2026-08-22T08:00:00.000Z',
            items: [],
            totalCalories: 100,
            status: 'analyzing',
            name: 'Анализ…',
          },
        ],
        tombstones: [],
      };
    });

    const syncPromise = syncDiaryMeals({ mode: 'upsert', mealIds: ['m1'] });

    useDiaryStore.getState().updateMeal('m1', {
      imageUri: 'meal-images/late.jpg',
      imageUris: ['meal-images/late.jpg'],
    });

    releaseSync();
    await syncPromise;

    const meal = useDiaryStore.getState().meals.find((m) => m.id === 'm1');
    expect(meal?.imageUri).toBe('meal-images/late.jpg');
  });
});
