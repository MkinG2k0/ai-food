import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncDiaryMeals = vi.fn();
const syncStreak = vi.fn();
const syncWeightHistory = vi.fn();
const syncFavorites = vi.fn();
const syncSettings = vi.fn();

vi.mock('./syncDiaryMeals', () => ({
  syncDiaryMeals: (...args: unknown[]) => syncDiaryMeals(...args),
}));
vi.mock('@/features/streak-sync', () => ({
  syncStreak: (...args: unknown[]) => syncStreak(...args),
}));
vi.mock('@/features/weight-sync', () => ({
  syncWeightHistory: (...args: unknown[]) => syncWeightHistory(...args),
}));
vi.mock('@/features/favorites-sync', () => ({
  syncFavorites: (...args: unknown[]) => syncFavorites(...args),
}));
vi.mock('@/features/settings-sync', () => ({
  syncSettings: (...args: unknown[]) => syncSettings(...args),
}));

import { queueFullUserDataSync } from './queueFullUserDataSync';

describe('queueFullUserDataSync', () => {
  beforeEach(() => {
    syncDiaryMeals.mockReset();
    syncStreak.mockReset();
    syncWeightHistory.mockReset();
    syncFavorites.mockReset();
    syncSettings.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('fans out diary→streak, weight, favorites, settings', async () => {
    syncDiaryMeals.mockResolvedValue(undefined);
    syncStreak.mockResolvedValue(undefined);
    syncWeightHistory.mockResolvedValue(undefined);
    syncFavorites.mockResolvedValue(undefined);
    syncSettings.mockResolvedValue(undefined);

    queueFullUserDataSync('login');
    await vi.waitFor(() => {
      expect(syncDiaryMeals).toHaveBeenCalledWith({ mode: 'full' });
      expect(syncStreak).toHaveBeenCalled();
      expect(syncWeightHistory).toHaveBeenCalledWith({ mode: 'full' });
      expect(syncFavorites).toHaveBeenCalledWith({ mode: 'full' });
      expect(syncSettings).toHaveBeenCalled();
    });
  });

  it('continues other syncs when one fails', async () => {
    syncDiaryMeals.mockRejectedValue(new Error('diary fail'));
    syncWeightHistory.mockResolvedValue(undefined);
    syncFavorites.mockRejectedValue(new Error('fav fail'));
    syncSettings.mockResolvedValue(undefined);

    queueFullUserDataSync('boot');
    await vi.waitFor(() => {
      expect(syncWeightHistory).toHaveBeenCalled();
      expect(syncFavorites).toHaveBeenCalled();
      expect(syncSettings).toHaveBeenCalled();
    });
    // diary failed before streak chain
    expect(syncStreak).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
