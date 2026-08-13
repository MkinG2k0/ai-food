import { syncSettings } from './syncSettings';

const DEFAULT_DEBOUNCE_MS = 400;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function runSync(): void {
  void syncSettings().catch((err) => {
    console.warn('[settings-sync]', err);
  });
}

/** Fire-and-forget settings sync; optional debounce for typing. */
export function queueSettingsSync(options?: { debounceMs?: number }): void {
  const ms = options?.debounceMs;
  if (ms != null && ms > 0) {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runSync();
    }, ms);
    return;
  }

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  runSync();
}

/** Cancel pending debounce and sync immediately (e.g. page unmount). */
export function flushSettingsSync(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  runSync();
}

export const SETTINGS_SYNC_DEBOUNCE_MS = DEFAULT_DEBOUNCE_MS;
