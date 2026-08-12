import { useEffect } from 'react';
import { configureStatusBar } from './configureStatusBar';

/** Applies Capacitor StatusBar style once on native mount. */
export function StatusBarBootstrap() {
  useEffect(() => {
    void configureStatusBar();
  }, []);

  return null;
}
