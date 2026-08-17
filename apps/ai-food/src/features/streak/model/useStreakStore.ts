import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useDiaryStore } from '@/entities/meal';
import {
  applyStreakState,
  EMPTY_STREAK_PERSIST,
  type StreakPersist,
  type StreakSnapshot,
} from '@/entities/streak';
import { capacitorStorage } from '@/shared/lib';

function bumpClock(): string {
  return new Date().toISOString();
}

function queueStreakSyncLater(): void {
  void import('@/features/streak-sync').then(({ queueStreakSync }) => {
    queueStreakSync();
  });
}

interface StreakStoreState extends StreakPersist {
  clientUpdatedAt: string;
  markCelebrated: (localDate: string) => void;
  applyPersistPatch: (patch: Partial<StreakPersist>) => void;
}

export const useStreakStore = create<StreakStoreState>()(
  persist(
    (set) => ({
      ...EMPTY_STREAK_PERSIST,
      clientUpdatedAt: bumpClock(),
      markCelebrated: (localDate) => {
        set({
          lastCelebratedLocalDate: localDate,
          clientUpdatedAt: bumpClock(),
        });
        queueStreakSyncLater();
      },
      applyPersistPatch: (patch) => {
        set({ ...patch, clientUpdatedAt: bumpClock() });
        queueStreakSyncLater();
      },
    }),
    {
      name: 'ai-food-streak',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        currentLength: state.currentLength,
        freezeCount: state.freezeCount,
        consumedFreezeDateKeys: state.consumedFreezeDateKeys,
        grantedMilestones: state.grantedMilestones,
        lastCelebratedLocalDate: state.lastCelebratedLocalDate,
        bestStreak: state.bestStreak,
        clientUpdatedAt: state.clientUpdatedAt,
      }),
    },
  ),
);

export interface UseStreakResult {
  snapshot: StreakSnapshot;
  markCelebrated: (localDate: string) => void;
  hydrated: boolean;
}

export function useStreak(now: Date = new Date()): UseStreakResult {
  const meals = useDiaryStore((state) => state.meals);
  const freezeCount = useStreakStore((state) => state.freezeCount);
  const currentLength = useStreakStore((state) => state.currentLength);
  const consumedFreezeDateKeys = useStreakStore(
    (state) => state.consumedFreezeDateKeys,
  );
  const grantedMilestones = useStreakStore((state) => state.grantedMilestones);
  const lastCelebratedLocalDate = useStreakStore(
    (state) => state.lastCelebratedLocalDate,
  );
  const bestStreak = useStreakStore((state) => state.bestStreak);
  const markCelebrated = useStreakStore((state) => state.markCelebrated);
  const applyPersistPatch = useStreakStore((state) => state.applyPersistPatch);
  const [hydrated, setHydrated] = useState(useStreakStore.persist.hasHydrated());
  const appliedRef = useRef<string>('');

  const persist = useMemo<StreakPersist>(
    () => ({
      currentLength,
      freezeCount,
      consumedFreezeDateKeys,
      grantedMilestones,
      lastCelebratedLocalDate,
      bestStreak,
    }),
    [
      currentLength,
      freezeCount,
      consumedFreezeDateKeys,
      grantedMilestones,
      lastCelebratedLocalDate,
      bestStreak,
    ],
  );

  useEffect(() => {
    const unsub = useStreakStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useStreakStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  const snapshot = useMemo(
    () => applyStreakState(meals, persist, now).snapshot,
    [meals, persist, now],
  );

  useEffect(() => {
    if (!hydrated) return;

    const { persistPatch } = applyStreakState(meals, persist, now);
    const patchKey = JSON.stringify(persistPatch);
    if (patchKey === '{}' || patchKey === appliedRef.current) return;

    appliedRef.current = patchKey;
    applyPersistPatch(persistPatch);
  }, [meals, persist, now, hydrated, applyPersistPatch]);

  return {
    snapshot,
    markCelebrated,
    hydrated,
  };
}
