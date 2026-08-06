# Admin Login Brute-Force Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect `POST /api/admin/login` with per-IP in-memory progressive delays and a 30-minute lockout after 5 failed attempts.

**Architecture:** Pure attempt store in `apps/ai-web/src/lib/adminLoginAttempts.ts`; login route resolves client IP, short-circuits when locked (`429` + `Retry-After`), applies server-side sleep on failures 2–4, clears on success. Login UI already surfaces `error` from JSON.

**Tech Stack:** Next.js 15 App Router route handlers, TypeScript, Vitest (new for `ai-web`), no Redis.

**Spec:** `docs/superpowers/specs/2026-08-06-admin-login-bruteforce-protection-design.md`

## Global Constraints

- Storage: **in-memory `Map` only** (no Redis/DB).
- Key: client IP from `x-forwarded-for` (first hop) → `x-real-ip` → `unknown`.
- Thresholds (verbatim): fail 1 → 0ms; fail 2 → 1000ms; fail 3 → 2000ms; fail 4 → 5000ms; fail 5+ → lockout **30 minutes** → `429`.
- While locked, further attempts **do not** extend `lockedUntil`.
- Success clears the IP entry.
- Russian lockout message: `Слишком много попыток. Повторите через N мин` (N = ceil minutes remaining).
- Wrong password message unchanged: `Неверный пароль`.
- No CAPTCHA, no client-side attempt counter.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-web/vitest.config.ts` | Vitest config for `src/**/*.test.ts` |
| `apps/ai-web/package.json` | Add `vitest`, set `"test": "vitest run"` |
| `apps/ai-web/src/lib/adminLoginAttempts.ts` | IP helper + in-memory attempt store |
| `apps/ai-web/src/lib/adminLoginAttempts.test.ts` | Unit tests for delays, lockout, clear, no extend |
| `apps/ai-web/src/app/api/admin/login/route.ts` | Enforce check / record / sleep / clear |
| `apps/ai-web/src/app/admin/login/page.tsx` | Only if needed: ensure `429` body `error` is shown (likely already OK) |

---

### Task 1: Vitest + `adminLoginAttempts` store (TDD)

**Files:**
- Modify: `apps/ai-web/package.json`
- Create: `apps/ai-web/vitest.config.ts`
- Create: `apps/ai-web/src/lib/adminLoginAttempts.test.ts`
- Create: `apps/ai-web/src/lib/adminLoginAttempts.ts`

**Interfaces:**
- Produces:
  - `LOGIN_FAILURE_DELAYS_MS: readonly number[]` — index `fails - 1`; values `[0, 1000, 2000, 5000]` for fails 1–4
  - `LOGIN_LOCKOUT_AFTER_FAILURES = 5`
  - `LOGIN_LOCKOUT_MS = 30 * 60 * 1000`
  - `getClientIp(request: Headers | { get(name: string): string | null }): string`
  - `checkLoginAllowed(ip: string, nowMs?: number): { allowed: true } | { allowed: false; retryAfterSec: number }`
  - `recordLoginFailure(ip: string, nowMs?: number): { delayMs: number; locked: boolean; retryAfterSec?: number }`
  - `clearLoginFailures(ip: string): void`
  - `resetLoginAttemptsForTests(): void` — clears entire Map (tests only)
  - `setLoginAttemptClockForTests(nowMs: number | null): void` — optional; prefer `nowMs` args instead

- [ ] **Step 1: Add Vitest to `ai-web`**

In `apps/ai-web/package.json`:

- Set `"test": "vitest run"`
- Add devDependency `"vitest": "^2"` (same major as `ai-app`)

Create `apps/ai-web/vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Run from repo root:

```bash
pnpm --filter ai-web add -D vitest@^2
```

Expected: `vitest` listed under `apps/ai-web` devDependencies; lockfile updated.

- [ ] **Step 2: Write failing unit tests**

Create `apps/ai-web/src/lib/adminLoginAttempts.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
pnpm --filter ai-web test
```

Expected: FAIL (module `./adminLoginAttempts` missing or exports missing).

- [ ] **Step 4: Implement `adminLoginAttempts.ts`**

Create `apps/ai-web/src/lib/adminLoginAttempts.ts`:

```ts
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
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter ai-web test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ai-web/package.json apps/ai-web/vitest.config.ts apps/ai-web/src/lib/adminLoginAttempts.ts apps/ai-web/src/lib/adminLoginAttempts.test.ts pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(ai-web): add in-memory admin login attempt limiter

EOF
)"
```

---

### Task 2: Enforce limiter in `POST /api/admin/login`

