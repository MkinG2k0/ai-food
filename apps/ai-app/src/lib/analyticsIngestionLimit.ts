import { ApiError } from '../../lib/errors.js';

const WINDOW_MS = 60_000;
const MAX_EVENTS_PER_WINDOW = 30;
const MAX_DEVICE_ID_LENGTH = 128;

/** Sliding-window counts keyed by device id (in-process). */
const hitsByDevice = new Map<string, number[]>();

export function resetAnalyticsIngestionLimitForTests(): void {
  hitsByDevice.clear();
}

export function assertAnalyticsIngestionAllowed(deviceId: string): void {
  if (!deviceId || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
  }

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const prev = hitsByDevice.get(deviceId) ?? [];
  const recent = prev.filter((ts) => ts > cutoff);
  if (recent.length >= MAX_EVENTS_PER_WINDOW) {
    hitsByDevice.set(deviceId, recent);
    throw new ApiError(
      429,
      'RATE_LIMITED',
      'Too many analytics events from this device.',
    );
  }
  recent.push(now);
  hitsByDevice.set(deviceId, recent);
}
