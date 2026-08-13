import type { Meal } from '@ai-food/shared-types';
import { useAuthStore } from '@/features/auth';
import type { PendingDelete, SyncPayload, SyncResponse } from '../model/mealSyncMerge';

export type SyncMealsApiBody = {
  since?: string;
  upserts: Meal[];
  deletes: PendingDelete[];
};

export async function syncMealsApi(
  body: SyncMealsApiBody,
): Promise<SyncResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }

  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для синхронизации дневника');
  }

  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/user/meals/sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify(body satisfies SyncPayload & { since?: string }),
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    meals?: Meal[];
    tombstones?: string[];
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.message ?? `Не удалось синхронизировать дневник (${response.status})`,
    );
  }

  return {
    meals: Array.isArray(data.meals) ? data.meals : [],
    tombstones: Array.isArray(data.tombstones) ? data.tombstones : [],
  };
}
