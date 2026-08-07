import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { computeTodayKbjuSnapshot } from '@/shared/lib';
import { KbjuWidget } from '../api/kbjuWidgetPlugin';

export const KBJU_WIDGET_PREFS_KEY = 'ai-food-widget-kbju';

const DEBOUNCE_MS = 200;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;

async function writeSnapshotAndRefresh(): Promise<void> {
  const { meals } = useDiaryStore.getState();
  const { targets } = useProfileStore.getState();
  const snapshot = computeTodayKbjuSnapshot(meals, targets);

  await Preferences.set({
    key: KBJU_WIDGET_PREFS_KEY,
    value: JSON.stringify(snapshot),
  });

  if (Capacitor.isNativePlatform()) {
    await KbjuWidget.refresh();
  }
}

/** Compute today KBJU snapshot → Preferences → native widget refresh. */
export function syncKbjuWidget(): Promise<void> {
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
