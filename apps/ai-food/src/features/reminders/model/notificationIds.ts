import type { MealSlotKind, ReminderKind } from './types';

/** Reserved id ranges for cancel-before-reschedule. */
export const REMINDER_ID_BASE = {
  breakfast: 10_000,
  lunch: 20_000,
  dinner: 30_000,
  streakRisk: 40_000,
  streakMilestone: 50_000,
  weightWeekly: 60_000,
  analyzeError: 70_000,
} as const;

export const REMINDER_CANCEL_ID_MIN = 10_000;
export const REMINDER_CANCEL_ID_MAX = 79_999;

export function allManagedNotificationIds(): { id: number }[] {
  const ids: { id: number }[] = [];
  for (let id = REMINDER_CANCEL_ID_MIN; id <= REMINDER_CANCEL_ID_MAX; id += 1) {
    ids.push({ id });
  }
  return ids;
}

export function mealSlotNotificationId(
  slot: MealSlotKind,
  dayIndex: number,
): number {
  const base = REMINDER_ID_BASE[slot];
  return base + dayIndex;
}

export function streakRiskNotificationId(dayIndex: number): number {
  return REMINDER_ID_BASE.streakRisk + dayIndex;
}

export function streakMilestoneNotificationId(dayIndex: number): number {
  return REMINDER_ID_BASE.streakMilestone + dayIndex;
}

export function weightWeeklyNotificationId(dayIndex: number): number {
  return REMINDER_ID_BASE.weightWeekly + dayIndex;
}

export function analyzeErrorNotificationId(mealId: string): number {
  let hash = 0;
  for (let i = 0; i < mealId.length; i += 1) {
    hash = (hash * 31 + mealId.charCodeAt(i)) | 0;
  }
  return REMINDER_ID_BASE.analyzeError + (Math.abs(hash) % 10_000);
}

export function milestoneNotifyKey(dateKey: string, milestone: number): string {
  return `${dateKey}:${milestone}`;
}

export function kindFromNotificationId(id: number): ReminderKind | null {
  if (id >= REMINDER_ID_BASE.breakfast && id < REMINDER_ID_BASE.lunch) {
    return 'meal-breakfast';
  }
  if (id >= REMINDER_ID_BASE.lunch && id < REMINDER_ID_BASE.dinner) {
    return 'meal-lunch';
  }
  if (id >= REMINDER_ID_BASE.dinner && id < REMINDER_ID_BASE.streakRisk) {
    return 'meal-dinner';
  }
  if (id >= REMINDER_ID_BASE.streakRisk && id < REMINDER_ID_BASE.streakMilestone) {
    return 'streak-risk';
  }
  if (id >= REMINDER_ID_BASE.streakMilestone && id < REMINDER_ID_BASE.weightWeekly) {
    return 'streak-milestone';
  }
  if (id >= REMINDER_ID_BASE.weightWeekly && id < REMINDER_ID_BASE.analyzeError) {
    return 'weight-weekly';
  }
  if (id >= REMINDER_ID_BASE.analyzeError && id <= REMINDER_CANCEL_ID_MAX) {
    return 'analyze-error';
  }
  return null;
}
