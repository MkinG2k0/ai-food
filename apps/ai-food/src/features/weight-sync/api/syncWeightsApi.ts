import type { WeightEntry } from '@/features/stats';
import { useAuthStore } from '@/features/auth';

export type SyncWeightsApiBody = {
  since?: string;
  upserts: WeightEntry[];
  deletes?: { id: string; clientUpdatedAt: string }[];
  goalKg?: number | null;
};

export type SyncWeightsApiResponse = {
  weights: WeightEntry[];
  tombstones: string[];
  goalKg: number | null;
};

export async function syncWeightsApi(
  body: SyncWeightsApiBody,
): Promise<SyncWeightsApiResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для синхронизации веса');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/weights/sync`,
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
    weights?: WeightEntry[];
    tombstones?: string[];
    goalKg?: number | null;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message ?? `Не удалось синхронизировать вес (${response.status})`,
    );
  }

  return {
    weights: Array.isArray(data.weights) ? data.weights : [],
    tombstones: Array.isArray(data.tombstones) ? data.tombstones : [],
    goalKg: data.goalKg ?? null,
  };
}
