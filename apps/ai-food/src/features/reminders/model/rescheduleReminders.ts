import { useDiaryStore } from '@/entities/meal';
import { applyStreakState, EMPTY_STREAK_PERSIST, localDateKey } from '@/entities/streak';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { useWeightStore } from '@/features/stats';
import { useStreakStore } from '@/features/streak';
import { computeReminderSchedule, streakLengthOnDate } from './computeReminderSchedule';
import {
  applyReminderSchedule,
  cancelManagedReminders,
  checkNotificationPermission,
} from './localNotificationsNative';
import { milestoneNotifyKey } from './notificationIds';
import { useRemindersRuntimeStore } from './useRemindersRuntimeStore';

let rescheduleLock: Promise<void> = Promise.resolve();

export function queueRescheduleReminders(): void {
  rescheduleLock = rescheduleLock
    .then(() => rescheduleReminders())
    .catch((error) => {
      console.warn('[reminders] reschedule failed:', error);
    });
}

export async function rescheduleReminders(): Promise<void> {
  const settings = useSettingsStore.getState().reminders;
  if (!settings.enabled) {
    await cancelManagedReminders();
    return;
  }

  const permission = await checkNotificationPermission();
  if (permission === 'denied') {
    await cancelManagedReminders();
    return;
  }
  if (permission !== 'granted') return;

  const now = new Date();
  const meals = useDiaryStore.getState().meals;
  const profile = useProfileStore.getState().profile;
  const weightEntries = useWeightStore.getState().entries;
  const streakPersist = {
    ...EMPTY_STREAK_PERSIST,
    currentLength: useStreakStore.getState().currentLength,
    freezeCount: useStreakStore.getState().freezeCount,
    consumedFreezeDateKeys: useStreakStore.getState().consumedFreezeDateKeys,
    grantedMilestones: useStreakStore.getState().grantedMilestones,
    lastCelebratedLocalDate: useStreakStore.getState().lastCelebratedLocalDate,
    bestStreak: useStreakStore.getState().bestStreak,
    calorieStreak: useStreakStore.getState().calorieStreak,
  };
  const { snapshot } = applyStreakState(meals, streakPersist, now);
  const runtime = useRemindersRuntimeStore.getState();

  const backgroundIds = new Set(runtime.backgroundAnalyzeMealIds);
  const analyzeErrorMeals = meals
    .filter((m) => m.status === 'error' && backgroundIds.has(m.id))
    .map((m) => ({ id: m.id }));

  const scheduled = computeReminderSchedule({
    now,
    settings,
    meals,
    streakLength: snapshot.currentLength,
    profileTargetWeight: profile?.targetWeight,
    weightEntryDates: weightEntries.map((e) => e.date),
    lastForegroundAt: runtime.lastForegroundAt,
    notifiedMilestoneKeys: runtime.notifiedMilestoneKeys,
    analyzeErrorMeals,
  });

  await applyReminderSchedule(scheduled);

  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
  const yesterdayLength = streakLengthOnDate(meals, yesterdayKey);
  const milestoneKey = milestoneNotifyKey(todayKey, yesterdayLength);
  if (
    scheduled.some((s) => s.kind === 'streak-milestone') &&
    !runtime.notifiedMilestoneKeys.includes(milestoneKey)
  ) {
    runtime.markMilestoneNotified(milestoneKey);
  }
}
