import { EMPTY_CALORIE_STREAK_PERSIST } from '@/entities/streak';
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
  const winner = mergeStreakLww(local, response);
  if (winner.streak.calorieStreak == null) {
    return {
      ...winner,
      streak: {
        ...winner.streak,
        calorieStreak: local.streak.calorieStreak ?? EMPTY_CALORIE_STREAK_PERSIST,
      },
    };
  }
  return winner;
}
