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
import { useProfileStore } from '@/features/onboarding';
import {
  KBJU_WIDGET_PREFS_KEY,
  WEEK_KCAL_WIDGET_PREFS_KEY,
  syncKbjuWidget,
} from './syncKbjuWidget';

describe('syncKbjuWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    preferencesSet.mockReset();
    preferencesSet.mockResolvedValue(undefined);
    kbjuRefresh.mockReset();
    kbjuRefresh.mockResolvedValue(undefined);
    isNativePlatform.mockReturnValue(false);

    useDiaryStore.setState({ meals: [], selectedDate: new Date() });
    useProfileStore.setState({
      profile: null,
      targets: { kcal: 2000, protein: 120, fat: 70, carbs: 200, fiber: 30 },
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes today and week snapshots to Preferences', async () => {
    const pending = syncKbjuWidget();
    await vi.advanceTimersByTimeAsync(200);
    await pending;

    expect(preferencesSet).toHaveBeenCalledWith({
      key: KBJU_WIDGET_PREFS_KEY,
      value: expect.any(String),
    });
    expect(preferencesSet).toHaveBeenCalledWith({
      key: WEEK_KCAL_WIDGET_PREFS_KEY,
      value: expect.any(String),
    });
  });

  it('refreshes native widget on Capacitor platform', async () => {
    isNativePlatform.mockReturnValue(true);

    const pending = syncKbjuWidget();
    await vi.advanceTimersByTimeAsync(200);
    await pending;

    expect(kbjuRefresh).toHaveBeenCalledTimes(1);
  });
});
