import { useDiaryStore } from '@/entities/meal';
import { useAuthStore } from '@/features/auth';
import { appDebugLog } from '@/shared/lib/appDebugLog';
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

  const t0 = performance.now();
  const { meals, pendingDeletes } = useDiaryStore.getState();
  const body = buildSyncPayload({
    mode: options.mode,
    meals,
    pendingDeletes,
    mealIds: options.mealIds,
  });
  appDebugLog('sync', 'meals sync start', undefined, {
    mode: options.mode,
    upserts: body.upserts.length,
    deletes: body.deletes.length,
  });

  try {
    const response = await syncMealsApi(body);

    const latest = useDiaryStore.getState();
    const nextMeals = applySyncResponse(latest.meals, response);
    const clearedIds = new Set([
      ...body.deletes.map((d) => d.id),
      ...response.tombstones,
    ]);
    const nextPending = latest.pendingDeletes.filter((d) => !clearedIds.has(d.id));

    useDiaryStore.setState({
      meals: nextMeals,
      pendingDeletes: nextPending,
    });

    appDebugLog('sync', 'meals sync ok', performance.now() - t0, {
      remote: response.meals.length,
      tombstones: response.tombstones.length,
    });
  } catch (error) {
    appDebugLog('sync', 'meals sync FAIL', performance.now() - t0, {
      err: String(error).slice(0, 60),
    });
    throw error;
  }
}
