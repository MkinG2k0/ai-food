import {
  parseNutritionProfile,
  type NutritionProfilePayload,
} from '../model/nutritionProfile';
import { useAuthStore } from '../model/useAuthStore';

export async function putNutritionProfile(
  payload: NutritionProfilePayload,
): Promise<NutritionProfilePayload> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для сохранения профиля');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/auth/profile`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify(payload),
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    nutritionProfile?: unknown;
    message?: string;
  };
  const parsed = parseNutritionProfile(body.nutritionProfile);
  if (!response.ok || !parsed) {
    throw new Error(
      body.message ?? `Не удалось сохранить профиль (${response.status})`,
    );
  }
  return parsed;
}
