import { PACE_DELTA_MAX } from './evaluateWeightPace';

/**
 * 0 = спокойный темп (в пределах ±PACE_DELTA_MAX),
 * 1 = нереально жёсткий (~2× лимита и выше).
 */
export function paceDifficulty01(rawDeltaKcal: number): number {
  const abs = Math.abs(rawDeltaKcal);
  return Math.min(1, abs / (PACE_DELTA_MAX * 2));
}

/** Background for a calendar day cell (green → yellow → red). */
export function paceDayBackground(rawDeltaKcal: number): string {
  const t = paceDifficulty01(rawDeltaKcal);
  const hue = Math.round(130 * (1 - t));
  return `hsl(${hue} 72% 88%)`;
}

export function paceDayLabel(rawDeltaKcal: number): 'ok' | 'hard' | 'impossible' {
  const abs = Math.abs(rawDeltaKcal);
  if (abs <= PACE_DELTA_MAX) return 'ok';
  if (abs <= PACE_DELTA_MAX * 2) return 'hard';
  return 'impossible';
}
