import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkLoginAllowed = vi.fn();
const recordLoginFailure = vi.fn();
const clearLoginFailures = vi.fn();
const getClientIp = vi.fn();
const createAdminSessionToken = vi.fn();
const timingSafeEqualString = vi.fn();

vi.mock('@/lib/adminLoginAttempts', () => ({
  checkLoginAllowed: (...args: unknown[]) => checkLoginAllowed(...args),
  recordLoginFailure: (...args: unknown[]) => recordLoginFailure(...args),
  clearLoginFailures: (...args: unknown[]) => clearLoginFailures(...args),
  formatLoginLockoutMessage: (sec: number) => `locked:${sec}`,
  getClientIp: (...args: unknown[]) => getClientIp(...args),
}));

vi.mock('@/lib/adminSession', () => ({
  createAdminSessionToken: (...args: unknown[]) =>
    createAdminSessionToken(...args),
  timingSafeEqualString: (...args: unknown[]) => timingSafeEqualString(...args),
}));

describe('POST /api/admin/login', () => {
  const prevPassword = process.env.ADMIN_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    checkLoginAllowed.mockReset();
    recordLoginFailure.mockReset();
    clearLoginFailures.mockReset();
    getClientIp.mockReset();
    createAdminSessionToken.mockReset();
    timingSafeEqualString.mockReset();
    getClientIp.mockReturnValue('203.0.113.10');
    checkLoginAllowed.mockReturnValue({ allowed: true });
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (prevPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevPassword;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it('returns 500 when ADMIN_PASSWORD is missing', async () => {
    delete process.env.ADMIN_PASSWORD;
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: 'x' }),
      }),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: 'ADMIN_PASSWORD is not configured',
    });
  });

  it('returns 401 for wrong password', async () => {
    process.env.ADMIN_PASSWORD = 'secret';
    timingSafeEqualString.mockReturnValue(false);
    recordLoginFailure.mockReturnValue({ delayMs: 0, locked: false });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      }),
    );
    expect(res.status).toBe(401);
    expect(createAdminSessionToken).not.toHaveBeenCalled();
  });

  it('returns 429 when locked out', async () => {
    process.env.ADMIN_PASSWORD = 'secret';
    checkLoginAllowed.mockReturnValue({
      allowed: false,
      retryAfterSec: 1800,
    });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: 'secret' }),
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('1800');
  });

  it('sets session cookie on success', async () => {
    process.env.ADMIN_PASSWORD = 'secret';
    timingSafeEqualString.mockReturnValue(true);
    createAdminSessionToken.mockResolvedValue('session-token');

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'secret' }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(clearLoginFailures).toHaveBeenCalledWith('203.0.113.10');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/admin_session=session-token/);
  });
});
