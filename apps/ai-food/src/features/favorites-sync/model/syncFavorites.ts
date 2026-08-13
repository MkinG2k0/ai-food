import { useAuthStore } from '@/features/auth';
import { useFavoritesStore } from '@/features/favorites';
import { syncFavoritesApi } from '../api/syncFavoritesApi';
import {
  applyFavoriteSyncResponse,
  buildFavoriteSyncPayload,
} from './favoriteSyncMerge';

export async function syncFavorites(options: {
  mode: 'full' | 'upsert' | 'delete';
  favoriteIds?: string[];
}): Promise<void> {
  if (!useAuthStore.getState().userToken) return;

  const { favorites, pendingDeletes } = useFavoritesStore.getState();
  const body = buildFavoriteSyncPayload({
    mode: options.mode,
    favorites,
    pendingDeletes,
    favoriteIds: options.favoriteIds,
  });

  const response = await syncFavoritesApi(body);
  const nextFavorites = applyFavoriteSyncResponse(favorites, response);
  const cleared = new Set([
    ...body.deletes.map((d) => d.id),
    ...response.tombstones,
  ]);

  useFavoritesStore.setState({
    favorites: nextFavorites,
    pendingDeletes: pendingDeletes.filter((d) => !cleared.has(d.id)),
  });
}
