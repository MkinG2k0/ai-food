import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Dark icons + white bar for light Capacitor UI. No-op on web.
 * Capacitor naming: Style.Light = dark text/icons on light backgrounds;
 * Style.Dark = light text/icons on dark backgrounds.
 */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await StatusBar.setStyle({ style: Style.Light });

  try {
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
  } catch {
    // Android 15+ may not support status bar background color.
  }
}
