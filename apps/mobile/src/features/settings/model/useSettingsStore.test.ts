import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
  useSettingsStore,
} from './useSettingsStore';

beforeEach(async () => {
  await act(async () => {
    await useSettingsStore.persist.rehydrate();
  });
  useSettingsStore.setState({
    customInstructions: '',
    aiModel: DEFAULT_AI_MODEL,
  });
});

describe('useSettingsStore', () => {
  it('defaults customInstructions to empty string', () => {
    expect(useSettingsStore.getState().customInstructions).toBe('');
  });

  it('defaults aiModel to openai/gpt-4.1-mini', () => {
    expect(useSettingsStore.getState().aiModel).toBe('openai/gpt-4.1-mini');
    expect(DEFAULT_AI_MODEL).toBe('openai/gpt-4.1-mini');
  });

  it('exposes curated AI_MODEL_OPTIONS with known OpenRouter slugs', () => {
    const values = AI_MODEL_OPTIONS.map((o) => o.value);
    expect(values).toEqual(
      expect.arrayContaining([
        'openai/gpt-4.1-mini',
        'openai/gpt-4.1',
        'openai/gpt-4o-mini',
        'anthropic/claude-sonnet-4.6',
      ]),
    );
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

  it('setAiModel updates to a curated slug', async () => {
    await act(async () => {
      useSettingsStore.getState().setAiModel('anthropic/claude-sonnet-4.6');
    });
    expect(useSettingsStore.getState().aiModel).toBe(
      'anthropic/claude-sonnet-4.6',
    );
  });

  it('setAiModel normalizes unknown values to default', async () => {
    await act(async () => {
      useSettingsStore.getState().setAiModel('not-a-real-model');
    });
    expect(useSettingsStore.getState().aiModel).toBe(DEFAULT_AI_MODEL);
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
