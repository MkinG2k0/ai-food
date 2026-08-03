import type { TelegramSession } from './telegramSession';
import { useAuthStore } from './useAuthStore';

/** Stable mock Telegram user for demo Auth.js-shaped sign-in. */
const MOCK_TELEGRAM_SESSION: TelegramSession = {
  id: 'mock-telegram-1',
  name: 'Telegram User',
  username: 'telegram_user',
  photo_url:
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="32" fill="#229ED9"/>' +
        '<text x="32" y="40" text-anchor="middle" font-size="28" fill="#fff" font-family="sans-serif">T</text>' +
        '</svg>',
    ),
  telegramId: 100000001,
};

/**
 * Mock enabled unless VITE_AUTH_MOCK is explicitly "false".
 * Missing / empty / "true" → enabled (default for this stage).
 */
export function isAuthMockEnabled(): boolean {
  return import.meta.env.VITE_AUTH_MOCK !== 'false';
}

/** Auth.js-shaped helper: mock Telegram sign-in writes local session. */
export function signInWithMockTelegram(): TelegramSession {
  useAuthStore.getState().signIn(MOCK_TELEGRAM_SESSION);
  return MOCK_TELEGRAM_SESSION;
}

/** Auth.js-shaped helper: clear local session. */
export function signOut(): void {
  useAuthStore.getState().signOut();
}
