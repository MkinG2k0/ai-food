import { useEffect, useState } from 'react';
import { useProfileStore } from './useProfileStore';

/** True after async Capacitor Preferences rehydration finishes. */
export function useProfileHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useProfileStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsubHydrate = useProfileStore.persist.onHydrate(() =>
      setHydrated(false)
    );
    const unsubFinish = useProfileStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    setHydrated(useProfileStore.persist.hasHydrated());
    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  return hydrated;
}
