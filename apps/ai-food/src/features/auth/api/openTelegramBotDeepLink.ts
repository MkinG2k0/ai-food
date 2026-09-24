import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * iOS Safari / Home Screen PWA often block `window.open` after `await`.
 * Preserve the user gesture by opening `about:blank` synchronously on click,
 * then navigate that window once the bot deep link is known.
 *
 * Do not pass `noopener` on the blank open — browsers may return `null`
 * and we need the Window reference to set `location` later.
 *
 * Capacitor native: never open `about:blank` — WebView maps `window.open`
 * to Custom Tabs that stay blank because `popup.location` cannot be assigned.
 * Open the real `t.me` URL via `@capacitor/browser` instead.
 */

export type OpenTelegramBotDeepLinkResult = 'opened' | 'blocked';

/** Call synchronously inside the click handler, before any `await`. */
export function prepareTelegramLoginPopup(): Window | null {
  if (typeof window === 'undefined') return null;
  if (Capacitor.isNativePlatform()) return null;
  try {
    const popup = window.open('about:blank', '_blank');
    if (!popup || popup.closed) return null;
    return popup;
  } catch {
    return null;
  }
}

/**
 * Navigate a pre-opened blank popup, or try a late `window.open`.
 * On Capacitor native, opens Chrome Custom Tabs / SFSafariViewController.
 * Returns `blocked` when the browser gave no usable window (typical iOS PWA).
 */
export async function openTelegramBotDeepLink(
  url: string,
  popup?: Window | null,
): Promise<OpenTelegramBotDeepLinkResult> {
  if (typeof window === 'undefined') return 'blocked';

  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return 'opened';
    } catch {
      return 'blocked';
    }
  }

  if (popup && !popup.closed) {
    try {
      popup.location.href = url;
      try {
        popup.opener = null;
      } catch {
        // ignore — some browsers lock opener
      }
      return 'opened';
    } catch {
      try {
        popup.close();
      } catch {
        // ignore
      }
    }
  }

  try {
    const win = window.open(url, '_blank');
    if (win && !win.closed) {
      try {
        win.opener = null;
      } catch {
        // ignore
      }
      return 'opened';
    }
  } catch {
    // ignore
  }

  return 'blocked';
}
