import type { FavoriteFood } from '@/features/favorites';
import { useAuthStore } from '@/features/auth';
import type { PendingDelete } from '../model/favoriteSyncMerge';

export type SyncFavoritesApiBody = {
  since?: string;
  upserts: FavoriteFood[];
  deletes: PendingDelete[];
};

export type SyncFavoritesApiResponse = {
  favorites: FavoriteFood[];
  tombstones: string[];
};

export async function syncFavoritesApi(
  body: SyncFavoritesApiBody,
): Promise<SyncFavoritesApiResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для синхронизации избранного');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/favorites/sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    favorites?: FavoriteFood[];
    tombstones?: string[];
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message ??
        `Не удалось синхронизировать избранное (${response.status})`,
    );
  }

  return {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    tombstones: Array.isArray(data.tombstones) ? data.tombstones : [],
  };
}
