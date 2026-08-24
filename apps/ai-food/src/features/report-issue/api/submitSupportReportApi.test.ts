import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDeviceId = vi.fn(async () => 'device-1');
const getState = vi.fn(() => ({ userToken: 'jwt-token' as string | null }));

vi.mock('@/shared/lib', () => ({
  getDeviceId: () => getDeviceId(),
}));

vi.mock('@/shared/lib/appVersion', () => ({
  getAppVersion: () => '1.0.0-test',
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getState(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
  },
  registerPlugin: vi.fn(() => ({})),
}));

import { submitSupportReportApi } from './submitSupportReportApi';

describe('submitSupportReportApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gateway.test');
    getState.mockReturnValue({ userToken: 'jwt-token' });
  });

  it('posts support report with user token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'report-1',
          type: 'bug',
          message: 'test',
          createdAt: '2026-08-25T10:00:00.000Z',
        }),
        { status: 201 },
      ),
    );

    const result = await submitSupportReportApi({
      type: 'bug',
      message: 'test',
      images: ['data:image/jpeg;base64,abc'],
    });

    expect(result.id).toBe('report-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.test/user/support-reports',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-User-Token': 'jwt-token',
        }),
      }),
    );
  });

  it('uses device id for guest', async () => {
    getState.mockReturnValue({ userToken: null });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'report-2',
          type: 'other',
          message: 'guest',
          createdAt: '2026-08-25T10:00:00.000Z',
        }),
        { status: 201 },
      ),
    );

    await submitSupportReportApi({
      type: 'other',
      message: 'guest',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.test/user/support-reports',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Device-Id': 'device-1',
        }),
      }),
    );
  });
});
