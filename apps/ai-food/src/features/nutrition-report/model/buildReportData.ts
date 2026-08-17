import type { DailyTargets, Meal, UserProfile } from '@ai-food/shared-types';
import type { WeightEntry } from '@/features/stats';
import { computeDayKbju } from '@/shared/lib/computeDayKbju';
import { formatDayLabel, isSameDay } from '@/shared/lib/dateUtils';
import {
  inclusiveDayCount,
  formatReportPeriodRange,
  type ReportPeriod,
} from './reportPeriods';

const FALLBACK_FIBER = 30;

export interface ReportMealEntry {
  time: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface ReportDayEntry {
  dayLabel: string;
  dateLabel: string;
  kcal: number;
  goalKcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  meals: ReportMealEntry[];
}

export interface ReportSummary {
  avgKcal: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  avgFiber: number;
  goalKcal: number;
  goalProtein: number;
  goalFat: number;
  goalCarbs: number;
  goalFiber: number;
  mealCount: number;
  dayCount: number;
}

export interface ReportWeightSnapshot {
  currentKg: number | null;
  goalKg: number | null;
  deltaToGoal: number | null;
  periodStartKg: number | null;
  periodEndKg: number | null;
}

export interface NutritionReportData {
  appName: string;
  periodLabel: string;
  periodRange: string;
  profile: UserProfile | null;
  targets: DailyTargets | null;
  summary: ReportSummary;
  days: ReportDayEntry[];
  weight: ReportWeightSnapshot;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mealFiber(meal: Meal): number {
  return meal.items.reduce((sum, item) => sum + (item.fiber ?? 0), 0);
}

function mealName(meal: Meal): string {
  if (meal.name?.trim()) return meal.name.trim();
  if (meal.items.length === 1) return meal.items[0]?.name ?? 'Приём пищи';
  return meal.items.map((i) => i.name).join(', ') || 'Приём пищи';
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isInPeriod(date: Date, start: Date, end: Date): boolean {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

function iterDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function latestWeightOnOrBefore(entries: WeightEntry[], date: Date): number | null {
  const key = toDateKey(date);
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let last: number | null = null;
  for (const entry of sorted) {
    if (entry.date <= key) last = entry.kg;
    else break;
  }
  return last;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildNutritionReportData(input: {
  period: ReportPeriod;
  meals: Meal[];
  profile: UserProfile | null;
  targets: DailyTargets | null;
  weightEntries: WeightEntry[];
  weightGoalKg: number | null;
  appName?: string;
}): NutritionReportData {
  const {
    period,
    meals,
    profile,
    targets,
    weightEntries,
    weightGoalKg,
    appName = 'AI Food',
  } = input;

  const readyMeals = meals.filter((m) => (m.status ?? 'ready') === 'ready');
  const dayCount = inclusiveDayCount(period.start, period.end);
  const goalFiber = targets?.fiber ?? FALLBACK_FIBER;

  const days: ReportDayEntry[] = iterDays(period.start, period.end).map((day) => {
    const kbju = computeDayKbju(readyMeals, targets, day);
    const dayMeals = readyMeals
      .filter((m) => isSameDay(new Date(m.timestamp), day))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    return {
      dayLabel: formatDayLabel(day),
      dateLabel: formatShortDate(day),
      kcal: Math.round(kbju.consumed.kcal),
      goalKcal: Math.round(kbju.goals.kcal),
      protein: Math.round(kbju.consumed.protein),
      fat: Math.round(kbju.consumed.fat),
      carbs: Math.round(kbju.consumed.carbs),
      fiber: Math.round(
        dayMeals.reduce((sum, m) => sum + mealFiber(m), 0),
      ),
      meals: dayMeals.map((meal) => ({
        time: formatMealTime(meal.timestamp),
        name: mealName(meal),
        kcal: Math.round(meal.totalCalories),
        protein: Math.round(
          meal.items.reduce((s, i) => s + i.protein, 0),
        ),
        fat: Math.round(meal.items.reduce((s, i) => s + i.fat, 0)),
        carbs: Math.round(meal.items.reduce((s, i) => s + i.carbs, 0)),
        fiber: Math.round(mealFiber(meal)),
      })),
    };
  });

  const totals = days.reduce(
    (acc, day) => ({
      kcal: acc.kcal + day.kcal,
      protein: acc.protein + day.protein,
      fat: acc.fat + day.fat,
      carbs: acc.carbs + day.carbs,
      fiber: acc.fiber + day.fiber,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  );

  const mealCount = readyMeals.filter((m) =>
    isInPeriod(new Date(m.timestamp), period.start, period.end),
  ).length;

  const currentKg =
    profile?.weight ??
    latestWeightOnOrBefore(weightEntries, period.end) ??
    null;
  const goalKg = weightGoalKg ?? profile?.targetWeight ?? null;
  const deltaToGoal =
    currentKg != null && goalKg != null
      ? Math.round((goalKg - currentKg) * 10) / 10
      : null;

  return {
    appName,
    periodLabel: period.label,
    periodRange: formatReportPeriodRange(period.start, period.end),
    profile,
    targets,
    summary: {
      avgKcal: Math.round(totals.kcal / dayCount),
      avgProtein: Math.round(totals.protein / dayCount),
      avgFat: Math.round(totals.fat / dayCount),
      avgCarbs: Math.round(totals.carbs / dayCount),
      avgFiber: Math.round(totals.fiber / dayCount),
      goalKcal: targets?.kcal ?? 2000,
      goalProtein: targets?.protein ?? 150,
      goalFat: targets?.fat ?? 70,
      goalCarbs: targets?.carbs ?? 250,
      goalFiber,
      mealCount,
      dayCount,
    },
    days,
    weight: {
      currentKg,
      goalKg,
      deltaToGoal,
      periodStartKg: latestWeightOnOrBefore(weightEntries, period.start),
      periodEndKg: latestWeightOnOrBefore(weightEntries, period.end),
    },
  };
}
