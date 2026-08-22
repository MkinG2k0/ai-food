import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncFavorites = vi.fn();

vi.mock('./syncFavorites', () => ({
  syncFavorites: (...args: unknown[]) => syncFavorites(...args),
}));

import { queueFavoritesSync } from './queueFavoritesSync';

describe('queueFavoritesSync', () => {
  beforeEach(() => {
    syncFavorites.mockReset();
    syncFavorites.mockResolvedValue(undefined);
  });

  it('fire-and-forgets syncFavorites', async () => {
    queueFavoritesSync({ mode: 'upsert', favoriteIds: ['f1'] });
    await Promise.resolve();
    expect(syncFavorites).toHaveBeenCalledWith({ mode: 'upsert', favoriteIds: ['f1'] });
  });

  it('logs sync errors without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    syncFavorites.mockRejectedValue(new Error('network'));
    queueFavoritesSync({ mode: 'full' });
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith('[favorites-sync]', expect.any(Error));
    warn.mockRestore();
  });
});
