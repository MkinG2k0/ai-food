export type PaceWarning = {
  rawDeltaKcal: number;
  clampedDeltaKcal: number;
  clamped: boolean;
};

export type WeightPaceResult = PaceWarning & {
  deltaKg: number;
  days: number;
};

const KCAL_PER_KG = 7000;
/** Safe daily deficit clamp (kcal). */
export const PACE_DELTA_MIN = -500;
/** Safe daily surplus clamp (kcal). */
export const PACE_DELTA_MAX = 500;
const NEAR_ZERO_KG = 0.5;

function parseLocalDateYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Whole calendar days from local start of `now` day to target date (noon-safe). */
export function calendarDaysUntil(
  targetWeightDate: string,
  now: Date = new Date(),
): number {
  const target = parseLocalDateYmd(targetWeightDate);
  if (!target) return 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function evaluateWeightPace(input: {
  weight: number;
  targetWeight: number;
  targetWeightDate: string;
  now?: Date;
}): WeightPaceResult {
  const now = input.now ?? new Date();
  const deltaKg = input.targetWeight - input.weight;
  const days = calendarDaysUntil(input.targetWeightDate, now);

  const rawDeltaKcal =
    Math.abs(deltaKg) < NEAR_ZERO_KG
      ? 0
      : Math.round((deltaKg * KCAL_PER_KG) / days);

  const clampedDeltaKcal = clamp(rawDeltaKcal, PACE_DELTA_MIN, PACE_DELTA_MAX);

  return {
    deltaKg,
    days,
    rawDeltaKcal,
    clampedDeltaKcal,
    clamped: clampedDeltaKcal !== rawDeltaKcal,
  };
}
