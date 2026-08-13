import type { Meal } from '@ai-food/shared-types';

export type PendingDelete = { id: string; clientUpdatedAt: string };

export type SyncResponse = {
  meals: Meal[];
  tombstones: string[];
};

export type SyncPayload = {
  upserts: Meal[];
  deletes: PendingDelete[];
};

/** Stub — RED phase; real LWW in GREEN. */
export function mergeMealsLww(
  _local: Meal[],
  _remote: Meal[],
  _tombstones: PendingDelete[],
): Meal[] {
  return [];
}

export function buildSyncPayload(_args: {
  mode: 'full' | 'upsert' | 'delete';
  meals: Meal[];
  pendingDeletes: PendingDelete[];
  mealIds?: string[];
}): SyncPayload {
  return { upserts: [], deletes: [] };
}

export function applySyncResponse(
  local: Meal[],
  _response: SyncResponse,
): Meal[] {
  return local;
}
