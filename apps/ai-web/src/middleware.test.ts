import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verifyAdminSessionToken = vi.fn();

vi.mock('@/lib/adminSessionToken', () => ({
  verifyAdminSessionToken: (...args: unknown[]) =>
    verifyAdminSessionToken(...args),
}));

import { middleware } from './middleware';

describe('admin middleware', () => {
  beforeEach(() => {
    verifyAdminSessionToken.mockReset();
  });

  it('redirects unauthenticated /admin to login', async () => {
    verifyAdminSessionToken.mockResolvedValue(false);
    const req = new NextRequest('http://localhost/admin/users');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/admin/login');
  });

  it('allows login page without session', async () => {
    const req = new NextRequest('http://localhost/admin/login');
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects authenticated login page to /admin', async () => {
    verifyAdminSessionToken.mockResolvedValue(true);
    const req = new NextRequest('http://localhost/admin/login', {
      headers: { cookie: 'admin_session=tok' },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/admin');
  });

  it('passes through authenticated admin pages', async () => {
    verifyAdminSessionToken.mockResolvedValue(true);
    const req = new NextRequest('http://localhost/admin', {
      headers: { cookie: 'admin_session=tok' },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
