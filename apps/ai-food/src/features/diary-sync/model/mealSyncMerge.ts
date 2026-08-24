import type { Meal } from '@ai-food/shared-types';

export type PendingDelete = { id: string; clientUpdatedAt: string };

export type SyncResponse = {
  meals: Meal[];
  /** Tombstone ids from server (delete clock already applied server-side). */
  tombstones: string[];
};

export type SyncPayload = {
  upserts: Meal[];
  deletes: PendingDelete[];
};

function clockMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function newerOrEqual(a: string | undefined, b: string | undefined): boolean {
  return clockMs(a) >= clockMs(b);
}

/**
 * Merge local meals with remote active meals + optional tombstones that carry clocks.
 * Server tombstone ids alone are handled by applySyncResponse (server already LWW'd).
 */
function preserveLocalAnalyzeFields(cur: Meal, remote: Meal): Meal {
  let merged = remote;
  if (cur.analyzeJobId && !remote.analyzeJobId) {
    merged = { ...merged, analyzeJobId: cur.analyzeJobId };
  }
  // Photo blobs stay on device — stale server stubs must not wipe local paths.
  if (cur.imageUri && !remote.imageUri) {
    merged = {
      ...merged,
      imageUri: cur.imageUri,
      imageUris: cur.imageUris ?? [cur.imageUri],
    };
  }
  return merged;
}

export function mergeMealsLww(
  local: Meal[],
  remote: Meal[],
  tombstones: PendingDelete[],
): Meal[] {
  const byId = new Map<string, Meal>();
  for (const m of local) byId.set(m.id, m);
  for (const m of remote) {
    const cur = byId.get(m.id);
    if (!cur || newerOrEqual(m.clientUpdatedAt, cur.clientUpdatedAt)) {
      byId.set(m.id, cur ? preserveLocalAnalyzeFields(cur, m) : m);
    }
  }
  for (const t of tombstones) {
    const cur = byId.get(t.id);
    if (!cur || newerOrEqual(t.clientUpdatedAt, cur.clientUpdatedAt)) {
      byId.delete(t.id);
    }
  }
  return Array.from(byId.values());
}

/** Ensure meal has a clientUpdatedAt for wire payload (legacy → epoch). */
export function ensureClientUpdatedAt(meal: Meal): string {
  return meal.clientUpdatedAt ?? '1970-01-01T00:00:00.000Z';
}

export function mealToSyncPayload(meal: Meal): Meal {
  const clientUpdatedAt = ensureClientUpdatedAt(meal);
  const payload: Meal = {
    ...meal,
    clientUpdatedAt,
    // P0: URI stubs only — no blob upload
    imageUri: meal.imageUri,
    imageUris: meal.imageUris,
  };
  delete payload.analyzeJobId;
  return payload;
}

export function buildSyncPayload(args: {
  mode: 'full' | 'upsert' | 'delete';
  meals: Meal[];
  pendingDeletes: PendingDelete[];
  mealIds?: string[];
}): SyncPayload {
  const { mode, meals, pendingDeletes, mealIds } = args;

  if (mode === 'full') {
    return {
      upserts: meals.map(mealToSyncPayload),
      deletes: [...pendingDeletes],
    };
  }

  if (mode === 'upsert') {
    const ids = new Set(mealIds ?? []);
    return {
      upserts: meals.filter((m) => ids.has(m.id)).map(mealToSyncPayload),
      deletes: [],
    };
  }

  // delete
  const ids = new Set(mealIds ?? pendingDeletes.map((d) => d.id));
  return {
    upserts: [],
    deletes: pendingDeletes.filter((d) => ids.has(d.id)),
  };
}

/**
 * Apply server sync response: LWW remote meals into local; remove tombstone ids
 * (server already decided delete wins).
 */
export function applySyncResponse(
  local: Meal[],
  response: SyncResponse,
): Meal[] {
  const tombstoneSet = new Set(response.tombstones);
  const withoutTombs = local.filter((m) => !tombstoneSet.has(m.id));
  return mergeMealsLww(withoutTombs, response.meals, []);
}
