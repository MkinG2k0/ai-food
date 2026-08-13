import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NutritionProfilePayload } from '@/features/auth';
import { defaultMicronutrientTargets } from './defaultMicronutrientTargets';

const mocks = vi.hoisted(() => ({
  setProfile: vi.fn(),
  setMicronutrientTargets: vi.fn(),
}));

vi.mock('./useProfileStore', () => ({
  useProfileStore: {
    getState: () => ({
      setProfile: mocks.setProfile,
      setMicronutrientTargets: mocks.setMicronutrientTargets,
    }),
  },
}));

import { applyRemoteNutritionProfile } from './applyRemoteNutritionProfile';

const payload: NutritionProfilePayload = {
  profile: {
    gender: 'female',
    age: 28,
    height: 165,
    weight: 60,
    targetWeight: 58,
    targetWeightDate: '2026-10-01',
    activity: 'low',
    goal: 'maintain',
    dietType: 'vegetarian',
  },
  targets: {
    kcal: 1800,
    protein: 100,
    fat: 50,
    carbs: 180,
    fiber: 25,
  },
};

describe('applyRemoteNutritionProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies gender-aware micronutrient defaults when field absent', () => {
    applyRemoteNutritionProfile(payload);

    expect(mocks.setProfile).toHaveBeenCalledWith(payload.profile, payload.targets);
    expect(mocks.setMicronutrientTargets).toHaveBeenCalledWith(
      defaultMicronutrientTargets('female'),
    );
  });

  it('uses remote micronutrientTargets array when present', () => {
    const micro = defaultMicronutrientTargets('male');
    applyRemoteNutritionProfile({ ...payload, micronutrientTargets: micro });
    expect(mocks.setMicronutrientTargets).toHaveBeenCalledWith(micro);
  });

  it('sets null when remote micronutrientTargets is null', () => {
    applyRemoteNutritionProfile({ ...payload, micronutrientTargets: null });
    expect(mocks.setMicronutrientTargets).toHaveBeenCalledWith(null);
  });
});
