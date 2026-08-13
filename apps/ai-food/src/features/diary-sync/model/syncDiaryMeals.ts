import { useDiaryStore } from '@/entities/meal';
import { useAuthStore } from '@/features/auth';
import { syncMealsApi } from '../api/syncMealsApi';
import {
  applySyncResponse,
  buildSyncPayload,
} from './mealSyncMerge';

export type SyncDiaryMode = 'full' | 'upsert' | 'delete';

/**
 * Push/pull diary meals for the authenticated user.
 * No-ops when userToken is null (D-05 guests stay local-only).
 */
export async function syncDiaryMeals(options: {
  mode: SyncDiaryMode;
  mealIds?: string[];
}): Promise<void> {
  if (!useAuthStore.getState().userToken) return;

  const { meals, pendingDeletes } = useDiaryStore.getState();
  const body = buildSyncPayload({
    mode: options.mode,
    meals,
    pendingDeletes,
    mealIds: options.mealIds,
  });

  const response = await syncMealsApi(body);
  const nextMeals = applySyncResponse(meals, response);
  const clearedIds = new Set([
    ...body.deletes.map((d) => d.id),
    ...response.tombstones,
  ]);
  const nextPending = pendingDeletes.filter((d) => !clearedIds.has(d.id));

  useDiaryStore.setState({
    meals: nextMeals,
    pendingDeletes: nextPending,
  });
}
