import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-User-Token': 'jwt-token',
    'X-Usage-Kind': 'other',
  })),
}));

describe('fetchReferral', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
    vi.unstubAllGlobals();
  });

  it('GETs /billing/referral with quota headers and returns code plus count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'alice', conversionCount: 3 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchReferral } = await import('./fetchReferral');
    const result = await fetchReferral();
    expect(result).toEqual({ code: 'alice', conversionCount: 3 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/referral',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-User-Token': 'jwt-token',
        }),
      }),
    );
  });

  it('throws parsed ApiError when the gateway rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'X-User-Token required.',
          code: 'INVALID_USER_TOKEN',
        }),
      }),
    );

    const { fetchReferral } = await import('./fetchReferral');
    await expect(fetchReferral()).rejects.toMatchObject({
      code: 'INVALID_USER_TOKEN',
      status: 401,
    });
  });
});
