import { describe, it, expect, beforeEach } from 'vitest';
import { useProfileStore } from './useProfileStore';

const mockProfile = {
  gender: 'male' as const,
  age: 28,
  height: 178,
  weight: 78,
  activity: 'medium' as const,
  goal: 'maintain' as const,
};

const mockTargets = { kcal: 2500, protein: 140, fat: 69, carbs: 288 };

beforeEach(() => {
  useProfileStore.setState({ profile: null, targets: null });
});

describe('useProfileStore', () => {
  it('starts with no profile', () => {
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('isComplete returns false when profile is null', () => {
    expect(useProfileStore.getState().isComplete()).toBe(false);
  });

  it('setProfile stores profile and targets', () => {
    useProfileStore.getState().setProfile(mockProfile, mockTargets);
    expect(useProfileStore.getState().profile).toEqual(mockProfile);
    expect(useProfileStore.getState().targets).toEqual(mockTargets);
  });

  it('isComplete returns true after setProfile', () => {
    useProfileStore.getState().setProfile(mockProfile, mockTargets);
    expect(useProfileStore.getState().isComplete()).toBe(true);
  });
});
