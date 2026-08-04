import { describe, it, expect, vi, beforeEach } from 'vitest';

const getId = vi.fn();

vi.mock('@capacitor/device', () => ({
  Device: {
    getId: (...args: unknown[]) => getId(...args),
  },
}));

import { getDeviceId } from './deviceId';

describe('getDeviceId', () => {
  beforeEach(() => {
    getId.mockReset();
  });

  it('returns Capacitor Device.getId identifier', async () => {
    getId.mockResolvedValue({ identifier: 'native-stable-id' });
    await expect(getDeviceId()).resolves.toBe('native-stable-id');
    expect(getId).toHaveBeenCalledOnce();
  });

  it('trims whitespace from identifier', async () => {
    getId.mockResolvedValue({ identifier: '  padded-id  ' });
    await expect(getDeviceId()).resolves.toBe('padded-id');
  });

  it('throws when Device.getId returns empty identifier', async () => {
    getId.mockResolvedValue({ identifier: '   ' });
    await expect(getDeviceId()).rejects.toThrow(/device id/i);
  });
});
