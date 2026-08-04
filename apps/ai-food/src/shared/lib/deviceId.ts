import { Device } from '@capacitor/device';

/**
 * Stable device id via Capacitor Device.getId.
 * Native: ANDROID_ID / identifierForVendor (survives Preferences clear).
 * Web: Capacitor stores it in localStorage.
 */
export async function getDeviceId(): Promise<string> {
  const { identifier } = await Device.getId();
  const id = identifier?.trim() ?? '';
  if (!id) {
    throw new Error('Device id is empty');
  }
  return id;
}
