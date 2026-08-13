import { useEffect, useRef } from 'react';
import { useDiaryStore } from '@/entities/meal';
import { useAuthHydrated, useAuthStore } from '@/features/auth';
import { queueFullUserDataSync } from '@/features/diary-sync';
import { useFavoritesStore } from '@/features/favorites';
import { useWeightStore } from '@/features/stats';

/**
 * Once per session after auth + persist hydrate: full diary/weight/favorites sync.
 * Guests (no token) never call the APIs.
 */
export function DiarySyncOnAuthHydrate() {
  const authHydrated = useAuthHydrated();
  const userToken = useAuthStore((s) => s.userToken);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || !userToken || ranRef.current) return;

    const run = () => {
      if (ranRef.current) return;
      if (
        !useDiaryStore.persist.hasHydrated() ||
        !useWeightStore.persist.hasHydrated() ||
        !useFavoritesStore.persist.hasHydrated()
      ) {
        return;
      }
      ranRef.current = true;
      queueFullUserDataSync('hydrate');
    };

    const unsubs = [
      useDiaryStore.persist.onFinishHydration(run),
      useWeightStore.persist.onFinishHydration(run),
      useFavoritesStore.persist.onFinishHydration(run),
    ];
    run();
    return () => {
      for (const u of unsubs) u?.();
    };
  }, [authHydrated, userToken]);

  return null;
}
