import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { useAuthStore } from '@/features/auth';
import { syncMealsApi } from './syncMealsApi';

describe('syncMealsApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test/');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs upserts and deletes to /user/meals/sync', async () => {
    const body = {
      since: '2026-08-01T00:00:00.000Z',
      upserts: [
        {
          id: 'm1',
          timestamp: '2026-08-22T08:00:00.000Z',
          items: [],
          totalCalories: 100,
          status: 'ready' as const,
        },
      ],
      deletes: [{ id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' }],
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          meals: body.upserts,
          tombstones: ['gone'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await syncMealsApi(body);

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/user/meals/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': 'jwt-test',
      },
      body: JSON.stringify(body),
    });
    expect(result.meals).toHaveLength(1);
    expect(result.tombstones).toEqual(['gone']);
  });

  it('throws when VITE_AI_GATEWAY_URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(syncMealsApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /VITE_AI_GATEWAY_URL/,
    );
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(syncMealsApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /Нужен вход/,
    );
  });

  it('throws gateway message on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Conflict' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(syncMealsApi({ upserts: [], deletes: [] })).rejects.toThrow(
      /Conflict/,
    );
  });

  it('defaults missing arrays in response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const result = await syncMealsApi({ upserts: [], deletes: [] });
    expect(result).toEqual({ meals: [], tombstones: [] });
  });
});
