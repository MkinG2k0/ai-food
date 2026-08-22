import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsSyncPayload } from '@/features/settings';

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test' })),
  },
}));

import { useAuthStore } from '@/features/auth';
import { syncSettingsApi } from './syncSettingsApi';

const settings: SettingsSyncPayload = {
  customInstructions: 'Без сахара',
  customInstructionsEnabled: true,
  aiModel: 'google/gemini-3-flash-preview',
  featureVitamins: true,
  featureHealthiness: true,
  featureComposition: true,
  calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
  sharePhotosToFriends: true,
};

describe('syncSettingsApi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test/');
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: 'jwt-test' } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs settings payload to /user/settings/sync', async () => {
    const body = {
      settings,
      clientUpdatedAt: '2026-08-22T08:00:00.000Z',
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await syncSettingsApi(body);

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/user/settings/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': 'jwt-test',
      },
      body: JSON.stringify(body),
    });
    expect(result.settings.customInstructions).toBe('Без сахара');
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(
      syncSettingsApi({ settings, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ userToken: null } as never);
    await expect(
      syncSettingsApi({ settings, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Нужен вход/);
  });

  it('throws on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Server error' }), { status: 500 }),
    );
    await expect(
      syncSettingsApi({ settings, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Server error/);
  });

  it('throws on malformed response body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ settings: null }), { status: 200 }),
    );
    await expect(
      syncSettingsApi({ settings, clientUpdatedAt: '2026-08-22T08:00:00.000Z' }),
    ).rejects.toThrow(/Некорректный ответ/);
  });
});
