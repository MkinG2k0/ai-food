import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const preferencesSet = vi.fn();
const kbjuRefresh = vi.fn();
const isNativePlatform = vi.fn(() => false);

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: (...args: unknown[]) => preferencesSet(...args),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
  registerPlugin: () => ({
    refresh: (...args: unknown[]) => kbjuRefresh(...args),
  }),
}));

import { useDiaryStore } from '@/entities/meal';
import { EMPTY_CALORIE_STREAK_PERSIST } from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useStreakStore } from '@/features/streak';
import { STREAK_WIDGET_PREFS_KEY } from './buildStreakWidgetSnapshot';
import { syncStreakWidget } from './syncStreakWidget';

describe('syncStreakWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    preferencesSet.mockReset();
    preferencesSet.mockResolvedValue(undefined);
    kbjuRefresh.mockReset();
    kbjuRefresh.mockResolvedValue(undefined);
    isNativePlatform.mockReturnValue(false);

    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    useStreakStore.setState({
      currentLength: 2,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      lastCelebratedLocalDate: '',
      bestStreak: 2,
      calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
      clientUpdatedAt: '2026-08-22T08:00:00.000Z',
    });
    useProfileStore.setState({
      profile: {
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        targetWeight: 75,
        targetWeightDate: '2026-12-31',
        activity: 'medium',
        goal: 'lose',
        dietType: 'none',
      },
      targets: { kcal: 2000, protein: 120, fat: 70, carbs: 200, fiber: 30 },
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces snapshot write to Preferences', async () => {
    const pending = syncStreakWidget();
    await vi.advanceTimersByTimeAsync(200);
    await pending;

    expect(preferencesSet).toHaveBeenCalledWith({
      key: STREAK_WIDGET_PREFS_KEY,
      value: expect.stringContaining('"loggingLength":0'),
    });
    expect(kbjuRefresh).not.toHaveBeenCalled();
  });

  it('refreshes native widget on Capacitor platform', async () => {
    isNativePlatform.mockReturnValue(true);

    const pending = syncStreakWidget();
    await vi.advanceTimersByTimeAsync(200);
    await pending;

    expect(kbjuRefresh).toHaveBeenCalledTimes(1);
  });
});
