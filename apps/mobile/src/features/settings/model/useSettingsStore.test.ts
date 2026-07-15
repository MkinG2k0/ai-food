import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useSettingsStore } from './useSettingsStore';

beforeEach(async () => {
  await act(async () => {
    await useSettingsStore.persist.rehydrate();
  });
  useSettingsStore.setState({ customInstructions: '' });
});

describe('useSettingsStore', () => {
  it('defaults customInstructions to empty string', () => {
    expect(useSettingsStore.getState().customInstructions).toBe('');
  });

  it('persists under storage key ai-food-settings', () => {
    expect(useSettingsStore.persist.getOptions().name).toBe('ai-food-settings');
  });

  it('setCustomInstructions updates state', async () => {
    await act(async () => {
      useSettingsStore.getState().setCustomInstructions('Веган, граммы');
    });
    expect(useSettingsStore.getState().customInstructions).toBe('Веган, граммы');
  });

  it('truncates customInstructions longer than 2000 characters', async () => {
    const long = 'a'.repeat(2500);
    await act(async () => {
      useSettingsStore.getState().setCustomInstructions(long);
    });
    expect(useSettingsStore.getState().customInstructions).toHaveLength(2000);
    expect(useSettingsStore.getState().customInstructions).toBe('a'.repeat(2000));
  });
});
