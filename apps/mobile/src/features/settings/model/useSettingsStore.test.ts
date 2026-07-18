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
  aiModelLabel,
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

  it('defaults aiModel to google/gemini-2.5-flash-lite', () => {
    expect(useSettingsStore.getState().aiModel).toBe(
      'google/gemini-2.5-flash-lite',
    );
    expect(DEFAULT_AI_MODEL).toBe('google/gemini-2.5-flash-lite');
  });

  it('exposes curated AI_MODEL_OPTIONS with known OpenRouter slugs', () => {
    const values = AI_MODEL_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'google/gemini-2.5-flash-lite',
      'qwen/qwen-vl-max',
      'openai/gpt-5-mini',
      'google/gemini-3-flash-preview',
      'openai/gpt-5.4',
      'anthropic/claude-sonnet-4.6',
    ]);
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

  it('aiModelLabel returns curated labels and falls back for unknown ids', () => {
    expect(aiModelLabel(undefined)).toBeUndefined();
    expect(aiModelLabel('google/gemini-2.5-flash-lite')).toBe(
      'Gemini 2.5 Flash-Lite',
    );
    expect(aiModelLabel('custom/unknown-model')).toBe('custom/unknown-model');
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
