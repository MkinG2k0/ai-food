import { describe, expect, it } from 'vitest';
import type { FavoriteFood } from '@/features/favorites';
import {
  applyFavoriteSyncResponse,
  buildFavoriteSyncPayload,
  mergeFavoritesLww,
} from './favoriteSyncMerge';

function fav(
  id: string,
  name: string,
  clientUpdatedAt: string,
): FavoriteFood {
  return {
    id,
    sourceMealId: `m-${id}`,
    name,
    items: [],
    totalCalories: 100,
    createdAt: clientUpdatedAt,
    clientUpdatedAt,
  };
}

describe('mergeFavoritesLww', () => {
  it('newer replaces older', () => {
    const merged = mergeFavoritesLww(
      [fav('a', 'old', '2026-08-13T10:00:00.000Z')],
      [fav('a', 'new', '2026-08-13T12:00:00.000Z')],
      [],
    );
    expect(merged[0].name).toBe('new');
  });

  it('tombstone removes', () => {
    expect(
      mergeFavoritesLww(
        [fav('a', 'x', '2026-08-13T10:00:00.000Z')],
        [],
        ['a'],
      ),
    ).toHaveLength(0);
  });
});

describe('buildFavoriteSyncPayload', () => {
  it('full includes pending deletes', () => {
    const body = buildFavoriteSyncPayload({
      mode: 'full',
      favorites: [fav('a', 'Soup', '2026-08-13T10:00:00.000Z')],
      pendingDeletes: [{ id: 'gone', clientUpdatedAt: '2026-08-13T09:00:00.000Z' }],
    });
    expect(body.upserts).toHaveLength(1);
    expect(body.deletes).toHaveLength(1);
  });
});

describe('applyFavoriteSyncResponse', () => {
  it('merges active set', () => {
    const next = applyFavoriteSyncResponse(
      [
        fav('a', 'A', '2026-08-13T10:00:00.000Z'),
        fav('b', 'B', '2026-08-13T10:00:00.000Z'),
      ],
      {
        favorites: [fav('a', 'A2', '2026-08-13T12:00:00.000Z')],
        tombstones: ['b'],
      },
    );
    expect(next.map((f) => f.id)).toEqual(['a']);
    expect(next[0].name).toBe('A2');
  });
});
