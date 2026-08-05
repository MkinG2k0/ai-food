import { useEffect, useState } from 'react';
import { useAuthStore } from './useAuthStore';

/** True after async Capacitor Preferences rehydration finishes. */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsubHydrate = useAuthStore.persist.onHydrate(() =>
      setHydrated(false)
    );
    const unsubFinish = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    setHydrated(useAuthStore.persist.hasHydrated());
    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  return hydrated;
}
