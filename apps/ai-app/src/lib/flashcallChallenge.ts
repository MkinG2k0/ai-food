import { randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface Challenge {
  id: string;
  phone: string;
  code: string;
  providerId?: string;
  expiresAt: number;
  attempts: number;
}

const challenges = new Map<string, Challenge>();

function isExpired(challenge: Challenge, now = Date.now()): boolean {
  return now >= challenge.expiresAt;
}

function deleteIfExpired(id: string): Challenge | null {
  const challenge = challenges.get(id);
  if (!challenge) return null;
  if (isExpired(challenge)) {
    challenges.delete(id);
    return null;
  }
  return challenge;
}

export function createChallenge(opts: {
  phone: string;
  code: string;
  providerId?: string;
  ttlMs?: number;
}): { id: string; expiresAt: Date } {
  const id = randomUUID();
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = Date.now() + ttlMs;

  const challenge: Challenge = {
    id,
    phone: opts.phone,
    code: opts.code,
    attempts: 0,
    expiresAt,
    ...(opts.providerId !== undefined ? { providerId: opts.providerId } : {}),
  };

  challenges.set(id, challenge);
  return { id, expiresAt: new Date(expiresAt) };
}

export function getChallenge(id: string): Challenge | null {
  return deleteIfExpired(id);
}

export function countActiveForPhone(phone: string): number {
  let count = 0;
  for (const [id, challenge] of challenges) {
    if (!deleteIfExpired(id)) continue;
    if (challenge.phone === phone) count += 1;
  }
  return count;
}

export function consumeChallengeOnSuccess(id: string): void {
  challenges.delete(id);
}

export function registerFailedAttempt(
  id: string,
): 'ok' | 'exhausted' | 'missing' {
  const challenge = deleteIfExpired(id);
  if (!challenge) return 'missing';

  challenge.attempts += 1;
  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenges.delete(id);
    return 'exhausted';
  }

  return 'ok';
}

export function clearAllChallengesForTests(): void {
  challenges.clear();
}
