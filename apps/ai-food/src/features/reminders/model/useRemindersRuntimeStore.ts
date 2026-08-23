import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

interface RemindersRuntimeState {
  lastForegroundAt: string | null;
  lastTimezoneOffsetMinutes: number | null;
  notifiedMilestoneKeys: string[];
  backgroundAnalyzeMealIds: string[];
  recordForeground: (at?: Date) => void;
  recordBackgroundAnalyzing: (mealIds: string[]) => void;
  clearBackgroundAnalyzing: () => void;
  markMilestoneNotified: (key: string) => void;
  setTimezoneOffset: (offsetMinutes: number) => boolean;
}

export const useRemindersRuntimeStore = create<RemindersRuntimeState>()(
  persist(
    (set, get) => ({
      lastForegroundAt: null,
      lastTimezoneOffsetMinutes: null,
      notifiedMilestoneKeys: [],
      backgroundAnalyzeMealIds: [],
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
