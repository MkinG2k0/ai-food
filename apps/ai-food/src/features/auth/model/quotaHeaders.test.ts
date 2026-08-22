import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDeviceId = vi.fn();
const getAuthState = vi.fn();

vi.mock('@/shared/lib', () => ({
  getDeviceId: (...args: unknown[]) => getDeviceId(...args),
}));

vi.mock('./useAuthStore', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

import { getQuotaHeaders } from './quotaHeaders';

describe('getQuotaHeaders', () => {
  beforeEach(() => {
    getDeviceId.mockReset();
    getAuthState.mockReset();
    getDeviceId.mockResolvedValue('device-abc');
    getAuthState.mockReturnValue({ userToken: null });
  });

  it('always sets X-Device-Id and X-Usage-Kind', async () => {
    await expect(getQuotaHeaders('analyze_text')).resolves.toEqual({
      'X-Device-Id': 'device-abc',
      'X-Usage-Kind': 'analyze_text',
    });
  });

  it('adds X-User-Token when authenticated', async () => {
    getAuthState.mockReturnValue({ userToken: 'user-jwt' });
    await expect(getQuotaHeaders('refine')).resolves.toEqual({
      'X-Device-Id': 'device-abc',
      'X-Usage-Kind': 'refine',
      'X-User-Token': 'user-jwt',
    });
  });

  it('passes through analyze_* and other kinds', async () => {
    for (const kind of [
      'analyze',
      'analyze_photo',
      'analyze_photo_text',
      'other',
    ] as const) {
      const headers = await getQuotaHeaders(kind);
      expect(headers['X-Usage-Kind']).toBe(kind);
    }
  });
});
