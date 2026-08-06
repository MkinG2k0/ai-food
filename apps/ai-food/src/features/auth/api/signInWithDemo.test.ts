import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    getDeviceId: vi.fn().mockResolvedValue('device-demo'),
  };
});

import { getDeviceId } from '@/shared/lib';
import { useAuthStore } from '../model/useAuthStore';
import { signInWithDemo } from './signInWithDemo';

describe('signInWithDemo', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      userToken: null,
      dataConsentAt: null,
      dataConsentVersion: null,
    });
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.restoreAllMocks();
    vi.mocked(getDeviceId).mockResolvedValue('device-demo');
    vi.spyOn(globalThis, 'fetch');
  });

  it('signs in with token and session from gateway', async () => {
    const nutritionProfile = {
      profile: {
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        targetWeight: 75,
        targetWeightDate: '2026-12-01',
        activity: 'high',
        goal: 'lose',
        dietType: 'none',
      },
      targets: {
        kcal: 2200,
        protein: 140,
        fat: 70,
        carbs: 250,
        fiber: 30,
      },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'jwt-demo',
          user: {
            id: 'user-demo',
            telegramId: '100000001',
            username: 'demo_user',
            firstName: 'Демо',
            lastName: 'пользователь',
            photoUrl: null,
            dataConsentAt: '2026-08-06T00:00:00.000Z',
            dataConsentVersion: '2026-08-06',
            nutritionProfile,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    let result;
    await act(async () => {
      result = await signInWithDemo();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/auth/demo/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-demo' }),
      }),
    );
    expect(result).toMatchObject({
      session: {
        id: 'user-demo',
        username: 'demo_user',
        telegramId: 100000001,
      },
      nutritionProfile,
    });
    expect(useAuthStore.getState().userToken).toBe('jwt-demo');
    expect(useAuthStore.getState().dataConsentAt).toBe(
      '2026-08-06T00:00:00.000Z',
    );
    expect(useAuthStore.getState().dataConsentVersion).toBe('2026-08-06');
    expect(useAuthStore.getState().session?.name).toContain('Демо');
  });

  it('throws when VITE_AI_GATEWAY_URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(signInWithDemo()).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws with gateway message on non-OK', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Demo login is disabled' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(signInWithDemo()).rejects.toThrow(/Demo login is disabled/);
  });
});
