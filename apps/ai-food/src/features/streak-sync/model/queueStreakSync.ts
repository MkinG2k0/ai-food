import { syncStreak } from './syncStreak';

/** Fire-and-forget streak persist sync (auth required). */
export function queueStreakSync(): void {
  void syncStreak().catch((err) => {
    console.warn('[streak-sync]', err);
  });
}
