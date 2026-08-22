import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncStreakApi = vi.fn();
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

vi.mock('../api/syncStreakApi', () => ({
  syncStreakApi: (...args: unknown[]) => syncStreakApi(...args),
}));

import { useDiaryStore } from '@/entities/meal';
import { EMPTY_CALORIE_STREAK_PERSIST } from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useStreakStore } from '@/features/streak/model/useStreakStore';
import { buildFreshStreakSyncPayload, syncStreak } from './syncStreak';

describe('syncStreak', () => {
  beforeEach(async () => {
    syncStreakApi.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useStreakStore.setState({
      currentLength: 0,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      lastCelebratedLocalDate: '',
      bestStreak: 0,
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
      clientUpdatedAt: '2026-08-01T00:00:00.000Z',
    });
    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
  });

  it('guest noop — no API call', async () => {
    getAuthState.mockReturnValue({ userToken: null });
    await syncStreak();
    expect(syncStreakApi).not.toHaveBeenCalled();
  });

  it('diary change bumps clientUpdatedAt and response wins on newer clock', async () => {
    const now = new Date('2026-08-22T12:00:00.000Z');
    useDiaryStore.setState({
      meals: [
        {
          id: 'm1',
          timestamp: now.toISOString(),
          items: [
            {
              id: 'i1',
              name: 'Еда',
              calories: 500,
              protein: 20,
              carbs: 40,
              fat: 20,
              fiber: 5,
              grams: 200,
            },
          ],
          totalCalories: 500,
          status: 'ready',
        },
      ],
    });

    syncStreakApi.mockImplementation(async (body: { clientUpdatedAt: string }) => ({
      streak: {
        currentLength: 9,
        freezeCount: 1,
        consumedFreezeDateKeys: [],
        grantedMilestones: [],
        lastCelebratedLocalDate: '',
        bestStreak: 9,
        calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
      },
      clientUpdatedAt: '2099-01-01T00:00:00.000Z',
      // echo that remote is newer
      _localSent: body.clientUpdatedAt,
    }));

    await syncStreak();

    expect(syncStreakApi).toHaveBeenCalledTimes(1);
    const sent = syncStreakApi.mock.calls[0][0];
    expect(Date.parse(sent.clientUpdatedAt)).toBeGreaterThan(
      Date.parse('2026-08-01T00:00:00.000Z'),
    );
    expect(useStreakStore.getState().currentLength).toBe(9);
    expect(useStreakStore.getState().clientUpdatedAt).toBe(
      '2099-01-01T00:00:00.000Z',
    );
  });

  it('buildFreshStreakSyncPayload uses null calorie input without goal', () => {
    useProfileStore.setState({
      profile: {
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        targetWeight: 80,
        targetWeightDate: '2026-10-01',
        activity: 'medium',
        goal: 'lose',
        dietType: 'none',
      },
      targets: { kcal: 0, protein: 100, fat: 60, carbs: 200, fiber: 0 },
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });

    const payload = buildFreshStreakSyncPayload(
      new Date('2026-08-22T12:00:00.000Z'),
    );
    expect(payload.calorieStreak).toEqual(EMPTY_CALORIE_STREAK_PERSIST);
  });
});
