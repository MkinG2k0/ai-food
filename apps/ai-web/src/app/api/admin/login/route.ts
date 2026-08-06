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
