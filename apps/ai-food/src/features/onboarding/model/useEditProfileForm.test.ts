import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const syncMock = vi.fn();
vi.mock('./syncNutritionProfileToServer', () => ({
  syncNutritionProfileToServer: () => syncMock(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useWeightStore } from '@/features/stats';
import { useEditProfileForm } from './useEditProfileForm';
import { useProfileStore } from './useProfileStore';

const mockProfile = {
  gender: 'female' as const,
  age: 30,
  height: 165,
  weight: 60,
  targetWeight: 58,
  targetWeightDate: '2026-12-01',
  activity: 'low' as const,
  goal: 'lose' as const,
  dietType: 'vegetarian' as const,
};

const mockTargets = {
  kcal: 1800,
  protein: 110,
  fat: 55,
  carbs: 180,
  fiber: 30,
};

beforeEach(async () => {
  syncMock.mockReset();
  await act(async () => {
    await useProfileStore.persist.rehydrate();
  });
  useProfileStore.setState({
    profile: mockProfile,
    targets: mockTargets,
    micronutrientTargets: null,
    suppressRemoteRestore: false,
  });
  useWeightStore.setState({ entries: [], goalKg: 58 });
});

describe('useEditProfileForm', () => {
  it('saves profile without recalculating KBJU and syncs', () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() =>
      useEditProfileForm({
        open: true,
        profile: mockProfile,
        onSaved,
      }),
    );

    act(() => {
      result.current.setDraft({ age: '32', activity: 'high', targetWeight: '57' });
    });
    act(() => {
      result.current.save();
    });

    expect(useProfileStore.getState().profile).toMatchObject({
      age: 32,
      activity: 'high',
      targetWeight: 57,
    });
    expect(useProfileStore.getState().targets).toEqual(mockTargets);
    expect(useWeightStore.getState().goalKg).toBe(57);
    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
