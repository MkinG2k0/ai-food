import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import {
  checkNotificationPermission,
  isNativeRemindersSupported,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './localNotificationsNative';
import { queueRescheduleReminders } from './rescheduleReminders';

let sessionAutoPermissionAttempted = false;

export function areReminderStoresHydrated(): boolean {
  return (
    useDiaryStore.persist.hasHydrated() &&
    useProfileStore.persist.hasHydrated() &&
    useSettingsStore.persist.hasHydrated()
  );
}

export function canAutoRequestReminderPermission(): boolean {
  if (!isNativeRemindersSupported()) return false;
  if (!areReminderStoresHydrated()) return false;
  if (!useSettingsStore.getState().reminders.enabled) return false;
  return true;
}

export async function requestReminderPermissionWithReschedule(): Promise<NotificationPermissionState> {
  const state = await requestNotificationPermission();
  queueRescheduleReminders();
  return state;
}

/** Best-effort on launch; Android may ignore without a user gesture. */
export async function maybeAutoRequestReminderPermission(): Promise<void> {
  if (!canAutoRequestReminderPermission()) return;
  if (sessionAutoPermissionAttempted) return;

  const current = await checkNotificationPermission();
  if (current === 'granted') {
    queueRescheduleReminders();
    return;
  }
  if (current === 'denied') return;

  sessionAutoPermissionAttempted = true;
  await requestReminderPermissionWithReschedule();
}

/** Call from settings taps — reliable on Android 13+. */
export async function requestReminderPermissionFromUserGesture(): Promise<NotificationPermissionState> {
  sessionAutoPermissionAttempted = true;
  return requestReminderPermissionWithReschedule();
}

export function tryAutoRequestReminderPermission(): void {
  void maybeAutoRequestReminderPermission();
}

/** @deprecated use maybeAutoRequestReminderPermission */
export const maybeRequestReminderPermissionAfterOnboarding =
  maybeAutoRequestReminderPermission;
