import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyRemoteNutritionProfile: vi.fn(),
  authHydrated: false,
  fetchAuthMe: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  fetchAuthMe: mocks.fetchAuthMe,
  useAuthHydrated: () => mocks.authHydrated,
  useAuthStore: {
    getState: () => ({ userToken: 'user-token' }),
  },
}));

vi.mock('../model/applyRemoteNutritionProfile', () => ({
  applyRemoteNutritionProfile: mocks.applyRemoteNutritionProfile,
}));

vi.mock('../model/useProfileHydrated', () => ({
  useProfileHydrated: () => true,
}));

vi.mock('../model/useProfileStore', () => {
  const useProfileStore = Object.assign(
    (selector: (state: { isComplete: () => boolean }) => unknown) =>
      selector({ isComplete: () => false }),
    { getState: () => ({ profile: null }) },
  );
  return { useProfileStore };
});

vi.mock('../model/useOnboarding', () => ({
  useOnboarding: () => ({
    step: 1,
    draft: {},
    next: vi.fn(),
    back: vi.fn(),
    finish: vi.fn(),
    skip: vi.fn(),
  }),
}));

vi.mock('./steps/StepGender', () => ({
  StepGender: () => <div>Шаг пола</div>,
}));

describe('OnboardingPage', () => {
  it('restores a remote profile after hydration on cold start', async () => {
    const nutritionProfile = {
      profile: {
        gender: 'female',
        age: 36,
        height: 165,
        weight: 60,
        targetWeight: 58,
        targetWeightDate: '2026-10-01',
        activity: 'medium',
        goal: 'lose',
        dietType: 'none',
      },
      targets: {
        kcal: 1800,
        protein: 100,
        fat: 60,
        carbs: 210,
        fiber: 25,
      },
    };
    mocks.fetchAuthMe.mockResolvedValue({ nutritionProfile });
    const { OnboardingPage } = await import('./OnboardingPage');

    const { rerender } = render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    expect(mocks.fetchAuthMe).not.toHaveBeenCalled();

    mocks.authHydrated = true;
    rerender(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.applyRemoteNutritionProfile).toHaveBeenCalledWith(
        nutritionProfile,
      );
    });
  });
});
