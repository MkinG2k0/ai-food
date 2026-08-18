import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

interface NewsSeenState {
  lastSeenDate: string | null;
  dismissLatest: (date: string) => void;
}

export const useNewsSeenStore = create<NewsSeenState>()(
  persist(
    (set) => ({
      lastSeenDate: null,
      dismissLatest: (date) => set({ lastSeenDate: date }),
    }),
    {
      name: 'ai-food-news-seen',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({ lastSeenDate: state.lastSeenDate }),
    },
  ),
);
