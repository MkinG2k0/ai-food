import { Preferences } from '@capacitor/preferences';

const DEVICE_ID_KEY = 'ai-food-device-id';

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stable device id via Capacitor Preferences (web + native).
 * Generated once and reused for guest quota.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await Preferences.get({ key: DEVICE_ID_KEY });
  if (existing.value && existing.value.trim()) {
    return existing.value.trim();
  }
  const id = createUuid();
  await Preferences.set({ key: DEVICE_ID_KEY, value: id });
  return id;
}
