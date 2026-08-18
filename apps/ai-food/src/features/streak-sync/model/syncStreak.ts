import { useAuthStore } from '@/features/auth';
import { useDiaryStore } from '@/entities/meal';
import {
  applyStreakState,
  EMPTY_CALORIE_STREAK_PERSIST,
  type CalorieStreakInput,
} from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useStreakStore } from '@/features/streak/model/useStreakStore';
import { syncStreakApi } from '../api/syncStreakApi';
import { applyStreakSyncResponse } from './streakSyncMerge';
import { streakSyncPayloadFromState } from './streakSyncPayload';

function bumpClock(): string {
  return new Date().toISOString();
}

function calorieInputFromProfile(): CalorieStreakInput | null {
  const goal = useProfileStore.getState().profile?.goal;
  const kcalTarget = useProfileStore.getState().targets?.kcal;
  if (goal !== 'lose' && goal !== 'maintain' && goal !== 'gain') return null;
  if (kcalTarget == null || !Number.isFinite(kcalTarget) || kcalTarget <= 0) {
    return null;
  }
  return { goal, kcalTarget };
}

/** Fresh streak payload from diary + persist (for wire and friends-facing sync). */
export function buildFreshStreakSyncPayload(now: Date = new Date()) {
  const state = useStreakStore.getState();
  const meals = useDiaryStore.getState().meals;
  const persist = {
    currentLength: state.currentLength,
    freezeCount: state.freezeCount,
    consumedFreezeDateKeys: state.consumedFreezeDateKeys,
    grantedMilestones: state.grantedMilestones,
    lastCelebratedLocalDate: state.lastCelebratedLocalDate,
    bestStreak: state.bestStreak,
    calorieStreak: state.calorieStreak ?? EMPTY_CALORIE_STREAK_PERSIST,
  };
  const { snapshot, persistPatch } = applyStreakState(
    meals,
    persist,
    now,
    calorieInputFromProfile(),
  );
  return streakSyncPayloadFromState({
    ...persist,
    ...persistPatch,
    currentLength: snapshot.currentLength,
    calorieStreak: persistPatch.calorieStreak ?? persist.calorieStreak,
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
    calorieStreak: next.streak.calorieStreak ?? local.streak.calorieStreak,
    clientUpdatedAt: next.clientUpdatedAt,
  });
}
