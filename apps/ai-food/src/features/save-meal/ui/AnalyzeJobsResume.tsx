import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { recoverStaleAnalyzingMeals, useDiaryStore } from '@/entities/meal';
import { resumePendingAnalyzes } from '../model/resumePendingAnalyzes';
import { useRetryAnalyzeMeal } from '../model/useRetryAnalyzeMeal';

/**
 * After lock / process death: keep analyzing meals, poll durable gateway jobs,
 * then apply the result to the diary card.
 */
export function AnalyzeJobsResume() {
  const retry = useRetryAnalyzeMeal();
  const queryClient = useQueryClient();

  useEffect(() => {
    let removed = false;
    const run = () => {
      if (removed) return;
      recoverStaleAnalyzingMeals();
      void resumePendingAnalyzes(retry, queryClient);
    };

    const unsubHydration = useDiaryStore.persist.onFinishHydration(run);
    if (useDiaryStore.persist.hasHydrated()) {
      run();
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let appHandle: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) run();
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
      unsubHydration();
      document.removeEventListener('visibilitychange', onVisibility);
      void appHandle?.remove();
    };
  }, [queryClient, retry]);

  return null;
}
