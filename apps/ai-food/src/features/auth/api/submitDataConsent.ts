import { DATA_CONSENT_VERSION } from '../model/dataConsentVersion';
import { useAuthStore } from '../model/useAuthStore';

type ConsentResponse = {
  dataConsentAt: string | null;
  dataConsentVersion: string | null;
  message?: string;
};

export async function submitDataConsent(): Promise<void> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Для подтверждения согласия необходимо войти');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/auth/consent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify({ version: DATA_CONSENT_VERSION }),
    },
  );
  const body = (await response.json().catch(() => ({}))) as ConsentResponse;

  if (!response.ok || !body.dataConsentAt) {
    throw new Error(
      body.message ?? `Не удалось сохранить согласие (${response.status})`,
    );
  }

  useAuthStore
    .getState()
    .setDataConsent(body.dataConsentAt, body.dataConsentVersion);
}
