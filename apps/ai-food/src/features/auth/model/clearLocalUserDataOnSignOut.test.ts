import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

const removePrefs = vi.fn().mockResolvedValue(undefined);
const rmdir = vi.fn().mockResolvedValue(undefined);

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: (...args: unknown[]) => removePrefs(...args),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    rmdir: (...args: unknown[]) => rmdir(...args),
  },
}));

import { useDiaryStore } from '@/entities/meal';
import { useFavoritesStore } from '@/features/favorites';
import { useProfileStore } from '@/features/onboarding';
import { useWeightStore } from '@/features/stats';
import { useAuthStore } from './useAuthStore';
import { clearLocalUserDataOnSignOut } from './clearLocalUserDataOnSignOut';
import { signOut } from './mockTelegramAuth';

beforeEach(async () => {
  removePrefs.mockClear();
  rmdir.mockClear();
  await act(async () => {
    await useAuthStore.persist.rehydrate();
    await useDiaryStore.persist.rehydrate();
    await useFavoritesStore.persist.rehydrate();
    await useProfileStore.persist.rehydrate();
    await useWeightStore.persist.rehydrate();
  });
  useAuthStore.setState({
    session: null,
    userToken: null,
    dataConsentAt: null,
    dataConsentVersion: null,
  });
  useDiaryStore.setState({ meals: [], pendingDeletes: [] });
  useFavoritesStore.setState({ favorites: [] });
  useWeightStore.setState({ entries: [], goalKg: null });
  useProfileStore.setState({
    profile: null,
    targets: null,
    micronutrientTargets: null,
    suppressRemoteRestore: false,
  });
});

describe('clearLocalUserDataOnSignOut / signOut', () => {
  it('clears diary, favorites, weight, profile and auth session', async () => {
    await act(async () => {
      useAuthStore.getState().signIn(
        {
          id: 'tg-1',
          name: 'A',
          username: 'a',
          photo_url: null,
        },
        'jwt',
        { dataConsentAt: '2026-01-01', dataConsentVersion: '1' },
      );
      useDiaryStore.getState().addMeal({
        id: 'm1',
        timestamp: '2026-08-13T12:00:00.000Z',
        items: [],
        totalCalories: 100,
      });
      useFavoritesStore.setState({
        favorites: [
          {
            id: 'f1',
            sourceMealId: 'm1',
            name: 'Soup',
            items: [],
            totalCalories: 100,
            createdAt: '2026-08-13T12:00:00.000Z',
          },
        ],
      });
      useWeightStore.setState({
        entries: [{ id: 'w1', date: '2026-08-13', kg: 70 }],
        goalKg: 65,
      });
      useProfileStore.getState().setProfile(
        {
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
        {
          kcal: 2000,
          protein: 150,
          fat: 60,
          carbs: 200,
          fiber: 30,
        },
      );
      signOut();
    });

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().userToken).toBeNull();
    expect(useAuthStore.getState().dataConsentAt).toBeNull();
    expect(useDiaryStore.getState().meals).toEqual([]);
    expect(useFavoritesStore.getState().favorites).toEqual([]);
    expect(useWeightStore.getState().entries).toEqual([]);
    expect(useWeightStore.getState().goalKg).toBeNull();
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().isComplete()).toBe(false);
    expect(clearLocalUserDataOnSignOut).toBeTypeOf('function');
  });
});
