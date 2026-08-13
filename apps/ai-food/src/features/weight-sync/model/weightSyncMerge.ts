import type { WeightEntry } from '@/features/stats';

export type PendingDelete = { id: string; clientUpdatedAt: string };

export type WeightSyncResponse = {
  weights: WeightEntry[];
  tombstones: string[];
  goalKg: number | null;
};

function clockMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function newerOrEqual(a: string | undefined, b: string | undefined): boolean {
  return clockMs(a) >= clockMs(b);
}

export function mergeWeightsLww(
  local: WeightEntry[],
  remote: WeightEntry[],
  tombstoneIds: string[],
): WeightEntry[] {
  const byId = new Map<string, WeightEntry>();
  for (const e of local) byId.set(e.id, e);
  for (const e of remote) {
    const cur = byId.get(e.id);
    if (!cur || newerOrEqual(e.clientUpdatedAt, cur.clientUpdatedAt)) {
      byId.set(e.id, e);
    }
  }
  for (const id of tombstoneIds) byId.delete(id);

  // Collapse same calendar day: keep newer clock
  const byDate = new Map<string, WeightEntry>();
  for (const e of byId.values()) {
    const cur = byDate.get(e.date);
    if (!cur || newerOrEqual(e.clientUpdatedAt, cur.clientUpdatedAt)) {
      byDate.set(e.date, e);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function ensureClientUpdatedAt(entry: WeightEntry): string {
  return entry.clientUpdatedAt ?? '1970-01-01T00:00:00.000Z';
}

export function buildWeightSyncPayload(args: {
  mode: 'full' | 'upsert';
  entries: WeightEntry[];
  goalKg: number | null;
  entryIds?: string[];
}): { upserts: WeightEntry[]; goalKg: number | null } {
  const { mode, entries, goalKg, entryIds } = args;
  const list =
    mode === 'full'
      ? entries
      : entries.filter((e) => (entryIds ?? []).includes(e.id));
  return {
    upserts: list.map((e) => ({
      ...e,
      clientUpdatedAt: ensureClientUpdatedAt(e),
    })),
    goalKg,
  };
}

export function applyWeightSyncResponse(
  local: WeightEntry[],
  response: WeightSyncResponse,
): WeightEntry[] {
  return mergeWeightsLww(local, response.weights, response.tombstones);
}
