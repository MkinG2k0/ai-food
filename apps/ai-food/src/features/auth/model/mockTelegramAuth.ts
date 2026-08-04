import { useAuthStore } from './useAuthStore';

/**
 * Mock enabled unless VITE_AUTH_MOCK is explicitly "false".
 * Missing / empty / "true" → enabled (default for this stage).
 */
export function isAuthMockEnabled(): boolean {
  return import.meta.env.VITE_AUTH_MOCK !== 'false';
}

/** Auth.js-shaped helper: clear local session. */
export function signOut(): void {
  useAuthStore.getState().signOut();
}
