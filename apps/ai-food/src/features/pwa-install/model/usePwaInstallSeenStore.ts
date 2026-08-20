import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

interface PwaInstallSeenState {
  dismissed: boolean;
  dismiss: () => void;
}

export const usePwaInstallSeenStore = create<PwaInstallSeenState>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    {
      name: 'ai-food-pwa-install-seen',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({ dismissed: state.dismissed }),
    },
  ),
);
