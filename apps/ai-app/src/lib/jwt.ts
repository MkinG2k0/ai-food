import { SignJWT, jwtVerify } from 'jose';
import { ApiError } from '../../lib/errors.js';

export type UserTokenPayload = {
  sub: string;
  phone: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new ApiError(
      500,
      'AUTH_MISCONFIGURED',
      'AUTH_SECRET must be set (at least 32 characters).',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signUserToken(payload: UserTokenPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .sign(getSecretKey());
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    const phone = payload.phone;
    if (!sub || typeof phone !== 'string') {
      throw new Error('invalid claims');
    }
    return { sub, phone };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'Invalid or expired user token.');
  }
}
