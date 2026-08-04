import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';
import type { TelegramSession } from './telegramSession';

interface AuthState {
  session: TelegramSession | null;
  /** Gateway user JWT for X-User-Token (real Telegram login). */
  userToken: string | null;
  signIn: (session: TelegramSession, userToken?: string | null) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userToken: null,
      signIn: (session, userToken = null) => set({ session, userToken }),
      signOut: () => set({ session: null, userToken: null }),
      isAuthenticated: () => get().session !== null,
    }),
    {
      name: 'ai-food-auth',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
