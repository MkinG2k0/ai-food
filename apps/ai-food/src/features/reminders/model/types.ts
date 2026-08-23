export type MealSlotKind = 'breakfast' | 'lunch' | 'dinner';

export type ReminderKind =
  | 'meal-breakfast'
  | 'meal-lunch'
  | 'meal-dinner'
  | 'streak-risk'
  | 'streak-milestone'
  | 'weight-weekly'
  | 'analyze-error';

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface MealSlotReminderSettings {
  enabled: boolean;
  time: ReminderTime;
}

export interface ReminderSettings {
  enabled: boolean;
  breakfast: MealSlotReminderSettings;
  lunch: MealSlotReminderSettings;
  dinner: MealSlotReminderSettings;
  streakAtRisk: boolean;
  weightWeekly: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  breakfast: { enabled: true, time: { hour: 8, minute: 30 } },
  lunch: { enabled: true, time: { hour: 13, minute: 0 } },
  dinner: { enabled: true, time: { hour: 19, minute: 30 } },
  streakAtRisk: true,
  weightWeekly: true,
};

export interface ScheduledReminder {
  id: number;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
  route: string;
}

export interface ReminderScheduleInput {
  now: Date;
  windowDays?: number;
  settings: ReminderSettings;
  meals: import('@ai-food/shared-types').Meal[];
  streakLength: number;
  profileTargetWeight: number | null | undefined;
  weightEntryDates: string[];
  lastForegroundAt: string | null;
  notifiedMilestoneKeys: string[];
  analyzeErrorMeals: { id: string }[];
}
