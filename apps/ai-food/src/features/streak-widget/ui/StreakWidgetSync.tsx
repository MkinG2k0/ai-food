import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { useStreakStore } from '@/features/streak';
import { syncStreakWidget } from '../model/syncStreakWidget';

/**
 * Keeps Android streak home widgets in sync with diary / profile / streak persist.
 * Mount once in AppShell.
 */
export function StreakWidgetSync() {
  useEffect(() => {
    const schedule = () => {
      void syncStreakWidget();
    };

    const unsubDiary = useDiaryStore.subscribe(schedule);
    const unsubProfile = useProfileStore.subscribe(schedule);
    const unsubStreak = useStreakStore.subscribe(schedule);

    const unsubDiaryHydration = useDiaryStore.persist.onFinishHydration(schedule);
    const unsubProfileHydration =
      useProfileStore.persist.onFinishHydration(schedule);
    const unsubStreakHydration =
      useStreakStore.persist.onFinishHydration(schedule);

    if (useDiaryStore.persist.hasHydrated()) schedule();
    if (useProfileStore.persist.hasHydrated()) schedule();
    if (useStreakStore.persist.hasHydrated()) schedule();

    let appHandle: { remove: () => Promise<void> } | undefined;
    let removed = false;

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) schedule();
      }).then((handle) => {
        if (removed) {
          void handle.remove();
          return;
        }
        appHandle = handle;
      });
    }

    return () => {
      removed = true;
      unsubDiary();
      unsubProfile();
      unsubStreak();
      unsubDiaryHydration();
      unsubProfileHydration();
      unsubStreakHydration();
      void appHandle?.remove();
    };
  }, []);

  return null;
}
