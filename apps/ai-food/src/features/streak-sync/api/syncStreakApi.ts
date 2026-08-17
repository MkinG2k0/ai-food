import { useAuthStore } from '@/features/auth';
import type { SyncStreakApiBody, SyncStreakApiResponse } from '../model/streakSyncPayload';

export async function syncStreakApi(
  body: SyncStreakApiBody,
): Promise<SyncStreakApiResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для синхронизации серии');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/streak/sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    streak?: SyncStreakApiResponse['streak'];
    clientUpdatedAt?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message ?? `Не удалось синхронизировать серию (${response.status})`,
    );
  }

  if (!data.streak || typeof data.clientUpdatedAt !== 'string') {
    throw new Error('Некорректный ответ streak sync');
  }

  return {
    streak: data.streak,
    clientUpdatedAt: data.clientUpdatedAt,
  };
}
