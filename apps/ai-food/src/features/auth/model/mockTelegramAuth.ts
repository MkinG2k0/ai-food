import { clearLocalUserDataOnSignOut } from './clearLocalUserDataOnSignOut';
import { useAuthStore } from './useAuthStore';

/**
 * Mock enabled unless VITE_AUTH_MOCK is explicitly "false".
 * Missing / empty / "true" → enabled (default for this stage).
 */
export function isAuthMockEnabled(): boolean {
  return import.meta.env.VITE_AUTH_MOCK !== 'false';
}

/**
 * Clear all local user data (except device id), then drop auth session.
 * Callers should navigate to `/onboarding`.
 */
export function signOut(): void {
  clearLocalUserDataOnSignOut();
  useAuthStore.getState().signOut();
}
