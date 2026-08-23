import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isMealAnalyzeInFlight, useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { useWeightStore } from '@/features/stats';
import { useStreakStore } from '@/features/streak';
import {
  checkNotificationPermission,
  isNativeRemindersSupported,
} from '../model/localNotificationsNative';
import {
  maybeRequestReminderPermissionAfterOnboarding,
  queueRescheduleReminders,
} from '../model/rescheduleReminders';
import { useRemindersRuntimeStore } from '../model/useRemindersRuntimeStore';

/**
 * Wires reminder scheduling to app lifecycle and diary/profile changes.
 * Mount once in AppShell.
 */
export function ReminderLifecycle() {
  const navigate = useNavigate();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>(
    'prompt',
  );

  useEffect(() => {
    if (!isNativeRemindersSupported()) return;

    let removed = false;
    let actionHandle: { remove: () => Promise<void> } | undefined;

    void checkNotificationPermission().then((state) => {
      if (!removed) setPermission(state);
    });

    void import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      void LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (event) => {
          const route = event.notification.extra?.route;
          if (typeof route === 'string' && route.length > 0) {
            navigate(route);
          }
        },
      ).then((handle) => {
        if (removed) {
          void handle.remove();
          return;
        }
        actionHandle = handle;
      });
    });

    return () => {
      removed = true;
      void actionHandle?.remove();
    };
  }, [navigate]);

  useEffect(() => {
    const schedule = () => {
      queueRescheduleReminders();
    };

    const onForeground = () => {
      useRemindersRuntimeStore.getState().recordForeground();
      useRemindersRuntimeStore.getState().setTimezoneOffset(new Date().getTimezoneOffset());
      useRemindersRuntimeStore.getState().clearBackgroundAnalyzing();
      queueRescheduleReminders();
    };

    const onBackground = () => {
      const analyzingIds = useDiaryStore
        .getState()
        .meals.filter(
          (m) =>
            m.status === 'analyzing' ||
            isMealAnalyzeInFlight(m.id) ||
            Boolean(m.analyzeJobId),
        )
        .map((m) => m.id);
      useRemindersRuntimeStore
        .getState()
        .recordBackgroundAnalyzing(analyzingIds);
    };

    const unsubDiary = useDiaryStore.subscribe(schedule);
    const unsubSettings = useSettingsStore.subscribe(schedule);
    const unsubProfile = useProfileStore.subscribe(schedule);
    const unsubWeight = useWeightStore.subscribe(schedule);
    const unsubStreak = useStreakStore.subscribe(schedule);

    const unsubDiaryHydration =
      useDiaryStore.persist.onFinishHydration(() => {
        onForeground();
        void maybeRequestReminderPermissionAfterOnboarding();
      });
    const unsubSettingsHydration =
      useSettingsStore.persist.onFinishHydration(schedule);
    const unsubProfileHydration = useProfileStore.persist.onFinishHydration(
      () => {
        void maybeRequestReminderPermissionAfterOnboarding();
        schedule();
      },
    );

    if (useDiaryStore.persist.hasHydrated()) {
      onForeground();
      void maybeRequestReminderPermissionAfterOnboarding();
    } else {
      schedule();
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onForeground();
      else onBackground();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let appHandle: { remove: () => Promise<void> } | undefined;
    let removed = false;

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) onForeground();
        else onBackground();
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
      unsubSettings();
      unsubProfile();
      unsubWeight();
      unsubStreak();
      unsubDiaryHydration();
      unsubSettingsHydration();
      unsubProfileHydration();
      document.removeEventListener('visibilitychange', onVisibility);
      void appHandle?.remove();
    };
  }, []);

  void permission;
  return null;
}
