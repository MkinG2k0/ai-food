import { openTelegramChatWithTextNative } from './telegramSupportNative';

/** Support / feedback Telegram (settings, debug logs, legal). */
export const SUPPORT_TELEGRAM_USERNAME = 'mk_dag';

export const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_TELEGRAM_USERNAME}`;

export const SUPPORT_TELEGRAM_LABEL = `@${SUPPORT_TELEGRAM_USERNAME}`;

/** Telegram draft limit — longer text may be ignored by the client. */
export const SUPPORT_TELEGRAM_TEXT_LIMIT = 3500;

export function buildSupportTelegramWebUrl(text: string): string {
  return `${SUPPORT_TELEGRAM_URL}?text=${encodeURIComponent(text)}`;
}

export function buildSupportTelegramNativeUrl(text: string): string {
  return `tg://resolve?domain=${SUPPORT_TELEGRAM_USERNAME}&text=${encodeURIComponent(text)}`;
}

export function trimTextForTelegramDraft(text: string): string {
  if (text.length <= SUPPORT_TELEGRAM_TEXT_LIMIT) return text;
  return `${text.slice(0, SUPPORT_TELEGRAM_TEXT_LIMIT)}\n… (обрезано, полный лог в буфере)`;
}

/**
 * Opens support chat with pre-filled draft text.
 * Android: native Intent into Telegram (WebView drops ?text=).
 */
export async function openSupportTelegramWithText(text: string): Promise<void> {
  const draft = trimTextForTelegramDraft(text);

  if (await openTelegramChatWithTextNative(SUPPORT_TELEGRAM_USERNAME, draft)) {
    return;
  }

  window.location.assign(buildSupportTelegramWebUrl(draft));
}
