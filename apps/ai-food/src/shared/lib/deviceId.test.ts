import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const set = vi.fn();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: (...args: unknown[]) => get(...args),
    set: (...args: unknown[]) => set(...args),
  },
}));

import { getDeviceId } from './deviceId';

describe('getDeviceId', () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
  });

  it('returns existing Preferences value', async () => {
    get.mockResolvedValue({ value: 'existing-id' });
    await expect(getDeviceId()).resolves.toBe('existing-id');
    expect(set).not.toHaveBeenCalled();
  });

  it('creates and stores a new id when missing', async () => {
    get.mockResolvedValue({ value: null });
    set.mockResolvedValue(undefined);
    const id = await getDeviceId();
    expect(id.length).toBeGreaterThan(8);
    expect(set).toHaveBeenCalledWith({ key: 'ai-food-device-id', value: id });
  });
});
