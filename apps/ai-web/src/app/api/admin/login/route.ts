import { NextResponse } from 'next/server';

import {
  createAdminSessionToken,
  timingSafeEqualString,
} from '@/lib/adminSession';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type LoginBody = {
  password?: unknown;
};

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured' },
      { status: 500 },
    );
  }

  let password: unknown;

  try {
    const body = (await request.json()) as LoginBody | null;
    password = body?.password;
  } catch {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  if (
    typeof password !== 'string' ||
    !timingSafeEqualString(password, adminPassword)
  ) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

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
