import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { useAuthStore } from '@/features/auth';
import { syncWeightsApi } from './syncWeightsApi';

describe('syncWeightsApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs weight payload to /user/weights/sync', async () => {
    const body = {
      upserts: [
        {
          id: 'w1',
          date: '2026-08-22',
          kg: 72.5,
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
        },
      ],
      goalKg: 70,
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          weights: body.upserts,
          tombstones: [],
          goalKg: 70,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await syncWeightsApi(body);

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/user/weights/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': 'jwt-test',
      },
      body: JSON.stringify(body),
    });
    expect(result.weights[0].kg).toBe(72.5);
    expect(result.goalKg).toBe(70);
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(syncWeightsApi({ upserts: [] })).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(syncWeightsApi({ upserts: [] })).rejects.toThrow(/Нужен вход/);
  });

  it('throws on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Bad request' }), { status: 400 }),
    );
    await expect(syncWeightsApi({ upserts: [] })).rejects.toThrow(/Bad request/);
  });

  it('defaults missing arrays and goalKg', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const result = await syncWeightsApi({ upserts: [] });
    expect(result).toEqual({ weights: [], tombstones: [], goalKg: null });
  });
});
