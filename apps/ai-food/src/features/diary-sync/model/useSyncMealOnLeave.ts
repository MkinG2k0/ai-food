import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth';
import { useDiaryStore } from '@/entities/meal';
import { syncDiaryMeals } from './syncDiaryMeals';

/**
 * Upsert the meal once when leaving meal UI (D-01).
 * Does not sync on each field edit while mounted.
 */
export function useSyncMealOnLeave(mealId: string): void {
  const mealIdRef = useRef(mealId);
  mealIdRef.current = mealId;

  useEffect(() => {
    return () => {
      const id = mealIdRef.current;
      if (!id) return;
      if (!useAuthStore.getState().userToken) return;
      const meal = useDiaryStore.getState().meals.find((m) => m.id === id);
      if (!meal) return;
      void syncDiaryMeals({ mode: 'upsert', mealIds: [id] }).catch((err) => {
        console.warn('[diary-sync] leave upsert failed', err);
      });
    };
  }, []);
}
