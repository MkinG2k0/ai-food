import { useAuthStore } from '@/features/auth';
import { useDiaryStore } from '@/entities/meal';
import { applyStreakState } from '@/entities/streak';
import { useStreakStore } from '@/features/streak/model/useStreakStore';
import { syncStreakApi } from '../api/syncStreakApi';
import { applyStreakSyncResponse } from './streakSyncMerge';
import { streakSyncPayloadFromState } from './streakSyncPayload';

function bumpClock(): string {
  return new Date().toISOString();
}

/** Fresh streak payload from diary + persist (for wire and friends-facing sync). */
export function buildFreshStreakSyncPayload(now: Date = new Date()) {
  const state = useStreakStore.getState();
  const meals = useDiaryStore.getState().meals;
  const { snapshot, persistPatch } = applyStreakState(meals, state, now);
  return streakSyncPayloadFromState({
    ...state,
    ...persistPatch,
    currentLength: snapshot.currentLength,
  });
}

export async function syncStreak(): Promise<void> {
  if (!useAuthStore.getState().userToken) return;

  const state = useStreakStore.getState();
  const freshStreak = buildFreshStreakSyncPayload();
  const storedStreak = streakSyncPayloadFromState(state);
  const changed =
    JSON.stringify(freshStreak) !== JSON.stringify(storedStreak);
  const clientUpdatedAt = changed ? bumpClock() : state.clientUpdatedAt;

  if (changed) {
    useStreakStore.setState({
      ...freshStreak,
      clientUpdatedAt,
    });
  }

  const local = {
    streak: freshStreak,
    clientUpdatedAt,
  };

  const response = await syncStreakApi({
    streak: local.streak,
    clientUpdatedAt: local.clientUpdatedAt,
  });

  const next = applyStreakSyncResponse(local, response);
  useStreakStore.setState({
    currentLength: next.streak.currentLength,
    freezeCount: next.streak.freezeCount,
    consumedFreezeDateKeys: next.streak.consumedFreezeDateKeys,
    grantedMilestones: next.streak.grantedMilestones,
    lastCelebratedLocalDate: next.streak.lastCelebratedLocalDate,
    bestStreak: next.streak.bestStreak,
    clientUpdatedAt: next.clientUpdatedAt,
  });
}
