import { Capacitor } from '@capacitor/core';

/** True when the app already runs as installed PWA / home-screen icon. */
export function isRunningAsInstalledApp(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return false;
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  // Chrome/Firefox iOS still need Share → Add to Home Screen
  return true;
}

/** Yandex Browser (Chromium). May skip `beforeinstallprompt` — manual menu install. */
export function isYandexBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /YaBrowser|Yowser/i.test(navigator.userAgent);
}

/** Manual steps when deferred install prompt is unavailable. */
export function getManualInstallHint(): { kind: 'ios' | 'yandex' | 'generic' } {
  if (isIosSafari()) return { kind: 'ios' };
  if (isYandexBrowser()) return { kind: 'yandex' };
  return { kind: 'generic' };
}

function canInstallInThisEnvironment(): boolean {
  if (Capacitor.isNativePlatform()) return false;
  if (isRunningAsInstalledApp()) return false;
  return true;
}

/** Offer install UI only in mobile browser (not native APK / already installed). */
export function shouldOfferPwaInstall(dismissed: boolean): boolean {
  if (dismissed) return false;
  return canInstallInThisEnvironment();
}

/** Settings: show install after user skipped the first-visit screen. */
export function shouldShowSettingsPwaInstall(dismissed: boolean): boolean {
  if (!dismissed) return false;
  return canInstallInThisEnvironment();
}
