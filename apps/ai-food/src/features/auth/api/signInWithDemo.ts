import { getDeviceId } from '@/shared/lib';
import type { TelegramSession } from '../model/telegramSession';
import { useAuthStore } from '../model/useAuthStore';
import { mapTelegramUserToSession } from './signInWithTelegram';

type DemoGatewayUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  name?: string | null;
  dataConsentAt?: string | null;
  dataConsentVersion?: string | null;
};

export async function signInWithDemo(opts?: {
  signal?: AbortSignal;
}): Promise<TelegramSession> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const base = gatewayUrl.replace(/\/$/, '');
  const deviceId = await getDeviceId();
  const res = await fetch(`${base}/auth/demo/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    signal: opts?.signal,
  });

  const body = (await res.json().catch(() => ({}))) as {
    token?: string;
    user?: DemoGatewayUser;
    message?: string;
  };

  if (!res.ok || !body.token || !body.user) {
    throw new Error(
      body.message ?? `Демо-вход не удался (${res.status})`,
    );
  }

  const session = mapTelegramUserToSession(body.user);
  useAuthStore.getState().signIn(session, body.token, {
    dataConsentAt: body.user.dataConsentAt ?? null,
    dataConsentVersion: body.user.dataConsentVersion ?? null,
  });
  return session;
}
