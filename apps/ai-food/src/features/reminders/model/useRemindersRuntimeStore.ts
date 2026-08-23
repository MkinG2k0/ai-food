import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

interface RemindersRuntimeState {
  lastForegroundAt: string | null;
  lastTimezoneOffsetMinutes: number | null;
  notifiedMilestoneKeys: string[];
  backgroundAnalyzeMealIds: string[];
  permissionPromptShown: boolean;
  recordForeground: (at?: Date) => void;
  recordBackgroundAnalyzing: (mealIds: string[]) => void;
  clearBackgroundAnalyzing: () => void;
  markMilestoneNotified: (key: string) => void;
  markPermissionPromptShown: () => void;
  setTimezoneOffset: (offsetMinutes: number) => boolean;
}

export const useRemindersRuntimeStore = create<RemindersRuntimeState>()(
  persist(
    (set, get) => ({
      lastForegroundAt: null,
      lastTimezoneOffsetMinutes: null,
      notifiedMilestoneKeys: [],
      backgroundAnalyzeMealIds: [],
      permissionPromptShown: false,
      recordForeground: (at = new Date()) => {
        set({ lastForegroundAt: at.toISOString() });
      },
      recordBackgroundAnalyzing: (mealIds) => {
        set({ backgroundAnalyzeMealIds: [...new Set(mealIds)] });
      },
      clearBackgroundAnalyzing: () => {
        set({ backgroundAnalyzeMealIds: [] });
      },
      markMilestoneNotified: (key) => {
        const current = get().notifiedMilestoneKeys;
        if (current.includes(key)) return;
        set({ notifiedMilestoneKeys: [...current, key] });
      },
      markPermissionPromptShown: () => {
        set({ permissionPromptShown: true });
      },
      setTimezoneOffset: (offsetMinutes) => {
        const prev = get().lastTimezoneOffsetMinutes;
        set({ lastTimezoneOffsetMinutes: offsetMinutes });
        return prev != null && prev !== offsetMinutes;
      },
    }),
    {
      name: 'ai-food-reminders-runtime',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
