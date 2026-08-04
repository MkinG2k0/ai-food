import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'admin_session';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
