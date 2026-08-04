import { getDeviceId } from '@/shared/lib';
import type { TelegramSession } from '../model/telegramSession';
import { useAuthStore } from '../model/useAuthStore';
import { mapTelegramUserToSession } from './signInWithTelegram';

type TelegramGatewayUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  name?: string | null;
};

type TelegramBotLoginOptions = {
  signal?: AbortSignal;
  openLink?: (url: string) => void;
};

export async function signInWithTelegramBot(
  opts?: TelegramBotLoginOptions,
): Promise<TelegramSession> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const base = gatewayUrl.replace(/\/$/, '');
  const deviceId = await getDeviceId();
  const startRes = await fetch(`${base}/auth/telegram/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    signal: opts?.signal,
  });
  const start = (await startRes.json()) as {
    challengeId?: string;
    botDeepLink?: string;
    message?: string;
  };

  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
    throw new Error(
      start.message ?? `Не удалось начать вход (${startRes.status})`,
    );
  }

  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
    start.botDeepLink,
  );

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) {
      throw new Error('Вход отменён');
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const statusRes = await fetch(
      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
      { signal: opts?.signal },
    );
    const status = (await statusRes.json()) as {
      status: string;
      token?: string;
      user?: TelegramGatewayUser;
      message?: string;
    };

    if (status.status === 'ok' && status.token && status.user) {
      const session = mapTelegramUserToSession(status.user);
      useAuthStore.getState().signIn(session, status.token);
      return session;
    }
    if (status.status === 'expired') {
      throw new Error('Сессия входа истекла. Попробуйте снова.');
    }
  }

  throw new Error('Время ожидания входа истекло.');
}
