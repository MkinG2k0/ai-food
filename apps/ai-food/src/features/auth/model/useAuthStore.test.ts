import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useAuthStore } from './useAuthStore';
import { isAuthMockEnabled, signOut } from './mockTelegramAuth';

beforeEach(async () => {
  await act(async () => {
    await useAuthStore.persist.rehydrate();
  });
  useAuthStore.setState({ session: null, userToken: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useAuthStore', () => {
  it('persists under storage key ai-food-auth', () => {
    expect(useAuthStore.persist.getOptions().name).toBe('ai-food-auth');
  });

  it('starts with null session and isAuthenticated false', () => {
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('signIn sets session and isAuthenticated becomes true', async () => {
    const session = {
      id: 'tg-1',
      name: 'Test User',
      username: 'test_user',
      photo_url: 'https://example.com/avatar.png',
      telegramId: 42,
    };

    await act(async () => {
      useAuthStore.getState().signIn(session);
    });

    expect(useAuthStore.getState().session).toEqual(session);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('signOut clears session to null', async () => {
    await act(async () => {
      useAuthStore.getState().signIn({
        id: 'tg-1',
        name: 'Test User',
        username: 'test_user',
        photo_url: 'https://example.com/avatar.png',
      }, 'jwt-token');
      useAuthStore.getState().signOut();
    });

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().userToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});

describe('mockTelegramAuth', () => {
  it('signOut clears session via store', async () => {
    await act(async () => {
      useAuthStore.getState().signIn({
        id: 'tg-1',
        name: 'Test User',
        username: 'test_user',
        photo_url: 'https://example.com/avatar.png',
      });
      signOut();
    });

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('isAuthMockEnabled is true when VITE_AUTH_MOCK is unset', () => {
    vi.stubEnv('VITE_AUTH_MOCK', undefined as unknown as string);
    expect(isAuthMockEnabled()).toBe(true);
  });

  it('isAuthMockEnabled is true when VITE_AUTH_MOCK is true', () => {
    vi.stubEnv('VITE_AUTH_MOCK', 'true');
    expect(isAuthMockEnabled()).toBe(true);
  });

  it('isAuthMockEnabled is false when VITE_AUTH_MOCK is false', () => {
    vi.stubEnv('VITE_AUTH_MOCK', 'false');
    expect(isAuthMockEnabled()).toBe(false);
  });
});
