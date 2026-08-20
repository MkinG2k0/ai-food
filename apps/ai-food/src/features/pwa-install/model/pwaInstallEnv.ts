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

/**
 * Android Intent to open the page in Chrome.
 * Do NOT set S.browser_fallback_url to the same https URL — Yandex then
 * "handles" the intent by reopening itself.
 */
export function getOpenInChromeHref(href?: string): string {
  if (typeof window === 'undefined') return href ?? '/';
  try {
    const url = new URL(href ?? window.location.href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return url.href;
    const path = `${url.host}${url.pathname}${url.search}${url.hash}`;
    return `intent://${path}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;end`;
  } catch {
    return href ?? window.location.href;
  }
}

/**
 * Yandex blocks Chrome Intents. Reliable paths: system share sheet (pick Chrome)
 * or clipboard so the user can paste into Chrome.
 */
export async function shareOrCopyInstallUrl(
  href?: string,
): Promise<'shared' | 'copied'> {
  const url =
    href ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!url) return 'copied';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: 'AI Food',
        text: 'Откройте ссылку в Chrome и нажмите «Установить»',
        url,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // ignore
  }
  return 'copied';
}

/** @deprecated use shareOrCopyInstallUrl — Intent is blocked by Yandex */
export async function openInChrome(href?: string): Promise<'intent' | 'copied'> {
  const result = await shareOrCopyInstallUrl(href);
  return result === 'shared' ? 'intent' : 'copied';
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
