import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

export interface WeightEntry {
  id: string;
  /** Local calendar day as YYYY-MM-DD */
  date: string;
  kg: number;
}

interface WeightState {
  entries: WeightEntry[];
  /** Target weight in kg; null until seeded from profile */
  goalKg: number | null;
  addEntry: (kg: number, date?: Date) => void;
  setGoalKg: (kg: number) => void;
  ensureGoalKg: (seed: number) => void;
  /** Write onboarding weight into the log for planStartDate and set goal. */
  seedFromOnboarding: (kg: number, dateYmd: string, goalKg: number) => void;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampKg(kg: number): number {
  return Math.min(300, Math.max(20, Math.round(kg * 10) / 10));
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set, get) => ({
      entries: [],
      goalKg: null,
      addEntry: (kg, date = new Date()) => {
        const dayKey = toLocalDateKey(date);
        const value = clampKg(kg);
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `w-${Date.now()}`;

        set((state) => {
          const withoutSameDay = state.entries.filter((e) => e.date !== dayKey);
          const next = [
            ...withoutSameDay,
            { id, date: dayKey, kg: value },
          ].sort((a, b) => a.date.localeCompare(b.date));
          return { entries: next };
        });
      },
      setGoalKg: (kg) => set({ goalKg: clampKg(kg) }),
      ensureGoalKg: (seed) => {
        if (get().goalKg != null) return;
        set({ goalKg: clampKg(seed) });
      },
      /** Upsert onboarding weight for a calendar day and align goalKg. */
      seedFromOnboarding: (kg, dateYmd, goalKg) => {
        const day = new Date(`${dateYmd}T12:00:00`);
        get().addEntry(kg, day);
        get().setGoalKg(goalKg);
      },
    }),
    {
      name: 'ai-food-weight',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);

export function latestWeightKg(
  entries: WeightEntry[],
  fallback?: number | null,
): number | null {
  if (entries.length === 0) return fallback ?? null;
  return entries[entries.length - 1].kg;
}
