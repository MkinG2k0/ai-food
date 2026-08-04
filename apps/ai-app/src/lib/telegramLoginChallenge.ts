import { randomBytes, randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';

export type LoginChallenge = {
  id: string;
  nonce: string;
  status: LoginChallengeStatus;
  deviceId?: string;
  userId?: string;
  token?: string;
  expiresAt: number;
};

const byId = new Map<string, LoginChallenge>();
const byNonce = new Map<string, string>();

function isExpired(c: LoginChallenge, now = Date.now()): boolean {
  return now >= c.expiresAt;
}

function purgeIfExpired(id: string): LoginChallenge | null {
  const c = byId.get(id);
  if (!c) return null;
  if (isExpired(c) || c.status === 'consumed') {
    byId.delete(id);
    byNonce.delete(c.nonce);
    return null;
  }
  return c;
}

export function createLoginChallenge(opts?: {
  deviceId?: string;
  ttlMs?: number;
}): { id: string; nonce: string; expiresAt: Date } {
  const id = randomUUID();
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
  const challenge: LoginChallenge = {
    id,
    nonce,
    status: 'pending',
    expiresAt,
    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
  };
  byId.set(id, challenge);
  byNonce.set(nonce, id);
  return { id, nonce, expiresAt: new Date(expiresAt) };
}

export function getLoginChallengeById(id: string): LoginChallenge | null {
  return purgeIfExpired(id);
}

export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
  const id = byNonce.get(nonce);
  if (!id) return null;
  return purgeIfExpired(id);
}

export function confirmLoginChallenge(
  nonce: string,
  opts: { userId: string; token: string },
): boolean {
  const c = getLoginChallengeByNonce(nonce);
  if (!c || c.status !== 'pending') return false;
  c.status = 'confirmed';
  c.userId = opts.userId;
  c.token = opts.token;
  return true;
}

export function consumeLoginChallenge(
  id: string,
): { token: string; userId: string } | null {
  const c = purgeIfExpired(id);
  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
  const result = { token: c.token, userId: c.userId };
  c.status = 'consumed';
  byId.delete(id);
  byNonce.delete(c.nonce);
  return result;
}

export function clearAllLoginChallengesForTests(): void {
  byId.clear();
  byNonce.clear();
}
