import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGet = vi.fn();
const verifyAdminSessionToken = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => cookieGet(...args),
  }),
}));

vi.mock('@/lib/adminSessionToken', () => ({
  verifyAdminSessionToken: (...args: unknown[]) =>
    verifyAdminSessionToken(...args),
}));

describe('proxyGatewayAdmin', () => {
  const prevGateway = process.env.AI_GATEWAY_URL;
  const prevKey = process.env.ADMIN_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    cookieGet.mockReset();
    verifyAdminSessionToken.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (prevGateway === undefined) delete process.env.AI_GATEWAY_URL;
    else process.env.AI_GATEWAY_URL = prevGateway;
    if (prevKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = prevKey;
    vi.unstubAllGlobals();
  });

  it('returns 401 without/bad session', async () => {
    cookieGet.mockReturnValue(undefined);
    const { proxyGatewayAdmin } = await import('./gatewayAdmin');
    const res = await proxyGatewayAdmin('stats');
    expect(res.status).toBe(401);

    cookieGet.mockReturnValue({ value: 'bad' });
    verifyAdminSessionToken.mockResolvedValue(false);
    const res2 = await proxyGatewayAdmin('stats');
    expect(res2.status).toBe(401);
  });

  it('returns 500 when gateway env is missing', async () => {
    cookieGet.mockReturnValue({ value: 'tok' });
    verifyAdminSessionToken.mockResolvedValue(true);
    delete process.env.AI_GATEWAY_URL;
    delete process.env.ADMIN_API_KEY;

    const { proxyGatewayAdmin } = await import('./gatewayAdmin');
    const res = await proxyGatewayAdmin('stats');
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      code: 'GATEWAY_NOT_CONFIGURED',
    });
  });

  it('passes through upstream status', async () => {
    cookieGet.mockReturnValue({ value: 'tok' });
    verifyAdminSessionToken.mockResolvedValue(true);
    process.env.AI_GATEWAY_URL = 'https://gw.example/';
    process.env.ADMIN_API_KEY = 'admin-key';
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 418,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { proxyGatewayAdmin } = await import('./gatewayAdmin');
    const res = await proxyGatewayAdmin('/health');
    expect(res.status).toBe(418);
    expect(fetch).toHaveBeenCalledWith(
      'https://gw.example/admin/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Admin-Key': 'admin-key',
        }),
      }),
    );
  });

  it('returns 502 on network failure', async () => {
    cookieGet.mockReturnValue({ value: 'tok' });
    verifyAdminSessionToken.mockResolvedValue(true);
    process.env.AI_GATEWAY_URL = 'https://gw.example';
    process.env.ADMIN_API_KEY = 'admin-key';
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const { proxyGatewayAdmin } = await import('./gatewayAdmin');
    const res = await proxyGatewayAdmin('stats');
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      code: 'GATEWAY_UNAVAILABLE',
    });
  });
});
