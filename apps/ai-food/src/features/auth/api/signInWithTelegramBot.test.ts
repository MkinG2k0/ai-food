import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signIn = vi.fn();

vi.mock('@/shared/lib', () => ({
  getDeviceId: vi.fn(async () => 'test-device'),
}));

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ signIn }),
  },
}));

describe('signInWithTelegramBot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gateway.example/');
    signIn.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('opens the bot link and stores the token after pending status', async () => {
    const nutritionProfile = {
      profile: {
        gender: 'female',
        age: 36,
        height: 165,
        weight: 60,
        targetWeight: 58,
        targetWeightDate: '2026-10-01',
        activity: 'medium',
        goal: 'lose',
        dietType: 'none',
      },
      targets: {
        kcal: 1800,
        protein: 100,
        fat: 60,
        carbs: 210,
        fiber: 25,
      },
    };
    const user = {
      id: 'user-1',
      telegramId: '42',
      username: 'ada',
      name: 'Ada Lovelace',
      photoUrl: 'https://example.com/ada.png',
      dataConsentAt: '2026-08-06T00:00:00.000Z',
      dataConsentVersion: '2026-08-06',
      nutritionProfile,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            challengeId: 'challenge-1',
            botDeepLink: 'https://t.me/example_bot?start=challenge-1',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'pending' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'ok', token: 'jwt-token', user }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const openLink = vi.fn();
    const { signInWithTelegramBot } = await import('./signInWithTelegramBot');

    const resultPromise = signInWithTelegramBot({ openLink });
    await vi.advanceTimersByTimeAsync(3_000);
    const result = await resultPromise;

    expect(openLink).toHaveBeenCalledWith(
      'https://t.me/example_bot?start=challenge-1',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://gateway.example/auth/telegram/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deviceId: 'test-device' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://gateway.example/auth/telegram/status?challengeId=challenge-1',
      { signal: undefined },
    );
    expect(signIn).toHaveBeenCalledWith(result.session, 'jwt-token', {
      dataConsentAt: '2026-08-06T00:00:00.000Z',
      dataConsentVersion: '2026-08-06',
    });
    expect(result).toMatchObject({
      session: {
        id: 'user-1',
        name: 'Ada Lovelace',
        username: 'ada',
        telegramId: 42,
      },
      nutritionProfile,
    });
  });
});
