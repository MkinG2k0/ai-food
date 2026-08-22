import { useAuthStore } from '../model/useAuthStore';

/**
 * Permanently delete the signed-in user on the gateway.
 * Caller should signOut() + navigate after success.
 */
export async function deleteAccount(): Promise<void> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для удаления аккаунта');
  }

  const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/auth/me`, {
    method: 'DELETE',
    headers: {
      'X-User-Token': userToken,
    },
  });

  if (response.status === 204) return;

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
  };
  throw new Error(
    body.message ?? `Не удалось удалить аккаунт (${response.status})`,
  );
}
