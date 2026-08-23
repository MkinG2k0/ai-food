import type { Meal } from '@ai-food/shared-types';
import { localDateKey, STREAK_MILESTONES } from '@/entities/streak';
import {
  analyzeErrorNotificationId,
  mealSlotNotificationId,
  milestoneNotifyKey,
  streakMilestoneNotificationId,
  streakRiskNotificationId,
  weightWeeklyNotificationId,
} from './notificationIds';
import {
  DEFAULT_REMINDER_SETTINGS,
  type MealSlotKind,
  type ReminderScheduleInput,
  type ReminderSettings,
  type ReminderTime,
  type ScheduledReminder,
} from './types';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const EVENING_HOUR = 18;
const STREAK_RISK_HOUR = 20;
const STREAK_RISK_MINUTE = 30;
const MILESTONE_MORNING_HOUR = 8;
const MILESTONE_MORNING_MINUTE = 0;
const WEIGHT_SUNDAY_HOUR = 10;
const WEIGHT_SUNDAY_MINUTE = 0;
const DEFAULT_WINDOW_DAYS = 7;

const MEAL_SLOT_LABELS: Record<MealSlotKind, string> = {
  breakfast: 'завтрак',
  lunch: 'обед',
  dinner: 'ужин',
};

const MEAL_SLOT_SETTINGS: Record<
  MealSlotKind,
  keyof Pick<ReminderSettings, 'breakfast' | 'lunch' | 'dinner'>
> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

function dateFromLocalKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function atLocalTime(dateKey: string, time: ReminderTime): Date {
  const base = dateFromLocalKey(dateKey);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    time.hour,
    time.minute,
    0,
    0,
  );
}

function isReadyMeal(meal: Meal): boolean {
  return (meal.status ?? 'ready') === 'ready';
}

export function hasReadyMealNearSlot(
  meals: Meal[],
  dateKey: string,
  slotTime: ReminderTime,
): boolean {
  const slotAt = atLocalTime(dateKey, slotTime).getTime();
  for (const meal of meals) {
    if (!isReadyMeal(meal)) continue;
    if (localDateKey(new Date(meal.timestamp)) !== dateKey) continue;
    const mealAt = new Date(meal.timestamp).getTime();
    if (Math.abs(mealAt - slotAt) <= TWO_HOURS_MS) return true;
  }
  return false;
}

export function readyMealCountOnDate(meals: Meal[], dateKey: string): number {
  let count = 0;
  for (const meal of meals) {
    if (!isReadyMeal(meal)) continue;
    if (localDateKey(new Date(meal.timestamp)) === dateKey) count += 1;
  }
  return count;
}

function getCountedDateKeys(meals: Meal[]): Set<string> {
  const keys = new Set<string>();
  for (const meal of meals) {
    if (isReadyMeal(meal)) {
      keys.add(localDateKey(new Date(meal.timestamp)));
    }
  }
  return keys;
}

function prevLocalKey(key: string): string {
  const date = dateFromLocalKey(key);
  return localDateKey(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
  );
}

/** Logging streak length as of end of `asOfKey` (inclusive). */
export function streakLengthOnDate(meals: Meal[], asOfKey: string): number {
  const counted = getCountedDateKeys(meals);
  let length = 0;
  let cursor = asOfKey;
  while (counted.has(cursor)) {
    length += 1;
    cursor = prevLocalKey(cursor);
  }
  return length;
}

function wasAppOpenedYesterdayEvening(
  lastForegroundAt: string | null,
  yesterdayKey: string,
): boolean {
  if (!lastForegroundAt) return false;
  const at = new Date(lastForegroundAt);
  if (Number.isNaN(at.getTime())) return false;
  if (localDateKey(at) !== yesterdayKey) {
    return localDateKey(at) > yesterdayKey;
  }
  return at.getHours() >= EVENING_HOUR;
}

function isStreakMilestone(length: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(length);
}

