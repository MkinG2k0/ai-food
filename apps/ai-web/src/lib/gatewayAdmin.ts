import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyAdminSessionToken } from '@/lib/adminSessionToken';

const SESSION_COOKIE_NAME = 'admin_session';

export async function proxyGatewayAdmin(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json(
      { message: 'Требуется авторизация', code: 'UNAUTHORIZED', status: 401 },
      { status: 401 },
    );
  }

  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!gatewayUrl || !adminApiKey) {
    return NextResponse.json(
      {
        message: 'Подключение к шлюзу не настроено',
        code: 'GATEWAY_NOT_CONFIGURED',
        status: 500,
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${gatewayUrl.replace(/\/$/, '')}/admin/${path.replace(/^\//, '')}`,
      {
        ...init,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminApiKey,
          ...init.headers,
        },
      },
    );
    const body = await response.text();

    return new Response(body || null, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: 'Шлюз временно недоступен',
        code: 'GATEWAY_UNAVAILABLE',
        status: 502,
      },
      { status: 502 },
    );
  }
}
