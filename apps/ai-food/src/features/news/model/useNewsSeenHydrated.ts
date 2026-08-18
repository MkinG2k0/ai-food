import { useEffect, useState } from 'react';
import { useNewsSeenStore } from './useNewsSeenStore';

/** True after async Capacitor Preferences rehydration finishes. */
export function useNewsSeenHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useNewsSeenStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsubHydrate = useNewsSeenStore.persist.onHydrate(() =>
      setHydrated(false),
    );
    const unsubFinish = useNewsSeenStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    setHydrated(useNewsSeenStore.persist.hasHydrated());
    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  return hydrated;
}
