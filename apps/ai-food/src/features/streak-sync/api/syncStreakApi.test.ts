import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_CALORIE_STREAK_PERSIST } from '@/entities/streak';

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { useAuthStore } from '@/features/auth';
import { syncStreakApi } from './syncStreakApi';

const streak = {
  currentLength: 3,
  freezeCount: 1,
  consumedFreezeDateKeys: [],
  grantedMilestones: [],
  lastCelebratedLocalDate: '',
  bestStreak: 3,
  calorieStreak: { ...EMPTY_CALORIE_STREAK_PERSIST },
};

describe('syncStreakApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test/');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs streak payload to /user/streak/sync', async () => {
    const body = {
      streak,
      clientUpdatedAt: '2026-08-22T08:00:00.000Z',
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await syncStreakApi(body);

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/user/streak/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': 'jwt-test',
      },
      body: JSON.stringify(body),
    });
    expect(result.streak.currentLength).toBe(3);
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(
      syncStreakApi({ streak, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(
      syncStreakApi({ streak, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Нужен вход/);
  });

  it('throws on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
    );
    await expect(
      syncStreakApi({ streak, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Unauthorized/);
  });

  it('throws on malformed response body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ streak: null }), { status: 200 }),
    );
    await expect(
      syncStreakApi({ streak, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Некорректный ответ/);
  });
});
