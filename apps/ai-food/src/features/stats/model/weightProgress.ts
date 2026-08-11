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

export const WEIGHT_VIEW_DAYS = 30;

export function parseLocalYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function toLocalYmd(date: Date): string {
  return toKey(date);
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole calendar days from aYmd to bYmd (b − a). */
export function calendarDaysBetween(aYmd: string, bYmd: string): number {
  const a = parseLocalYmd(aYmd);
  const b = parseLocalYmd(bYmd);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

export const PACE_STATUS_EPS_KG = 0.5;

export type WeightPaceStatus = {
  kind: 'behind' | 'ahead';
  lagKg: number;
  label: string;
};

/** Compare current kg to ideal trajectory today; null if on track / N/A. */
export function evaluateWeightPaceStatus(input: {
  goal: Goal;
  currentKg: number;
  planStartDate?: string | null;
  planStartWeight?: number | null;
  targetWeightDate?: string | null;
  goalKg: number;
  todayYmd?: string;
  reached: boolean;
}): WeightPaceStatus | null {
  if (input.reached) return null;
  if (input.goal !== 'lose' && input.goal !== 'gain') return null;
  if (
    !input.planStartDate ||
    input.planStartWeight == null ||
    !input.targetWeightDate
  ) {
    return null;
  }
  const todayYmd = input.todayYmd ?? toLocalYmd(new Date());
  const idealKg = idealWeightAtDate({
    planStartDate: input.planStartDate,
    planStartWeight: input.planStartWeight,
    targetWeightDate: input.targetWeightDate,
    goalKg: input.goalKg,
    atYmd: todayYmd,
  });
  if (idealKg == null) return null;

  const signed =
    input.goal === 'gain'
      ? idealKg - input.currentKg
      : input.currentKg - idealKg;
  const abs = Math.round(Math.abs(signed) * 10) / 10;
  if (abs < PACE_STATUS_EPS_KG) return null;
  if (signed > 0) {
    return {
      kind: 'behind',
      lagKg: abs,
      label: `Отстаём на ${abs.toFixed(1)} кг`,
    };
  }
  return {
    kind: 'ahead',
    lagKg: abs,
    label: `Впереди плана на ${abs.toFixed(1)} кг`,
  };
}

export function idealWeightAtDate(input: {
  planStartDate: string;
  planStartWeight: number;
  targetWeightDate: string;
  goalKg: number;
  atYmd: string;
}): number | null {
  const t0 = parseLocalYmd(input.planStartDate);
  const t1 = parseLocalYmd(input.targetWeightDate);
  const at = parseLocalYmd(input.atYmd);
  if (!t0 || !t1 || !at) return null;

  const spanDays = Math.max(1, calendarDaysBetween(input.planStartDate, input.targetWeightDate));
  const elapsed = calendarDaysBetween(input.planStartDate, input.atYmd);
  const t = Math.min(1, Math.max(0, elapsed / spanDays));
  return (
    Math.round(
      (input.planStartWeight + (input.goalKg - input.planStartWeight) * t) * 10,
    ) / 10
  );
}

/** Clip ideal segment to [viewStartYmd, viewEndYmd] inclusive. */
export function getIdealSegmentInWindow(input: {
  planStartDate: string;
  planStartWeight: number;
  targetWeightDate: string;
  goalKg: number;
  viewStartYmd: string;
  viewEndYmd: string;
}): WeightChartPoint[] {
  const planStart = parseLocalYmd(input.planStartDate);
  const planEnd = parseLocalYmd(input.targetWeightDate);
  const viewStart = parseLocalYmd(input.viewStartYmd);
  const viewEnd = parseLocalYmd(input.viewEndYmd);
  if (!planStart || !planEnd || !viewStart || !viewEnd) return [];

  const clipStart =
    planStart.getTime() > viewStart.getTime() ? planStart : viewStart;
  const clipEnd = planEnd.getTime() < viewEnd.getTime() ? planEnd : viewEnd;
  if (clipStart.getTime() > clipEnd.getTime()) return [];

  const startYmd = toLocalYmd(clipStart);
  const endYmd = toLocalYmd(clipEnd);
  const startKg = idealWeightAtDate({ ...input, atYmd: startYmd });
  const endKg = idealWeightAtDate({ ...input, atYmd: endYmd });
  if (startKg == null || endKg == null) return [];

  if (startYmd === endYmd) {
    return [{ date: clipStart, kg: startKg }];
  }
  return [
    { date: clipStart, kg: startKg },
    { date: clipEnd, kg: endKg },
  ];
}

export function viewStartFromEnd(viewEndYmd: string): string {
  const end = parseLocalYmd(viewEndYmd);
  if (!end) return viewEndYmd;
  return toLocalYmd(addLocalDays(end, -(WEIGHT_VIEW_DAYS - 1)));
}

export function defaultViewEndYmd(
  rangeEndYmd: string,
  todayYmd: string = toLocalYmd(new Date()),
): string {
  return todayYmd <= rangeEndYmd ? todayYmd : rangeEndYmd;
}

export function clampViewEndYmd(
  viewEndYmd: string,
  rangeStartYmd: string,
  rangeEndYmd: string,
): string {
  const minEnd = toLocalYmd(
    addLocalDays(
      parseLocalYmd(rangeStartYmd) ?? new Date(),
      WEIGHT_VIEW_DAYS - 1,
    ),
  );
  // If range shorter than window, pin to rangeEnd
  const rangeLen = calendarDaysBetween(rangeStartYmd, rangeEndYmd);
  if (rangeLen < WEIGHT_VIEW_DAYS - 1) {
    return rangeEndYmd;
  }
  let end = viewEndYmd;
  if (end < minEnd) end = minEnd;
  if (end > rangeEndYmd) end = rangeEndYmd;
  if (end < rangeStartYmd) end = rangeStartYmd;
  return end;
}

export function computeWeightRange(input: {
  planStartDate?: string;
  targetWeightDate?: string;
  entryDates: string[];
  todayYmd?: string;
}): { startYmd: string; endYmd: string } {
  const today = input.todayYmd ?? toLocalYmd(new Date());
  const candidates = [
    today,
    ...input.entryDates,
    ...(input.planStartDate ? [input.planStartDate] : []),
    ...(input.targetWeightDate ? [input.targetWeightDate] : []),
  ].filter((d) => parseLocalYmd(d));

  if (candidates.length === 0) {
    return { startYmd: today, endYmd: today };
  }
  candidates.sort();
  return {
    startYmd: candidates[0],
    endYmd: candidates[candidates.length - 1],
  };
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
