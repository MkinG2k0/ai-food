import { syncDiaryMeals } from './syncDiaryMeals';
import { syncFavorites } from '@/features/favorites-sync';
import { syncSettings } from '@/features/settings-sync';
import { syncStreak } from '@/features/streak-sync';
import { syncWeightHistory } from '@/features/weight-sync';

/** Fire-and-forget full sync for diary + weight + favorites + settings + streak (auth required). */
export function queueFullUserDataSync(reason: string): void {
  void syncDiaryMeals({ mode: 'full' })
    .then(() => syncStreak())
    .catch((err) => {
      console.warn(`[user-data-sync] diary/streak (${reason})`, err);
    });
  void syncWeightHistory({ mode: 'full' }).catch((err) => {
    console.warn(`[user-data-sync] weight (${reason})`, err);
  });
  void syncFavorites({ mode: 'full' }).catch((err) => {
    console.warn(`[user-data-sync] favorites (${reason})`, err);
  });
  void syncSettings().catch((err) => {
    console.warn(`[user-data-sync] settings (${reason})`, err);
  });
}
