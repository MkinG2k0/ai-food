import { useEffect } from 'react';
import { useSettingsStore } from '@/features/settings';
import { bindAppDebugEnabled } from '@/shared/lib/appDebugLog';

/** Wires persisted debug flag into the in-memory log gate. */
export function AppDebugBridge() {
  useEffect(() => {
    bindAppDebugEnabled(() => useSettingsStore.getState().debugMode);

    const finishHydration = () => {
      bindAppDebugEnabled(() => useSettingsStore.getState().debugMode);
    };

    if (useSettingsStore.persist.hasHydrated()) {
      finishHydration();
    } else {
      return useSettingsStore.persist.onFinishHydration(finishHydration);
    }
  }, []);

  return null;
}
