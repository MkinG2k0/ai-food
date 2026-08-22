import { beforeEach, describe, expect, it, vi } from 'vitest';

const putNutritionProfile = vi.fn();
const toastError = vi.fn();
const getAuthState = vi.fn();

vi.mock('@/features/auth', () => ({
  putNutritionProfile: (...args: unknown[]) => putNutritionProfile(...args),
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

import { useProfileStore } from '@/features/onboarding';
import { syncNutritionProfileToServer } from './syncNutritionProfileToServer';

const profile = {
  gender: 'female' as const,
  age: 28,
  height: 165,
  weight: 60,
  targetWeight: 58,
  targetWeightDate: '2026-12-31',
  activity: 'medium' as const,
  goal: 'lose' as const,
  dietType: 'none' as const,
};

const targets = { kcal: 1800, protein: 100, fat: 60, carbs: 180, fiber: 25 };

describe('syncNutritionProfileToServer', () => {
  beforeEach(() => {
    putNutritionProfile.mockReset();
    putNutritionProfile.mockResolvedValue(undefined);
    toastError.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useProfileStore.setState({
      profile,
      targets,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
  });

  it('no-ops without auth token', () => {
    getAuthState.mockReturnValue({ userToken: null });
    syncNutritionProfileToServer();
    expect(putNutritionProfile).not.toHaveBeenCalled();
  });

  it('no-ops without profile or targets', () => {
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
    syncNutritionProfileToServer();
    expect(putNutritionProfile).not.toHaveBeenCalled();
  });

  it('PUTs nutrition profile for logged-in user', async () => {
    syncNutritionProfileToServer();
    await Promise.resolve();
    expect(putNutritionProfile).toHaveBeenCalledWith({
      profile,
      targets,
      micronutrientTargets: null,
    });
  });

  it('shows toast when PUT fails', async () => {
    putNutritionProfile.mockRejectedValue(new Error('offline'));
    syncNutritionProfileToServer();
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalledWith('offline');
  });
});
