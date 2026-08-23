import { Capacitor } from '@capacitor/core';
import type { ScheduledReminder } from './types';
import {
  REMINDER_CANCEL_ID_MAX,
  REMINDER_CANCEL_ID_MIN,
} from './notificationIds';

export const REMINDER_CHANNEL_ID = 'meal-reminders';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt';

let channelReady = false;

async function getLocalNotifications() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

export function isNativeRemindersSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensureReminderChannel(): Promise<void> {
  if (!isNativeRemindersSupported() || channelReady) return;
  const LocalNotifications = await getLocalNotifications();
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Напоминания о питании',
    description: 'Напоминания записать приём пищи, серию и вес',
    importance: 4,
    visibility: 1,
  });
  channelReady = true;
}

export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeRemindersSupported()) return 'granted';
  const LocalNotifications = await getLocalNotifications();
  const result = await LocalNotifications.checkPermissions();
  if (result.display === 'granted') return 'granted';
  if (result.display === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeRemindersSupported()) return 'granted';
  const LocalNotifications = await getLocalNotifications();
  const result = await LocalNotifications.requestPermissions();
  if (result.display === 'granted') return 'granted';
  if (result.display === 'denied') return 'denied';
  return 'prompt';
}

export async function cancelManagedReminders(): Promise<void> {
  if (!isNativeRemindersSupported()) return;
  const LocalNotifications = await getLocalNotifications();
  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications
    .filter(
      (n) =>
        n.id >= REMINDER_CANCEL_ID_MIN && n.id <= REMINDER_CANCEL_ID_MAX,
    )
    .map((n) => ({ id: n.id }));
  if (toCancel.length === 0) return;
  await LocalNotifications.cancel({ notifications: toCancel });
}

export async function applyReminderSchedule(
  reminders: ScheduledReminder[],
): Promise<void> {
  if (!isNativeRemindersSupported()) return;

  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return;

  await ensureReminderChannel();
  await cancelManagedReminders();

  const future = reminders.filter((r) => r.at.getTime() > Date.now());
  if (future.length === 0) return;

  const LocalNotifications = await getLocalNotifications();
  await LocalNotifications.schedule({
    notifications: future.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
      channelId: REMINDER_CHANNEL_ID,
      extra: { route: r.route },
    })),
  });
}

export async function cancelAnalyzeErrorReminder(mealId: string): Promise<void> {
  if (!isNativeRemindersSupported()) return;
  const { analyzeErrorNotificationId } = await import('./notificationIds');
  const LocalNotifications = await getLocalNotifications();
  await LocalNotifications.cancel({
    notifications: [{ id: analyzeErrorNotificationId(mealId) }],
  });
}
