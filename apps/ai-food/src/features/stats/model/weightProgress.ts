import type { Goal } from '@ai-food/shared-types';
import type { WeightEntry } from './useWeightStore';

export function goalTitle(goal: Goal): string {
  if (goal === 'lose') return 'Сбросить вес';
  if (goal === 'gain') return 'Набрать вес';
  return 'Поддерживать вес';
}

/** Soft default target when user hasn't set one yet (±5 kg by goal). */
export function defaultGoalKg(currentKg: number, goal: Goal): number {
  if (goal === 'lose') return Math.round((currentKg - 5) * 10) / 10;
  if (goal === 'gain') return Math.round((currentKg + 5) * 10) / 10;
  return Math.round(currentKg * 10) / 10;
}

const REACH_EPS_KG = 0.05;
/** Maintain band: within this of target counts as on-goal. */
const MAINTAIN_BAND_KG = 0.5;

/**
 * True when current weight meets the target for this goal type.
 * For maintain: also true if trend entries have crossed/straddled the goal line
 * (hit the target along the way), so the “update goal” CTA can appear.
 */
export function isGoalReached(
  currentKg: number,
  goalKg: number,
  goal: Goal,
  entries: { kg: number }[] = [],
): boolean {
  if (goal === 'lose') return currentKg <= goalKg + REACH_EPS_KG;
  if (goal === 'gain') return currentKg >= goalKg - REACH_EPS_KG;
  if (Math.abs(currentKg - goalKg) <= MAINTAIN_BAND_KG) return true;
  if (entries.length === 0) return false;
  const weights = entries.map((e) => e.kg);
  return Math.min(...weights) <= goalKg && Math.max(...weights) >= goalKg;
}

export function remainingCopy(
  currentKg: number,
  goalKg: number,
  goal: Goal,
  entries: { kg: number }[] = [],
): string {
  if (isGoalReached(currentKg, goalKg, goal, entries)) {
    return 'Цель достигнута';
  }
  const delta = Math.round((goalKg - currentKg) * 10) / 10;
  if (goal === 'maintain') {
    return `${Math.abs(delta).toFixed(1)} кг от цели`;
  }
  if (goal === 'lose') {
    const left = Math.max(0, Math.round((currentKg - goalKg) * 10) / 10);
    return `${left.toFixed(1)} кг осталось`;
  }
  const left = Math.max(0, Math.round((goalKg - currentKg) * 10) / 10);
  return `${left.toFixed(1)} кг осталось`;
}

/** Append « · до <ru date>» when deadline exists and goal not yet reached. */
export function formatWeightDeadlineCopy(
  remaining: string,
  targetWeightDate: string | null | undefined,
  reached: boolean,
): string {
  if (reached) return remaining;
  const ymd = targetWeightDate?.trim();
  if (!ymd) return remaining;
  const formatted = new Date(`${ymd}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${remaining} · до ${formatted}`;
}

export interface WeightChartPoint {
  date: Date;
  kg: number;
}

/** Points for the last `dayCount` local days that have a log. */
export function getWeightTrendPoints(
  entries: WeightEntry[],
  dayCount = 30,
  today: Date = new Date(),
): WeightChartPoint[] {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - (dayCount - 1));

  const startKey = toKey(start);
  const endKey = toKey(end);

  return entries
    .filter((e) => e.date >= startKey && e.date <= endKey)
    .map((e) => ({
      date: parseKey(e.date),
      kg: e.kg,
    }));
}

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
