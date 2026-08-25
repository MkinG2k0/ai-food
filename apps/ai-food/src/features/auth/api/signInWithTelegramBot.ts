import { getDeviceId } from '@/shared/lib';
import type { AuthLoginResult } from '../model/authLoginResult';
import { parseNutritionProfile } from '../model/nutritionProfile';
import { useAuthStore } from '../model/useAuthStore';
import { mapTelegramUserToSession } from './signInWithTelegram';
import { openTelegramBotDeepLink } from './openTelegramBotDeepLink';

type TelegramGatewayUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  name?: string | null;
  dataConsentAt?: string | null;
  dataConsentVersion?: string | null;
  nutritionProfile?: unknown;
};

type TelegramBotLoginOptions = {
  signal?: AbortSignal;
  /**
   * Window from `prepareTelegramLoginPopup()` — must be opened
   * synchronously in the click handler before awaiting this function.
   */
  popup?: Window | null;
  /** Always called with botDeepLink once /start succeeds (for manual `<a>`). */
  onDeepLinkReady?: (url: string) => void;
  /** Invoked when auto-open failed; UI should emphasize the manual link. */
  onNeedsManualOpen?: (url: string) => void;
  /** Test seam / override. Return false if open failed. */
  openLink?: (url: string) => boolean | void;
};

export async function signInWithTelegramBot(
  opts?: TelegramBotLoginOptions,
): Promise<AuthLoginResult> {
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
    try {
      opts?.popup?.close();
    } catch {
      // ignore
    }
    throw new Error(
      start.message ?? `Не удалось начать вход (${startRes.status})`,
    );
  }

  opts?.onDeepLinkReady?.(start.botDeepLink);

  const opened =
    opts?.openLink != null
      ? opts.openLink(start.botDeepLink) !== false
      : openTelegramBotDeepLink(start.botDeepLink, opts?.popup) === 'opened';

  if (!opened) {
    opts?.onNeedsManualOpen?.(start.botDeepLink);
  }

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
      const nutritionProfile = parseNutritionProfile(
        status.user.nutritionProfile,
      );
      useAuthStore.getState().signIn(session, status.token, {
        dataConsentAt: status.user.dataConsentAt ?? null,
        dataConsentVersion: status.user.dataConsentVersion ?? null,
      });
      return { session, nutritionProfile };
    }
    if (status.status === 'expired') {
      throw new Error('Сессия входа истекла. Попробуйте снова.');
    }
  }

  throw new Error('Время ожидания входа истекло.');
}
