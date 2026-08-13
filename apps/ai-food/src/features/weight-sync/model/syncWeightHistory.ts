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

  const { entries, goalKg } = useWeightStore.getState();
  const body = buildWeightSyncPayload({
    mode: options.mode,
    entries,
    goalKg,
    entryIds: options.entryIds,
  });

  const response = await syncWeightsApi({
    upserts: body.upserts,
    deletes: [],
    goalKg: body.goalKg,
  });

  useWeightStore.setState({
    entries: applyWeightSyncResponse(entries, response),
    goalKg: response.goalKg,
  });
}
