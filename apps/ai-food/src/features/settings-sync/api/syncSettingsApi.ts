import { useAuthStore } from '@/features/auth';
import type { SettingsSyncPayload } from '@/features/settings';

export type SyncSettingsApiBody = {
  settings: SettingsSyncPayload;
  clientUpdatedAt: string;
};

export type SyncSettingsApiResponse = {
  settings: SettingsSyncPayload;
  clientUpdatedAt: string;
};

export async function syncSettingsApi(
  body: SyncSettingsApiBody,
): Promise<SyncSettingsApiResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для синхронизации настроек');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/settings/sync`,
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
    settings?: SettingsSyncPayload;
    clientUpdatedAt?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message ??
        `Не удалось синхронизировать настройки (${response.status})`,
    );
  }

  if (!data.settings || typeof data.clientUpdatedAt !== 'string') {
    throw new Error('Некорректный ответ settings sync');
  }

  return {
    settings: data.settings,
    clientUpdatedAt: data.clientUpdatedAt,
  };
}
