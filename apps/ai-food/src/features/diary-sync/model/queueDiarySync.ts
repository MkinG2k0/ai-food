import { syncDiaryMeals } from './syncDiaryMeals';

/** Fire-and-forget diary sync; never blocks UX (D-02/D-03). */
export function queueDiarySync(
  options: Parameters<typeof syncDiaryMeals>[0],
): void {
  void syncDiaryMeals(options).catch((err) => {
    console.warn('[diary-sync]', err);
  });
}
