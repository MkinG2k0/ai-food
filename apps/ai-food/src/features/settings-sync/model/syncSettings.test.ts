import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

const syncSettingsApi = vi.fn();
const getAuthState = vi.fn();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

vi.mock('../api/syncSettingsApi', () => ({
  syncSettingsApi: (...args: unknown[]) => syncSettingsApi(...args),
}));

import {
  DEFAULT_AI_MODEL,
  useSettingsStore,
} from '@/features/settings';
import { syncSettings } from './syncSettings';

describe('syncSettings', () => {
  beforeEach(async () => {
    syncSettingsApi.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    await act(async () => {
      await useSettingsStore.persist.rehydrate();
    });
    useSettingsStore.setState({
      customInstructions: 'local',
      customInstructionsEnabled: true,
      aiModel: DEFAULT_AI_MODEL,
      featureVitamins: true,
      featureHealthiness: true,
      featureComposition: true,
      calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
      sharePhotosToFriends: true,
      clientUpdatedAt: '2026-08-22T08:00:00.000Z',
    });
  });

  it('no-ops without token', async () => {
    getAuthState.mockReturnValue({ userToken: null });
    await syncSettings();
    expect(syncSettingsApi).not.toHaveBeenCalled();
  });

  it('posts local settings and applies remote response', async () => {
    syncSettingsApi.mockResolvedValue({
      settings: {
        customInstructions: 'remote',
        customInstructionsEnabled: false,
        aiModel: DEFAULT_AI_MODEL,
        featureVitamins: false,
        featureHealthiness: true,
        featureComposition: true,
        calendarRings: { kcal: true, protein: false, fat: false, carbs: false },
        sharePhotosToFriends: false,
      },
      clientUpdatedAt: '2026-08-22T09:00:00.000Z',
    });

    await syncSettings();

    expect(syncSettingsApi).toHaveBeenCalledTimes(1);
    const sent = syncSettingsApi.mock.calls[0][0];
    expect(sent.settings.customInstructions).toBe('local');

    const state = useSettingsStore.getState();
    expect(state.customInstructions).toBe('remote');
    expect(state.customInstructionsEnabled).toBe(false);
    expect(state.featureVitamins).toBe(false);
    expect(state.sharePhotosToFriends).toBe(false);
    expect(state.clientUpdatedAt).toBe('2026-08-22T09:00:00.000Z');
  });
});
