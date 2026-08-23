import { Capacitor } from '@capacitor/core';

import type { ScheduledReminder } from './types';

import {
  checkAppNotificationPermission,
  openAppNotificationSettings,
  requestAppNotificationPermission,
  withPluginTimeout,
} from './appSettingsNative';
import {
  REMINDER_CANCEL_ID_MAX,
  REMINDER_CANCEL_ID_MIN,
} from './notificationIds';
import { toScheduleAtIso } from './notificationSchedule';

export const REMINDER_CHANNEL_ID = 'meal-reminders-v2';
const LEGACY_REMINDER_CHANNEL_ID = 'meal-reminders';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt';

let channelReady = false;

/**
 * Never return the Capacitor plugin proxy from an async function directly:
 * `await` treats it as a thenable and calls `.then()`, which throws
 * `LocalNotifications.then() is not implemented on android`.
 */
async function getLocalNotifications() {
  const mod = await import('@capacitor/local-notifications');
  return { LocalNotifications: mod.LocalNotifications };
}

export function isNativeRemindersSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensureReminderChannel(): Promise<void> {
  if (!isNativeRemindersSupported() || channelReady) return;
  const { LocalNotifications } = await getLocalNotifications();
  await LocalNotifications.deleteChannel({ id: LEGACY_REMINDER_CHANNEL_ID });
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Напоминания о питании',
    description: 'Напоминания записать приём пищи, серию и вес',
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  channelReady = true;
}

export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeRemindersSupported()) return 'granted';
  if (Capacitor.getPlatform() === 'android') {
    try {
      return await checkAppNotificationPermission();
    } catch {
      // Fall back to LocalNotifications below.
    }
  }
  const { LocalNotifications } = await getLocalNotifications();
  const result = await withPluginTimeout(
    LocalNotifications.checkPermissions(),
    'LocalNotifications.checkPermissions',
  );
  if (result.display === 'granted') return 'granted';
  if (result.display === 'denied') return 'denied';
  return 'prompt';
}

/** Opens Android app notification settings (POST_NOTIFICATIONS toggle). */
export async function openNotificationSettings(): Promise<void> {
  return openAppNotificationSettings();
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeRemindersSupported()) return 'granted';
  if (Capacitor.getPlatform() === 'android') {
    try {
      return await requestAppNotificationPermission();
    } catch {
      // Fall back to LocalNotifications below.
    }
  }
  const { LocalNotifications } = await getLocalNotifications();
  const result = await withPluginTimeout(
    LocalNotifications.requestPermissions(),
    'LocalNotifications.requestPermissions',
  );
  if (result.display === 'granted') return 'granted';
  if (result.display === 'denied') return 'denied';
  return 'prompt';
}

/** Opens Android «Alarms & reminders» settings for exact meal times. */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNativeRemindersSupported()) return;
  const { LocalNotifications } = await getLocalNotifications();
  await LocalNotifications.changeExactNotificationSetting();
}

async function areNotificationsEnabled(): Promise<boolean> {
  if (!isNativeRemindersSupported()) return true;
  const { LocalNotifications } = await getLocalNotifications();
  const { value } = await LocalNotifications.areEnabled();
  return value;
}

export async function cancelManagedReminders(): Promise<void> {
  if (!isNativeRemindersSupported()) return;
  const { LocalNotifications } = await getLocalNotifications();
  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications
    .filter(
      (n) => n.id >= REMINDER_CANCEL_ID_MIN && n.id <= REMINDER_CANCEL_ID_MAX,
    )
    .map((n) => ({ id: n.id }));
  if (toCancel.length === 0) return;
  await LocalNotifications.cancel({ notifications: toCancel });
}

function buildNotificationPayload(r: ScheduledReminder) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    schedule: {
      at: toScheduleAtIso(r.at) as unknown as Date,
      allowWhileIdle: true,
    },
    channelId: REMINDER_CHANNEL_ID,
    smallIcon: 'ic_stat_notification',
    autoCancel: true,
    isExactNotification: true,
    extra: { route: r.route },
  };
}

export async function applyReminderSchedule(
  reminders: ScheduledReminder[],
): Promise<void> {
  if (!isNativeRemindersSupported()) return;

  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return;
  if (!(await areNotificationsEnabled())) return;

  try {
    await ensureReminderChannel();
    await cancelManagedReminders();

    const future = reminders.filter((r) => r.at.getTime() > Date.now());
    if (future.length === 0) return;

    const { LocalNotifications } = await getLocalNotifications();
    await withPluginTimeout(
      LocalNotifications.schedule({
        notifications: future.map(buildNotificationPayload),
      }),
      'LocalNotifications.schedule',
      10_000,
    );
  } catch (error) {
    channelReady = false;
    console.warn('[reminders] schedule failed:', error);
    throw error;
  }
}

export async function cancelAnalyzeErrorReminder(mealId: string): Promise<void> {
  if (!isNativeRemindersSupported()) return;
  const { analyzeErrorNotificationId } = await import('./notificationIds');
  const { LocalNotifications } = await getLocalNotifications();
  await LocalNotifications.cancel({
    notifications: [{ id: analyzeErrorNotificationId(mealId) }],
  });
}
