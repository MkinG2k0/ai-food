import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-User-Token': 'jwt-token',
    'X-Usage-Kind': 'other',
  })),
}));

describe('friendsApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
    vi.unstubAllGlobals();
  });

  it('POSTs /user/friends/request with query body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: 'req-1', status: 'pending' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestFriend } = await import('./friendsApi');
    const result = await requestFriend('@alice');
    expect(result).toEqual({ requestId: 'req-1', status: 'pending' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/user/friends/request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: '@alice' }),
      }),
    );
  });

  it('GETs /user/friends with quota headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        friends: [
          {
            userId: 'u1',
            displayName: 'Alice',
            username: 'alice',
            streak: 3,
            calorieStreak: 4,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchFriends } = await import('./friendsApi');
    const result = await fetchFriends();
    expect(result.friends).toHaveLength(1);
    expect(result.friends[0]?.calorieStreak).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/user/friends',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws parsed ApiError when gateway rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'User not found.',
          code: 'USER_NOT_FOUND',
        }),
      }),
    );

    const { requestFriend } = await import('./friendsApi');
    await expect(requestFriend('@missing')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      status: 404,
    });
  });
});
