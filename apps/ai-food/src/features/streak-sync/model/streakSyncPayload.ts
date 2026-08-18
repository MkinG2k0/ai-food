import {
  EMPTY_CALORIE_STREAK_PERSIST,
  type CalorieStreakPersist,
  type StreakPersist,
} from '@/entities/streak';

export type StreakSyncPayload = StreakPersist;

export type SyncStreakApiBody = {
  streak: StreakSyncPayload;
  clientUpdatedAt: string;
};

export type SyncStreakApiResponse = {
  streak: StreakSyncPayload;
  clientUpdatedAt: string;
};

export function streakSyncPayloadFromState(state: {
  currentLength: number;
  freezeCount: number;
  consumedFreezeDateKeys: string[];
  grantedMilestones: number[];
  lastCelebratedLocalDate: string;
  bestStreak: number;
  calorieStreak?: CalorieStreakPersist | null;
}): StreakSyncPayload {
  return {
    currentLength: state.currentLength,
    freezeCount: state.freezeCount,
    consumedFreezeDateKeys: state.consumedFreezeDateKeys,
    grantedMilestones: state.grantedMilestones,
    lastCelebratedLocalDate: state.lastCelebratedLocalDate,
    bestStreak: state.bestStreak,
    calorieStreak: state.calorieStreak ?? EMPTY_CALORIE_STREAK_PERSIST,
  };
}
