import { useEffect } from 'react';
import { useThemeStore } from '@/features/settings';
import { configureStatusBar } from './configureStatusBar';

/**
 * Keeps `html.dark`, theme-color, and Capacitor status bar in sync with
 * preference + OS `prefers-color-scheme`.
 */
export function ThemeSync() {
  const preference = useThemeStore((s) => s.preference);
  const resolved = useThemeStore((s) => s.resolved);
  const syncFromSystem = useThemeStore((s) => s.syncFromSystem);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncFromSystem();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [syncFromSystem]);

  useEffect(() => {
    void configureStatusBar(resolved);
  }, [preference, resolved]);

  return null;
}