function daysSinceLastWeightEntry(
  weightEntryDates: string[],
  now: Date,
): number | null {
  if (weightEntryDates.length === 0) return null;
  const sorted = [...weightEntryDates].sort();
  const lastKey = sorted[sorted.length - 1]!;
  const lastDate = dateFromLocalKey(lastKey);
  const today = dateFromLocalKey(localDateKey(now));
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function scheduleMealSlots(
  input: ReminderScheduleInput,
  windowStartKey: string,
  windowDays: number,
  out: ScheduledReminder[],
): void {
  if (!input.settings.enabled) return;

  for (let dayIndex = 0; dayIndex < windowDays; dayIndex += 1) {
    const dateKey = localDateKey(addDays(dateFromLocalKey(windowStartKey), dayIndex));
    for (const slot of ['breakfast', 'lunch', 'dinner'] as MealSlotKind[]) {
      const slotSettings = input.settings[MEAL_SLOT_SETTINGS[slot]];
      if (!slotSettings.enabled) continue;
      if (hasReadyMealNearSlot(input.meals, dateKey, slotSettings.time)) continue;

      const at = atLocalTime(dateKey, slotSettings.time);
      if (at.getTime() <= input.now.getTime()) continue;

      out.push({
        id: mealSlotNotificationId(slot, dayIndex),
        kind: `meal-${slot}`,
        at,
        title: 'AI Food',
        body: `Запиши ${MEAL_SLOT_LABELS[slot]}`,
        route: '/',
      });
    }
  }
}

function scheduleStreakAtRisk(
  input: ReminderScheduleInput,
  todayKey: string,
  out: ScheduledReminder[],
): void {
  if (!input.settings.enabled || !input.settings.streakAtRisk) return;
  if (input.streakLength < 1) return;
  if (readyMealCountOnDate(input.meals, todayKey) > 0) return;

  const at = atLocalTime(todayKey, {
    hour: STREAK_RISK_HOUR,
    minute: STREAK_RISK_MINUTE,
  });
  if (at.getTime() <= input.now.getTime()) return;

  out.push({
    id: streakRiskNotificationId(0),
    kind: 'streak-risk',
    at,
    title: 'AI Food',
    body: `Запиши хотя бы один приём — серия ${input.streakLength} дней`,
    route: '/',
  });
}

function scheduleStreakMilestones(
  input: ReminderScheduleInput,
  windowStartKey: string,
  windowDays: number,
  out: ScheduledReminder[],
): void {
  if (!input.settings.enabled) return;

  const notified = new Set(input.notifiedMilestoneKeys);

  for (let dayIndex = 0; dayIndex < windowDays; dayIndex += 1) {
    const morningKey = localDateKey(
      addDays(dateFromLocalKey(windowStartKey), dayIndex),
    );
    const yesterdayKey = prevLocalKey(morningKey);
    const yesterdayLength = streakLengthOnDate(input.meals, yesterdayKey);
    if (!isStreakMilestone(yesterdayLength)) continue;

    const notifyKey = milestoneNotifyKey(morningKey, yesterdayLength);
    if (notified.has(notifyKey)) continue;
    if (wasAppOpenedYesterdayEvening(input.lastForegroundAt, yesterdayKey)) {
      continue;
    }

    const at = atLocalTime(morningKey, {
      hour: MILESTONE_MORNING_HOUR,
      minute: MILESTONE_MORNING_MINUTE,
    });
    if (at.getTime() <= input.now.getTime()) continue;

    out.push({
      id: streakMilestoneNotificationId(dayIndex),
      kind: 'streak-milestone',
      at,
      title: 'AI Food',
      body: `Вчера серия выросла до ${yesterdayLength} 🔥`,
      route: '/',
    });
  }
}

function scheduleWeightWeekly(
  input: ReminderScheduleInput,
  windowStartKey: string,
  windowDays: number,
  out: ScheduledReminder[],
): void {
  if (!input.settings.enabled || !input.settings.weightWeekly) return;
  if (input.profileTargetWeight == null) return;

  const daysSince = daysSinceLastWeightEntry(input.weightEntryDates, input.now);
  if (daysSince != null && daysSince <= 7) return;

  for (let dayIndex = 0; dayIndex < windowDays; dayIndex += 1) {
    const date = addDays(dateFromLocalKey(windowStartKey), dayIndex);
    if (date.getDay() !== 0) continue;

    const dateKey = localDateKey(date);
    const at = atLocalTime(dateKey, {
      hour: WEIGHT_SUNDAY_HOUR,
      minute: WEIGHT_SUNDAY_MINUTE,
    });
    if (at.getTime() <= input.now.getTime()) continue;

    out.push({
      id: weightWeeklyNotificationId(dayIndex),
      kind: 'weight-weekly',
      at,
      title: 'AI Food',
      body: 'Запиши вес — отслеживай прогресс',
      route: '/',
    });
    break;
  }
}

function scheduleAnalyzeErrors(
  input: ReminderScheduleInput,
  out: ScheduledReminder[],
): void {
  if (!input.settings.enabled) return;

  for (const meal of input.analyzeErrorMeals) {
    const at = new Date(input.now.getTime() + 1_000);
    out.push({
      id: analyzeErrorNotificationId(meal.id),
      kind: 'analyze-error',
      at,
      title: 'AI Food',
      body: 'Не удалось разобрать приём — нажми, чтобы повторить',
      route: `/meal/${meal.id}`,
    });
  }
}

/** Pure 7-day rolling schedule; filter past `at` before native schedule. */
export function computeReminderSchedule(
  input: ReminderScheduleInput,
): ScheduledReminder[] {
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
  const todayKey = localDateKey(input.now);
  const out: ScheduledReminder[] = [];

  scheduleMealSlots(input, todayKey, windowDays, out);
  scheduleStreakAtRisk(input, todayKey, out);
  scheduleStreakMilestones(input, todayKey, windowDays, out);
  scheduleWeightWeekly(input, todayKey, windowDays, out);
  scheduleAnalyzeErrors(input, out);

  return out;
}

export function normalizeReminderSettings(value: unknown): ReminderSettings {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
  const v = value as Record<string, unknown>;

  function slot(key: 'breakfast' | 'lunch' | 'dinner') {
    const defaults = DEFAULT_REMINDER_SETTINGS[key];
    const raw = v[key];
    if (typeof raw !== 'object' || raw === null) return { ...defaults };
    const s = raw as Record<string, unknown>;
    const timeRaw = s.time;
    let time = { ...defaults.time };
    if (typeof timeRaw === 'object' && timeRaw !== null) {
      const t = timeRaw as Record<string, unknown>;
      const hour = typeof t.hour === 'number' ? t.hour : defaults.time.hour;
      const minute = typeof t.minute === 'number' ? t.minute : defaults.time.minute;
      time = {
        hour: Math.min(23, Math.max(0, Math.floor(hour))),
        minute: Math.min(59, Math.max(0, Math.floor(minute))),
      };
    }
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : defaults.enabled,
      time,
    };
  }

  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_REMINDER_SETTINGS.enabled,
    breakfast: slot('breakfast'),
    lunch: slot('lunch'),
    dinner: slot('dinner'),
    streakAtRisk:
      typeof v.streakAtRisk === 'boolean'
        ? v.streakAtRisk
        : DEFAULT_REMINDER_SETTINGS.streakAtRisk,
    weightWeekly:
      typeof v.weightWeekly === 'boolean'
        ? v.weightWeekly
        : DEFAULT_REMINDER_SETTINGS.weightWeekly,
  };
}
