import { beforeEach, describe, expect, it, vi } from 'vitest';

const validNutritionProfile = {
  profile: {
    gender: 'male' as const,
    age: 25,
    height: 170,
    weight: 70,
    targetWeight: 70,
    targetWeightDate: '2026-08-01',
    activity: 'medium' as const,
    goal: 'maintain' as const,
    dietType: 'none' as const,
  },
  targets: { kcal: 2200, protein: 120, fat: 70, carbs: 250, fiber: 30 },
};

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { fetchAuthMe } from './fetchAuthMe';
import { useAuthStore } from '../model/useAuthStore';

describe('fetchAuthMe', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test/');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('loads profile and parses nutritionProfile', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'user-1',
          nutritionProfile: validNutritionProfile,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await fetchAuthMe();

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/auth/me', {
      headers: { 'X-User-Token': 'jwt-test' },
    });
    expect(result.nutritionProfile).toEqual(validNutritionProfile);
    expect(result.id).toBe('user-1');
  });

  it('throws when VITE_AI_GATEWAY_URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(fetchAuthMe()).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(fetchAuthMe()).rejects.toThrow(/Нужен вход/);
  });

  it('throws gateway message on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(fetchAuthMe()).rejects.toThrow(/Unauthorized/);
  });

  it('falls back to status text when error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', { status: 503 }),
    );
    await expect(fetchAuthMe()).rejects.toThrow(/503/);
  });
});
