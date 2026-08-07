import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { syncKbjuWidget } from '../model/syncKbjuWidget';

/**
 * Keeps Android KBJU home widget in sync with diary/profile.
 * Mount once in AppShell.
 */
export function KbjuWidgetSync() {
  useEffect(() => {
    const schedule = () => {
      void syncKbjuWidget();
    };

    const unsubDiary = useDiaryStore.subscribe(schedule);
    const unsubProfile = useProfileStore.subscribe(schedule);

    const unsubDiaryHydration = useDiaryStore.persist.onFinishHydration(schedule);
    const unsubProfileHydration =
      useProfileStore.persist.onFinishHydration(schedule);

    if (useDiaryStore.persist.hasHydrated()) {
      schedule();
    }
    if (useProfileStore.persist.hasHydrated()) {
      schedule();
    }

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
      unsubDiaryHydration();
      unsubProfileHydration();
      void appHandle?.remove();
    };
  }, []);

  return null;
}
