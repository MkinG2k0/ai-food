import { Capacitor } from '@capacitor/core';
import { getDeviceId } from '@/shared/lib';
import { getAppVersion } from '@/shared/lib/appVersion';
import { useAuthStore } from '@/features/auth';
import type { SupportReportType } from '../model/supportReportTypes';

export type SubmitSupportReportInput = {
  type: SupportReportType;
  message: string;
  images?: string[];
};

export type SubmitSupportReportResponse = {
  id: string;
  type: SupportReportType;
  message: string;
  createdAt: string;
};

export async function submitSupportReportApi(
  input: SubmitSupportReportInput,
): Promise<SubmitSupportReportResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const userToken = useAuthStore.getState().userToken;
  if (userToken) {
    headers['X-User-Token'] = userToken;
  } else {
    headers['X-Device-Id'] = await getDeviceId();
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/support-reports`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: input.type,
        message: input.message,
        images: input.images ?? [],
        appVersion: getAppVersion(),
        platform: Capacitor.getPlatform(),
      }),
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    type?: SupportReportType;
    message?: string;
    createdAt?: string;
  };

  if (!response.ok) {
    throw new Error(
      (typeof data.message === 'string' && data.message) ||
        `Не удалось отправить обращение (${response.status})`,
    );
  }

  if (
    typeof data.id !== 'string' ||
    typeof data.type !== 'string' ||
    typeof data.message !== 'string' ||
    typeof data.createdAt !== 'string'
  ) {
    throw new Error('Некорректный ответ сервера');
  }

  return {
    id: data.id,
    type: data.type,
    message: data.message,
    createdAt: data.createdAt,
  };
}
