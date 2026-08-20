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

/** Offer install UI only in mobile browser (not native APK / already installed). */
export function shouldOfferPwaInstall(dismissed: boolean): boolean {
  if (dismissed) return false;
  if (Capacitor.isNativePlatform()) return false;
  if (isRunningAsInstalledApp()) return false;
  return true;
}
