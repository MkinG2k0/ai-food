import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useDiaryStore } from '@/entities/meal';
import { EMPTY_CALORIE_STREAK_PERSIST } from '@/entities/streak';
import { KbjuWidget } from '@/features/kbju-widget';
import { useProfileStore } from '@/features/onboarding';
import { useStreakStore } from '@/features/streak';
import {
  STREAK_WIDGET_PREFS_KEY,
  buildStreakWidgetSnapshot,
  calorieInputFromProfile,
} from './buildStreakWidgetSnapshot';

const DEBOUNCE_MS = 200;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;

async function writeSnapshotAndRefresh(): Promise<void> {
  const { meals } = useDiaryStore.getState();
  const streak = useStreakStore.getState();
  const { profile, targets } = useProfileStore.getState();
  const snapshot = buildStreakWidgetSnapshot(
    meals,
    {
      currentLength: streak.currentLength,
      freezeCount: streak.freezeCount,
      consumedFreezeDateKeys: streak.consumedFreezeDateKeys,
      grantedMilestones: streak.grantedMilestones,
      lastCelebratedLocalDate: streak.lastCelebratedLocalDate,
      bestStreak: streak.bestStreak,
      calorieStreak: streak.calorieStreak ?? EMPTY_CALORIE_STREAK_PERSIST,
    },
    calorieInputFromProfile(profile?.goal, targets?.kcal),
  );

  await Preferences.set({
    key: STREAK_WIDGET_PREFS_KEY,
    value: JSON.stringify(snapshot),
  });

  if (Capacitor.isNativePlatform()) {
    await KbjuWidget.refresh();
  }
}

/** Compute streak widget snapshot → Preferences → native refresh. */
export function syncStreakWidget(): Promise<void> {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  return new Promise((resolve, reject) => {
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const run = inflight
        ? inflight.then(() => writeSnapshotAndRefresh())
        : writeSnapshotAndRefresh();
      inflight = run.finally(() => {
        if (inflight === run) inflight = null;
      });
      void run.then(resolve, reject);
    }, DEBOUNCE_MS);
  });
}
