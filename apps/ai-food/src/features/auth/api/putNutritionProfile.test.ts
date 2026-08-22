import { beforeEach, describe, expect, it, vi } from 'vitest';

const payload = {
  profile: {
    gender: 'female' as const,
    age: 28,
    height: 165,
    weight: 62,
    targetWeight: 58,
    targetWeightDate: '2026-10-01',
    activity: 'low' as const,
    goal: 'lose' as const,
    dietType: 'none' as const,
  },
  targets: { kcal: 1800, protein: 110, fat: 60, carbs: 200, fiber: 25 },
};

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { putNutritionProfile } from './putNutritionProfile';
import { useAuthStore } from '../model/useAuthStore';

describe('putNutritionProfile', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('PUTs profile and returns parsed nutritionProfile', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ nutritionProfile: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await putNutritionProfile(payload);

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/auth/profile',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-Token': 'jwt-test',
        }),
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(payload);
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '  ');
    await expect(putNutritionProfile(payload)).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(putNutritionProfile(payload)).rejects.toThrow(/Нужен вход/);
  });

  it('throws when response is OK but profile is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ nutritionProfile: { targets: payload.targets } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(putNutritionProfile(payload)).rejects.toThrow(/Не удалось сохранить профиль/);
  });

  it('throws gateway message on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Validation failed' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(putNutritionProfile(payload)).rejects.toThrow(/Validation failed/);
  });
});
