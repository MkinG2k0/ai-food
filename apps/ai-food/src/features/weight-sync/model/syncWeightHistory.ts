import { useAuthStore } from '@/features/auth';
import { useWeightStore } from '@/features/stats';
import { syncWeightsApi } from '../api/syncWeightsApi';
import {
  applyWeightSyncResponse,
  buildWeightSyncPayload,
} from './weightSyncMerge';

export async function syncWeightHistory(options: {
  mode: 'full' | 'upsert';
  entryIds?: string[];
}): Promise<void> {
  if (!useAuthStore.getState().userToken) return;

  const { entries, goalKg, pendingDeletes } = useWeightStore.getState();
  const body = buildWeightSyncPayload({
    mode: options.mode,
    entries,
    goalKg,
    pendingDeletes,
    entryIds: options.entryIds,
  });

  const response = await syncWeightsApi({
    upserts: body.upserts,
    deletes: body.deletes,
    goalKg: body.goalKg,
  });

  const latest = useWeightStore.getState();
  const clearedIds = new Set([
    ...body.deletes.map((d) => d.id),
    ...response.tombstones,
  ]);
  const nextPending = latest.pendingDeletes.filter((d) => !clearedIds.has(d.id));

  useWeightStore.setState({
    entries: applyWeightSyncResponse(latest.entries, response),
    goalKg: response.goalKg,
    pendingDeletes: nextPending,
  });
}
