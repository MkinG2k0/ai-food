import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NutritionProfilePayload } from '@/features/auth';

const mocks = vi.hoisted(() => ({
  applyRemoteNutritionProfile: vi.fn(),
  syncNutritionProfileToServer: vi.fn(),
  profile: null as NutritionProfilePayload['profile'] | null,
  targets: null as NutritionProfilePayload['targets'] | null,
}));

vi.mock('./applyRemoteNutritionProfile', () => ({
  applyRemoteNutritionProfile: mocks.applyRemoteNutritionProfile,
}));

vi.mock('./syncNutritionProfileToServer', () => ({
  syncNutritionProfileToServer: mocks.syncNutritionProfileToServer,
}));

vi.mock('./useProfileStore', () => ({
  useProfileStore: {
    getState: () => ({
      profile: mocks.profile,
      targets: mocks.targets,
    }),
  },
}));

import { reconcileNutritionProfileAfterLogin } from './reconcileNutritionProfileAfterLogin';

const remote: NutritionProfilePayload = {
  profile: {
    gender: 'male',
    age: 30,
    height: 180,
    weight: 80,
    targetWeight: 75,
    targetWeightDate: '2026-12-01',
    activity: 'medium',
    goal: 'lose',
    dietType: 'none',
  },
  targets: { kcal: 2000, protein: 150, fat: 60, carbs: 200, fiber: 25 },
};

describe('reconcileNutritionProfileAfterLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile = null;
    mocks.targets = null;
  });

  it('applies remote profile and does not upload local', () => {
    mocks.profile = remote.profile;
    mocks.targets = remote.targets;

    const source = reconcileNutritionProfileAfterLogin({
      nutritionProfile: remote,
    });

    expect(source).toBe('remote');
    expect(mocks.applyRemoteNutritionProfile).toHaveBeenCalledWith(remote);
    expect(mocks.syncNutritionProfileToServer).not.toHaveBeenCalled();
  });

  it('uploads local profile when server is empty', () => {
    mocks.profile = remote.profile;
    mocks.targets = remote.targets;

    const source = reconcileNutritionProfileAfterLogin({
      nutritionProfile: null,
    });

    expect(source).toBe('local-uploaded');
    expect(mocks.applyRemoteNutritionProfile).not.toHaveBeenCalled();
    expect(mocks.syncNutritionProfileToServer).toHaveBeenCalledOnce();
  });

  it('returns none when both server and local are empty', () => {
    const source = reconcileNutritionProfileAfterLogin({
      nutritionProfile: null,
    });

    expect(source).toBe('none');
    expect(mocks.applyRemoteNutritionProfile).not.toHaveBeenCalled();
    expect(mocks.syncNutritionProfileToServer).not.toHaveBeenCalled();
  });
});
