import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { decodeJwt } from 'jose';
import { signUserToken, verifyUserToken } from './jwt.js';
import { ApiError } from '../../lib/errors.js';

const SECRET = 'test-auth-secret-at-least-32-chars!!';

describe('user JWT', () => {
  const prev = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  it('round-trips sub and phone', async () => {
    const token = await signUserToken({ sub: 'user_1', phone: '+79991234567' });
    const payload = await verifyUserToken(token);
    expect(payload).toEqual({ sub: 'user_1', phone: '+79991234567' });
  });

  it('does not set exp claim', async () => {
    const token = await signUserToken({ sub: 'user_1', phone: '+79991234567' });
    const decoded = decodeJwt(token);
    expect(decoded.exp).toBeUndefined();
  });

  it('rejects garbage token', async () => {
    await expect(verifyUserToken('not.a.jwt')).rejects.toBeInstanceOf(ApiError);
  });
});
