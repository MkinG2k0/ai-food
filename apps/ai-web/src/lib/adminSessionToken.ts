import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

const ADMIN_ROLE = 'admin';
const SESSION_DURATION = '7d';
const SESSION_ALGORITHM = 'HS256';
const MIN_SECRET_LENGTH = 32;

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured');
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: ADMIN_ROLE })
    .setProtectedHeader({ alg: SESSION_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: [SESSION_ALGORITHM],
    });

    return payload.role === ADMIN_ROLE;
  } catch {
    return false;
  }
}
