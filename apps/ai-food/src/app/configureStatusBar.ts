import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  isDarkResolved,
  themeBackground,
  type ResolvedTheme,
} from '@/shared/lib/theme';

function resolveFromDom(): ResolvedTheme {
  const root = document.documentElement;
  if (root.classList.contains('theme-forest')) return 'forest';
  if (root.classList.contains('dark')) return 'dark';
  return 'light';
}

/**
 * Status bar icons + background for Capacitor. No-op on web.
 * Capacitor naming: Style.Light = dark text/icons on light backgrounds;
 * Style.Dark = light text/icons on dark backgrounds.
 */
export async function configureStatusBar(
  resolved: ResolvedTheme = resolveFromDom(),
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const style = isDarkResolved(resolved) ? Style.Dark : Style.Light;
  await StatusBar.setStyle({ style });

  try {
    await StatusBar.setBackgroundColor({ color: themeBackground(resolved) });
  } catch {
    // Android 15+ may not support status bar background color.
  }
}
