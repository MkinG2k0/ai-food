import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  themeBackground,
  type ResolvedTheme,
} from '@/shared/lib/theme';

function resolveFromDom(): ResolvedTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
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

  const style = resolved === 'dark' ? Style.Dark : Style.Light;
  await StatusBar.setStyle({ style });

  try {
    await StatusBar.setBackgroundColor({ color: themeBackground(resolved) });
  } catch {
    // Android 15+ may not support status bar background color.
  }
}
