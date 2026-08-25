/**
 * iOS Safari / Home Screen PWA often block `window.open` after `await`.
 * Preserve the user gesture by opening `about:blank` synchronously on click,
 * then navigate that window once the bot deep link is known.
 *
 * Do not pass `noopener` on the blank open — browsers may return `null`
 * and we need the Window reference to set `location` later.
 */

export type OpenTelegramBotDeepLinkResult = 'opened' | 'blocked';

/** Call synchronously inside the click handler, before any `await`. */
export function prepareTelegramLoginPopup(): Window | null {
  if (typeof window === 'undefined') return null;
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
 * Returns `blocked` when the browser gave no usable window (typical iOS PWA).
 */
export function openTelegramBotDeepLink(
  url: string,
  popup?: Window | null,
): OpenTelegramBotDeepLinkResult {
  if (typeof window === 'undefined') return 'blocked';

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
