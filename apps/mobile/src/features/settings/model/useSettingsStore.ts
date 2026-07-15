import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

interface SettingsState {
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      customInstructions: '',
      setCustomInstructions: (value) =>
        set({
          customInstructions: value.slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH),
        }),
    }),
    {
      name: 'ai-food-settings',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
