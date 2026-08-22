import { afterEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose/jwt/sign';

import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './adminSessionToken';

const SECRET = 'x'.repeat(32);

describe('adminSessionToken', () => {
  const prevSecret = process.env.ADMIN_SESSION_SECRET;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prevSecret;
  });

  it('create/verify round-trip with valid secret', async () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = await createAdminSessionToken();
    await expect(verifyAdminSessionToken(token)).resolves.toBe(true);
  });

  it('rejects missing or short secret on create', async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    await expect(createAdminSessionToken()).rejects.toThrow(
      /ADMIN_SESSION_SECRET is not configured/,
    );

    process.env.ADMIN_SESSION_SECRET = 'too-short';
    await expect(createAdminSessionToken()).rejects.toThrow(
      /at least 32 characters/,
    );
  });

  it('rejects bad signature, wrong role, and expired tokens', async () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const good = await createAdminSessionToken();

    process.env.ADMIN_SESSION_SECRET = 'y'.repeat(32);
    await expect(verifyAdminSessionToken(good)).resolves.toBe(false);

    process.env.ADMIN_SESSION_SECRET = SECRET;
    const wrongRole = await new SignJWT({ role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyAdminSessionToken(wrongRole)).resolves.toBe(false);

    const expired = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyAdminSessionToken(expired)).resolves.toBe(false);
  });
});
