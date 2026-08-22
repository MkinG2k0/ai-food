import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const syncSettings = vi.fn();

vi.mock('./syncSettings', () => ({
  syncSettings: (...args: unknown[]) => syncSettings(...args),
}));

import {
  flushSettingsSync,
  queueSettingsSync,
  SETTINGS_SYNC_DEBOUNCE_MS,
} from './queueSettingsSync';

describe('queueSettingsSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    syncSettings.mockReset();
    syncSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports default debounce constant', () => {
    expect(SETTINGS_SYNC_DEBOUNCE_MS).toBe(400);
  });

  it('runs sync immediately when debounce is not requested', async () => {
    queueSettingsSync();
    await Promise.resolve();
    expect(syncSettings).toHaveBeenCalledTimes(1);
  });

  it('debounces repeated calls', async () => {
    queueSettingsSync({ debounceMs: 300 });
    queueSettingsSync({ debounceMs: 300 });
    expect(syncSettings).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(syncSettings).toHaveBeenCalledTimes(1);
  });

  it('flushSettingsSync cancels debounce and syncs immediately', async () => {
    queueSettingsSync({ debounceMs: 500 });
    flushSettingsSync();
    await Promise.resolve();
    expect(syncSettings).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(syncSettings).toHaveBeenCalledTimes(1);
  });

  it('logs sync errors without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    syncSettings.mockRejectedValue(new Error('offline'));
    queueSettingsSync();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith('[settings-sync]', expect.any(Error));
    warn.mockRestore();
  });
});
