import { syncDiaryMeals } from './syncDiaryMeals';
import { syncFavorites } from '@/features/favorites-sync';
import { syncWeightHistory } from '@/features/weight-sync';

/** Fire-and-forget full sync for diary + weight + favorites (auth required). */
export function queueFullUserDataSync(reason: string): void {
  void syncDiaryMeals({ mode: 'full' }).catch((err) => {
    console.warn(`[user-data-sync] diary (${reason})`, err);
  });
  void syncWeightHistory({ mode: 'full' }).catch((err) => {
    console.warn(`[user-data-sync] weight (${reason})`, err);
  });
  void syncFavorites({ mode: 'full' }).catch((err) => {
    console.warn(`[user-data-sync] favorites (${reason})`, err);
  });
}
