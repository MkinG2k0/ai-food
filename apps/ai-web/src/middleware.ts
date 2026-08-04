import { NextResponse, type NextRequest } from 'next/server';

import { verifyAdminSessionToken } from '@/lib/adminSessionToken';

const SESSION_COOKIE_NAME = 'admin_session';
const LOGIN_PATH = '/admin/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSession = token
    ? await verifyAdminSessionToken(token)
    : false;

  if (!hasValidSession && !isLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (hasValidSession && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
