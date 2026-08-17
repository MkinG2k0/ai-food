import type { StreakSyncPayload } from './streakSyncPayload';

export type StreakSyncSnapshot = {
  streak: StreakSyncPayload;
  clientUpdatedAt: string;
};

function clockMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Pure LWW: remote wins when its clock is >= local. */
export function mergeStreakLww(
  local: StreakSyncSnapshot,
  remote: StreakSyncSnapshot,
): StreakSyncSnapshot {
  if (clockMs(remote.clientUpdatedAt) >= clockMs(local.clientUpdatedAt)) {
    return remote;
  }
  return local;
}

export function applyStreakSyncResponse(
  local: StreakSyncSnapshot,
  response: StreakSyncSnapshot,
): StreakSyncSnapshot {
  return mergeStreakLww(local, response);
}
