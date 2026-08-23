import { registerPlugin } from '@capacitor/core';

export interface KbjuWidgetPlugin {
  refresh(): Promise<void>;
  checkPostNotifications(): Promise<{ granted: boolean; runtime?: string }>;
  requestPostNotifications(): Promise<{ granted: boolean }>;
  openNotificationSettings(): Promise<void>;
}

/** Native plugin: refreshes KBJU rings AppWidget. Web stub is a no-op. */
export const KbjuWidget = registerPlugin<KbjuWidgetPlugin>('KbjuWidget', {
  web: {
    async refresh() {
      /* no-op on web */
    },
    async checkPostNotifications() {
      return { granted: false, runtime: 'denied' };
    },
    async requestPostNotifications() {
      return { granted: false };
    },
    async openNotificationSettings() {
      /* no-op on web */
    },
  },
});
