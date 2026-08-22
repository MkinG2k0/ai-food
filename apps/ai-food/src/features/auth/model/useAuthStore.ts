import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage, queryClient } from '@/shared/lib';
import { clearUsageCache, usageQueryKey } from '../api/fetchUsage';
import type { TelegramSession } from './telegramSession';

interface AuthState {
  session: TelegramSession | null;
  /** Gateway user JWT for X-User-Token (real Telegram login). */
  userToken: string | null;
  dataConsentAt: string | null;
  dataConsentVersion: string | null;
  signIn: (
    session: TelegramSession,
    userToken?: string | null,
    consent?: {
      dataConsentAt: string | null;
      dataConsentVersion: string | null;
    },
  ) => void;
  setDataConsent: (at: string | null, version: string | null) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
  hasDataConsent: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userToken: null,
      dataConsentAt: null,
      dataConsentVersion: null,
      signIn: (session, userToken = null, consent) => {
        clearUsageCache();
        set({
          session,
          userToken,
          dataConsentAt: consent?.dataConsentAt ?? null,
          dataConsentVersion: consent?.dataConsentVersion ?? null,
        });
        void queryClient.invalidateQueries({ queryKey: usageQueryKey });
      },
      setDataConsent: (dataConsentAt, dataConsentVersion) =>
        set({ dataConsentAt, dataConsentVersion }),
      signOut: () =>
        set({
          session: null,
          userToken: null,
          dataConsentAt: null,
          dataConsentVersion: null,
        }),
      isAuthenticated: () => get().session !== null,
      hasDataConsent: () => Boolean(get().dataConsentAt),
    }),
    {
      name: 'ai-food-auth',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
