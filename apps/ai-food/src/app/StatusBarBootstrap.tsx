import { useEffect } from 'react';
import { configureStatusBar } from './configureStatusBar';

/**
 * Applies Capacitor StatusBar from current `html.dark` class.
 * ThemeSync also updates on preference change; this covers first native mount.
 */
export function StatusBarBootstrap() {
  useEffect(() => {
    void configureStatusBar();
  }, []);

  return null;
}