**Files:**
- Modify: `apps/ai-web/src/app/api/admin/login/route.ts`

**Interfaces:**
- Consumes: `getClientIp`, `checkLoginAllowed`, `recordLoginFailure`, `clearLoginFailures`, `formatLoginLockoutMessage` from `@/lib/adminLoginAttempts`
- Produces: `429` with `{ error, retryAfterSec }` + `Retry-After` header when locked; delayed `401` on failures 1–4; clear on success

- [ ] **Step 1: Update login route**

Replace `apps/ai-web/src/app/api/admin/login/route.ts` with:

```ts
import { NextResponse } from 'next/server';

import {
  checkLoginAllowed,
  clearLoginFailures,
  formatLoginLockoutMessage,
  getClientIp,
  recordLoginFailure,
} from '@/lib/adminLoginAttempts';
import {
  createAdminSessionToken,
  timingSafeEqualString,
} from '@/lib/adminSession';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type LoginBody = {
  password?: unknown;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lockedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: formatLoginLockoutMessage(retryAfterSec),
      retryAfterSec,
    },
    {
      headers: { 'Retry-After': String(retryAfterSec) },
      status: 429,
    },
  );
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured' },
      { status: 500 },
    );
  }

  const ip = getClientIp(request.headers);
  const gate = checkLoginAllowed(ip);
  if (!gate.allowed) {
    return lockedResponse(gate.retryAfterSec);
  }

  let password: unknown;

  try {
    const body = (await request.json()) as LoginBody | null;
    password = body?.password;
  } catch {
    const failure = recordLoginFailure(ip);
    if (failure.locked && failure.retryAfterSec != null) {
      return lockedResponse(failure.retryAfterSec);
    }
    await sleep(failure.delayMs);
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  if (
    typeof password !== 'string' ||
    !timingSafeEqualString(password, adminPassword)
  ) {
    const failure = recordLoginFailure(ip);
    if (failure.locked && failure.retryAfterSec != null) {
      return lockedResponse(failure.retryAfterSec);
    }
    await sleep(failure.delayMs);
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  clearLoginFailures(ip);

  try {
    const token = await createAdminSessionToken();
    const response = NextResponse.json({ ok: true });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Admin session is not configured' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter ai-web type-check
```

Expected: exit 0.

- [ ] **Step 3: Re-run unit tests**

```bash
pnpm --filter ai-web test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/api/admin/login/route.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): enforce admin login lockout and backoff on API

EOF
)"
```

---

### Task 3: Confirm login UI surfaces `429` errors

**Files:**
- Modify only if needed: `apps/ai-web/src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: existing `fetch` + `result.error` path (no new API)

- [ ] **Step 1: Verify current UI handles non-OK including 429**

Current `handleSubmit` already does:

```ts
if (!response.ok) {
  const result = (await response.json().catch(() => ({}))) as ErrorResponse;
  throw new Error(result.error || 'Не удалось войти');
}
```

This shows the lockout message for `429`. **No code change required** if that block is unchanged.

- [ ] **Step 2: Manual smoke (optional local)**

With `ADMIN_PASSWORD` set, open `/admin/login`, submit wrong password 5 times:

1. Attempts 1–4: toast «Неверный пароль» (attempts 2–4 feel slower).
2. Attempt 5: toast «Слишком много попыток. Повторите через 30 мин».
3. Correct password after clear/restart still works.

- [ ] **Step 3: Commit only if UI changed**

If no UI change: skip commit.

If a tiny comment or status-aware message was added:

```bash
git add apps/ai-web/src/app/admin/login/page.tsx
git commit -m "$(cat <<'EOF'
fix(ai-web): surface admin login rate-limit errors in UI

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| In-memory Map store | Task 1 |
| IP from x-forwarded-for / x-real-ip / unknown | Task 1 |
| Delays 0 / 1s / 2s / 5s for fails 1–4 | Task 1 |
| Lockout at 5 for 30 min → 429 + Retry-After | Task 1 + 2 |
| Lockout not extended while locked | Task 1 |
| Success clears IP | Task 2 |
| Server-side sleep before 401 | Task 2 |
| Russian lockout copy | Task 1 (`formatLoginLockoutMessage`) + Task 2 |
| UI shows error | Task 3 (existing path) |
| Unit tests | Task 1 |
| No CAPTCHA / Redis | Global constraints |

## Self-review notes

- No placeholders.
- `recordLoginFailure` while already locked does not extend window (matches tests).
- Fifth failure returns `locked: true` → route responds `429` (not delayed `401`), matching spec table «5+ → 429».
