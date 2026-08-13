import type { FavoriteFood } from '@/features/favorites';

export type PendingDelete = { id: string; clientUpdatedAt: string };

export type FavoriteSyncResponse = {
  favorites: FavoriteFood[];
  tombstones: string[];
};

function clockMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function newerOrEqual(a: string | undefined, b: string | undefined): boolean {
  return clockMs(a) >= clockMs(b);
}

export function mergeFavoritesLww(
  local: FavoriteFood[],
  remote: FavoriteFood[],
  tombstoneIds: string[],
): FavoriteFood[] {
  const byId = new Map<string, FavoriteFood>();
  for (const f of local) byId.set(f.id, f);
  for (const f of remote) {
    const cur = byId.get(f.id);
    if (!cur || newerOrEqual(f.clientUpdatedAt, cur.clientUpdatedAt)) {
      byId.set(f.id, f);
    }
  }
  for (const id of tombstoneIds) byId.delete(id);
  return Array.from(byId.values());
}

export function ensureClientUpdatedAt(fav: FavoriteFood): string {
  return fav.clientUpdatedAt ?? fav.createdAt ?? '1970-01-01T00:00:00.000Z';
}

export function buildFavoriteSyncPayload(args: {
  mode: 'full' | 'upsert' | 'delete';
  favorites: FavoriteFood[];
  pendingDeletes: PendingDelete[];
  favoriteIds?: string[];
}): { upserts: FavoriteFood[]; deletes: PendingDelete[] } {
  const { mode, favorites, pendingDeletes, favoriteIds } = args;

  if (mode === 'full') {
    return {
      upserts: favorites.map((f) => ({
        ...f,
        clientUpdatedAt: ensureClientUpdatedAt(f),
      })),
      deletes: [...pendingDeletes],
    };
  }

  if (mode === 'upsert') {
    const ids = new Set(favoriteIds ?? []);
    return {
      upserts: favorites
        .filter((f) => ids.has(f.id))
        .map((f) => ({ ...f, clientUpdatedAt: ensureClientUpdatedAt(f) })),
      deletes: [],
    };
  }

  const ids = new Set(favoriteIds ?? pendingDeletes.map((d) => d.id));
  return {
    upserts: [],
    deletes: pendingDeletes.filter((d) => ids.has(d.id)),
  };
}

export function applyFavoriteSyncResponse(
  local: FavoriteFood[],
  response: FavoriteSyncResponse,
): FavoriteFood[] {
  return mergeFavoritesLww(local, response.favorites, response.tombstones);
}
