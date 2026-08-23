import { KbjuWidget } from '@/features/kbju-widget/api/kbjuWidgetPlugin';
import { Capacitor } from '@capacitor/core';

import type { NotificationPermissionState } from './localNotificationsNative';

export interface PostNotificationPermissionResult {
  granted: boolean;
  runtime?: string;
}

const PLUGIN_TIMEOUT_MS = 4_000;

export function withPluginTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms = PLUGIN_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${label}: нет ответа от Android (${ms}ms)`)),
        ms,
      );
    }),
  ]);
}

function mapRuntime(runtime: string | undefined): NotificationPermissionState {
  if (runtime === 'granted') return 'granted';
  if (runtime === 'denied') return 'denied';
  return 'prompt';
}

async function callKbju<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('not-android');
  }
  if (!Capacitor.isPluginAvailable('KbjuWidget')) {
    throw new Error('KbjuWidget недоступен — пересоберите APK в Android Studio');
  }
  return withPluginTimeout(fn(), label);
}

export async function checkAppNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.getPlatform() !== 'android') return 'granted';
  const result = await callKbju('checkPostNotifications', () =>
    KbjuWidget.checkPostNotifications(),
  );
  if (result.granted) return 'granted';
  return mapRuntime(result.runtime);
}

export async function requestAppNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.getPlatform() !== 'android') return 'granted';
  const result = await callKbju('requestPostNotifications', () =>
    KbjuWidget.requestPostNotifications(),
  );
  if (result.granted) return 'granted';
  const after = await callKbju('checkPostNotifications', () =>
    KbjuWidget.checkPostNotifications(),
  );
  return mapRuntime(after.runtime);
}

export async function openAppNotificationSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await callKbju('openNotificationSettings', () =>
    KbjuWidget.openNotificationSettings(),
  );
}
