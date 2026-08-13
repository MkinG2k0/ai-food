import { useEffect, useRef } from 'react';
import { useDiaryStore } from '@/entities/meal';
import { useAuthHydrated, useAuthStore } from '@/features/auth';
import { syncDiaryMeals } from '@/features/diary-sync';

/**
 * Once per session after auth + diary persist hydrate: full diary sync (D-04).
 * Guests (no token) never call the API (D-05).
 */
export function DiarySyncOnAuthHydrate() {
  const authHydrated = useAuthHydrated();
  const userToken = useAuthStore((s) => s.userToken);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || !userToken || ranRef.current) return;

    const run = () => {
      if (ranRef.current) return;
      ranRef.current = true;
      void syncDiaryMeals({ mode: 'full' }).catch((err) => {
        console.warn('[diary-sync] hydrate full sync failed', err);
      });
    };

    const unsub = useDiaryStore.persist.onFinishHydration(run);
    if (useDiaryStore.persist.hasHydrated()) {
      run();
    }
    return unsub;
  }, [authHydrated, userToken]);

  return null;
}
