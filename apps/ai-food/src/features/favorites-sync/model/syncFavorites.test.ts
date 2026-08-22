import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncFavoritesApi = vi.fn();
const getAuthState = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

vi.mock('../api/syncFavoritesApi', () => ({
  syncFavoritesApi: (...args: unknown[]) => syncFavoritesApi(...args),
}));

import type { FavoriteFood } from '@/features/favorites';
import { useFavoritesStore } from '@/features/favorites';
import { syncFavorites } from './syncFavorites';

function fav(
  id: string,
  name: string,
  clientUpdatedAt: string,
  totalCalories = 150,
): FavoriteFood {
  return {
    id,
    sourceMealId: `m-${id}`,
    name,
    items: [],
    totalCalories,
    createdAt: clientUpdatedAt,
    clientUpdatedAt,
  };
}

describe('syncFavorites', () => {
  beforeEach(() => {
    syncFavoritesApi.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useFavoritesStore.setState({
      favorites: [fav('f1', 'Овсянка', '2026-08-22T08:00:00.000Z')],
      pendingDeletes: [{ id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' }],
    });
  });

  it('no-ops without token', async () => {
    getAuthState.mockReturnValue({ userToken: null });
    await syncFavorites({ mode: 'full' });
    expect(syncFavoritesApi).not.toHaveBeenCalled();
  });

  it('full mode posts payload and clears pending deletes from tombstones', async () => {
    syncFavoritesApi.mockResolvedValue({
      favorites: [fav('f1', 'Remote oats', '2026-08-22T09:00:00.000Z', 160)],
      tombstones: ['gone'],
    });

    await syncFavorites({ mode: 'full' });

    expect(syncFavoritesApi).toHaveBeenCalledTimes(1);
    const body = syncFavoritesApi.mock.calls[0][0];
    expect(body.upserts.some((u: { id: string }) => u.id === 'f1')).toBe(true);
    expect(body.deletes).toEqual([
      { id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' },
    ]);

    const state = useFavoritesStore.getState();
    expect(state.favorites[0].name).toBe('Remote oats');
    expect(state.pendingDeletes).toEqual([]);
  });
});
