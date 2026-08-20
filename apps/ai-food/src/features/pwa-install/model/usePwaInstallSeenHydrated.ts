import { useEffect, useState } from 'react';
import { usePwaInstallSeenStore } from './usePwaInstallSeenStore';

/** True after async Capacitor Preferences rehydration finishes. */
export function usePwaInstallSeenHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    usePwaInstallSeenStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsubFinish = usePwaInstallSeenStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (usePwaInstallSeenStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsubFinish;
  }, []);

  return hydrated;
}
