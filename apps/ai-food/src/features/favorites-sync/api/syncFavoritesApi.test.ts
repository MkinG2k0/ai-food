import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { useAuthStore } from '@/features/auth';
import { syncFavoritesApi } from './syncFavoritesApi';

describe('syncFavoritesApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs favorites payload to /user/favorites/sync', async () => {
    const body = {
      upserts: [
        {
          id: 'f1',
          name: 'Овсянка',
          calories: 150,
          protein: 5,
          fat: 3,
          carbs: 27,
          grams: 100,
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
        },
      ],
      deletes: [],
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ favorites: body.upserts, tombstones: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await syncFavoritesApi(body);

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/user/favorites/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': 'jwt-test',
      },
      body: JSON.stringify(body),
    });
    expect(result.favorites).toHaveLength(1);
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(syncFavoritesApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /VITE_AI_GATEWAY_URL/,
    );
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(syncFavoritesApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /Нужен вход/,
    );
  });

  it('throws on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
    );
    await expect(syncFavoritesApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /Forbidden/,
    );
  });

  it('defaults missing arrays in response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const result = await syncFavoritesApi({ upserts: [], deletes: [] });
    expect(result).toEqual({ favorites: [], tombstones: [] });
  });
});
