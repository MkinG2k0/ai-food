import { getDeviceId } from '@/shared/lib';
import type { TelegramSession } from '../model/telegramSession';
import { useAuthStore } from '../model/useAuthStore';

export type TelegramLoginPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type AuthTelegramResponse = {
  token: string;
  user: {
    id: string;
    telegramId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
    name?: string | null;
  };
};

function placeholderAvatar(name: string): string {
  const letter = (name.trim()[0] || 'T').toUpperCase();
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
        `<circle cx="32" cy="32" r="32" fill="#229ED9"/>` +
        `<text x="32" y="40" text-anchor="middle" font-size="28" fill="#fff" font-family="sans-serif">${letter}</text>` +
        `</svg>`,
    )
  );
}

export function mapTelegramUserToSession(
  user: AuthTelegramResponse['user'],
): TelegramSession {
  const name =
    user.name?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    'Telegram User';
  return {
    id: user.id,
    name,
    username: user.username ?? '',
    photo_url: user.photoUrl || placeholderAvatar(name),
    telegramId: Number(user.telegramId) || undefined,
  };
}

/**
 * Exchange Telegram Login Widget payload for gateway JWT + local session.
 */
export async function signInWithTelegram(
  payload: TelegramLoginPayload,
): Promise<TelegramSession> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const deviceId = await getDeviceId();
  const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, deviceId }),
  });

  const data = (await res.json().catch(() => ({}))) as AuthTelegramResponse & {
    message?: string;
    code?: string;
  };

  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.message ?? `Вход не удался (${res.status})`);
  }

  const session = mapTelegramUserToSession(data.user);
  useAuthStore.getState().signIn(session, data.token);
  return session;
}

export function getTelegramBotUsername(): string | null {
  const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim();
  if (!raw) return null;
  return raw.replace(/^@/, '');
}
