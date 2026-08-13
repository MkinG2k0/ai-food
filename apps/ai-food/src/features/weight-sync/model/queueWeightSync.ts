import { syncWeightHistory } from './syncWeightHistory';

export function queueWeightSync(
  options: Parameters<typeof syncWeightHistory>[0],
): void {
  void syncWeightHistory(options).catch((err) => {
    console.warn('[weight-sync]', err);
  });
}
