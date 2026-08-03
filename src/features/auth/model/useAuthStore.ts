import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';
import type { TelegramSession } from './telegramSession';

interface AuthState {
  session: TelegramSession | null;
  signIn: (session: TelegramSession) => void;
  signOut: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
      isAuthenticated: () => get().session !== null,
    }),
    {
      name: 'ai-food-auth',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
