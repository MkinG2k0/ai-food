import { afterEach, describe, expect, it } from 'vitest';

import {
  checkLoginAllowed,
  clearLoginFailures,
  getClientIp,
  recordLoginFailure,
  resetLoginAttemptsForTests,
} from './adminLoginAttempts';

afterEach(() => {
  resetLoginAttemptsForTests();
});

describe('getClientIp', () => {
  it('uses first x-forwarded-for hop', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'x-real-ip': '10.0.0.1',
    });
    expect(getClientIp(headers)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip then unknown', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe(
      '198.51.100.7',
    );
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});

describe('recordLoginFailure + checkLoginAllowed', () => {
  const ip = '203.0.113.50';
  const t0 = 1_700_000_000_000;

  it('applies progressive delays for failures 1–4', () => {
    expect(recordLoginFailure(ip, t0)).toEqual({
      delayMs: 0,
      locked: false,
    });
    expect(recordLoginFailure(ip, t0 + 1)).toEqual({
      delayMs: 1000,
      locked: false,
    });
    expect(recordLoginFailure(ip, t0 + 2)).toEqual({
      delayMs: 2000,
      locked: false,
    });
    expect(recordLoginFailure(ip, t0 + 3)).toEqual({
      delayMs: 5000,
      locked: false,
    });
  });

  it('locks on 5th failure and returns retryAfterSec', () => {
    for (let i = 0; i < 4; i += 1) {
      recordLoginFailure(ip, t0 + i);
    }
    const fifth = recordLoginFailure(ip, t0 + 4);
    expect(fifth.locked).toBe(true);
    expect(fifth.delayMs).toBe(0);
    expect(fifth.retryAfterSec).toBe(30 * 60);
    expect(checkLoginAllowed(ip, t0 + 4)).toEqual({
      allowed: false,
      retryAfterSec: 30 * 60,
    });
  });

  it('does not extend lockout on further attempts while locked', () => {
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure(ip, t0);
    }
    const duringLock = checkLoginAllowed(ip, t0 + 60_000);
    expect(duringLock).toEqual({
      allowed: false,
      retryAfterSec: 30 * 60 - 60,
    });
    // Calling record while locked must be a no-op on the window
    // (route should not call it; store must still not extend if called)
    recordLoginFailure(ip, t0 + 60_000);
    expect(checkLoginAllowed(ip, t0 + 60_000)).toEqual({
      allowed: false,
      retryAfterSec: 30 * 60 - 60,
    });
  });

  it('allows login again after lockout expires', () => {
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure(ip, t0);
    }
    const after = t0 + 30 * 60 * 1000;
    expect(checkLoginAllowed(ip, after)).toEqual({ allowed: true });
  });

  it('clearLoginFailures resets counter', () => {
    recordLoginFailure(ip, t0);
    recordLoginFailure(ip, t0 + 1);
    clearLoginFailures(ip);
    expect(checkLoginAllowed(ip, t0 + 2)).toEqual({ allowed: true });
    expect(recordLoginFailure(ip, t0 + 2)).toEqual({
      delayMs: 0,
      locked: false,
    });
  });
});
