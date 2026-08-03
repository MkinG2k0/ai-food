import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useProfileStore } from './useProfileStore';
import { defaultMicronutrientTargets } from './defaultMicronutrientTargets';

const mockProfile = {
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

const mockTargets = { kcal: 2500, protein: 140, fat: 69, carbs: 288, fiber: 30 };

beforeEach(async () => {
  await act(async () => {
    await useProfileStore.persist.rehydrate();
  });
  useProfileStore.setState({ profile: null, targets: null, micronutrientTargets: null });
});

describe('useProfileStore', () => {
  it('starts with no profile', () => {
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().micronutrientTargets).toBeNull();
  });

  it('isComplete returns false when profile is null', () => {
    expect(useProfileStore.getState().isComplete()).toBe(false);
  });

  it('setProfile stores profile and targets', async () => {
    await act(async () => {
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
    });
    expect(useProfileStore.getState().profile).toEqual(mockProfile);
    expect(useProfileStore.getState().targets).toEqual(mockTargets);
  });

  it('isComplete returns true after setProfile', async () => {
    await act(async () => {
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
    });
    expect(useProfileStore.getState().isComplete()).toBe(true);
  });

  it('resetProfile clears profile, targets, and micronutrientTargets', async () => {
    await act(async () => {
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
      useProfileStore.getState().setMicronutrientTargets(
        defaultMicronutrientTargets('male'),
      );
      useProfileStore.getState().resetProfile();
    });
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().targets).toBeNull();
    expect(useProfileStore.getState().micronutrientTargets).toBeNull();
    expect(useProfileStore.getState().isComplete()).toBe(false);
  });

  it('setProfile works after a prior reset', async () => {
    await act(async () => {
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
      useProfileStore.getState().resetProfile();
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
    });
    expect(useProfileStore.getState().profile).toEqual(mockProfile);
    expect(useProfileStore.getState().targets).toEqual(mockTargets);
    expect(useProfileStore.getState().isComplete()).toBe(true);
  });

  it('updateDietType patches profile.dietType when profile exists', async () => {
    await act(async () => {
      useProfileStore.getState().setProfile(mockProfile, mockTargets);
      useProfileStore.getState().updateDietType('halal');
    });
    expect(useProfileStore.getState().profile?.dietType).toBe('halal');
    expect(useProfileStore.getState().isComplete()).toBe(true);
  });

  it('updateDietType is a no-op when profile is null', async () => {
    await act(async () => {
      useProfileStore.getState().updateDietType('vegan');
    });
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('isComplete stays true for legacy profile missing dietType', async () => {
    const legacyProfile = {
      gender: 'female' as const,
      age: 25,
      height: 165,
      weight: 60,
      activity: 'low' as const,
      goal: 'lose' as const,
    };
    await act(async () => {
      useProfileStore.setState({
        profile: legacyProfile as unknown as typeof mockProfile,
        targets: mockTargets,
      });
    });
    expect(useProfileStore.getState().isComplete()).toBe(true);
    expect(useProfileStore.getState().profile?.dietType).toBeUndefined();
  });
});
