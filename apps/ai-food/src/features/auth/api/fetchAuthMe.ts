import {
  parseNutritionProfile,
  type NutritionProfilePayload,
} from '../model/nutritionProfile';
import { useAuthStore } from '../model/useAuthStore';

type AuthMeResponse = {
  nutritionProfile: NutritionProfilePayload | null;
  [key: string]: unknown;
};

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для загрузки профиля');
  }

  const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/auth/me`, {
    headers: {
      'X-User-Token': userToken,
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    nutritionProfile?: unknown;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.message ?? `Не удалось загрузить профиль (${response.status})`,
    );
  }

  return {
    ...body,
    nutritionProfile: parseNutritionProfile(body.nutritionProfile),
  };
}
