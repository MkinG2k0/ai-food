export const LOGIN_FAILURE_DELAYS_MS = [0, 1000, 2000, 5000] as const;
export const LOGIN_LOCKOUT_AFTER_FAILURES = 5;
export const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;

type AttemptState = {
  fails: number;
  lockedUntil: number | null;
};

const attempts = new Map<string, AttemptState>();

function pruneExpired(ip: string, nowMs: number): void {
  const state = attempts.get(ip);
  if (!state) return;
  if (state.lockedUntil != null && state.lockedUntil <= nowMs) {
    attempts.delete(ip);
  }
}

export function getClientIp(
  headers: Headers | { get(name: string): string | null },
): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export function checkLoginAllowed(
  ip: string,
  nowMs: number = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  pruneExpired(ip, nowMs);
  const state = attempts.get(ip);
  if (!state?.lockedUntil || state.lockedUntil <= nowMs) {
    return { allowed: true };
  }
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((state.lockedUntil - nowMs) / 1000)),
  };
}

export function recordLoginFailure(
  ip: string,
  nowMs: number = Date.now(),
): { delayMs: number; locked: boolean; retryAfterSec?: number } {
  pruneExpired(ip, nowMs);
  const existing = attempts.get(ip);

  if (existing?.lockedUntil && existing.lockedUntil > nowMs) {
    return {
      delayMs: 0,
      locked: true,
      retryAfterSec: Math.max(
        1,
        Math.ceil((existing.lockedUntil - nowMs) / 1000),
      ),
    };
  }

  const fails = (existing?.fails ?? 0) + 1;

  if (fails >= LOGIN_LOCKOUT_AFTER_FAILURES) {
    const lockedUntil = nowMs + LOGIN_LOCKOUT_MS;
    attempts.set(ip, { fails, lockedUntil });
    return {
      delayMs: 0,
      locked: true,
      retryAfterSec: Math.ceil(LOGIN_LOCKOUT_MS / 1000),
    };
  }

  attempts.set(ip, { fails, lockedUntil: null });
  const delayMs =
    LOGIN_FAILURE_DELAYS_MS[
      Math.min(fails - 1, LOGIN_FAILURE_DELAYS_MS.length - 1)
    ] ?? 0;

  return { delayMs, locked: false };
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}

export function resetLoginAttemptsForTests(): void {
  attempts.clear();
}

export function formatLoginLockoutMessage(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `Слишком много попыток. Повторите через ${minutes} мин`;
}
