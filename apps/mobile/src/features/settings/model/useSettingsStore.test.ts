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
  AI_TEMPERATURE,
  aiModelLabel,
  getActiveCustomInstructions,
  isGeminiModel,
  temperatureForModel,
  useSettingsStore,
} from './useSettingsStore';

beforeEach(async () => {
  await act(async () => {
    await useSettingsStore.persist.rehydrate();
  });
  useSettingsStore.setState({
    customInstructions: '',
    customInstructionsEnabled: true,
    aiModel: DEFAULT_AI_MODEL,
    featureVitamins: true,
    featureHealthiness: true,
    featureComposition: true,
  });
});

describe('useSettingsStore', () => {
  it('defaults customInstructions to empty string', () => {
    expect(useSettingsStore.getState().customInstructions).toBe('');
  });

  it('defaults customInstructionsEnabled to true', () => {
    expect(useSettingsStore.getState().customInstructionsEnabled).toBe(true);
  });

  it('setCustomInstructionsEnabled toggles without clearing text', async () => {
    await act(async () => {
      useSettingsStore.getState().setCustomInstructions('дай рецепт');
      useSettingsStore.getState().setCustomInstructionsEnabled(false);
    });
    expect(useSettingsStore.getState().customInstructionsEnabled).toBe(false);
    expect(useSettingsStore.getState().customInstructions).toBe('дай рецепт');
    await act(async () => {
      useSettingsStore.getState().setCustomInstructionsEnabled(true);
    });
    expect(useSettingsStore.getState().customInstructionsEnabled).toBe(true);
    expect(useSettingsStore.getState().customInstructions).toBe('дай рецепт');
  });

  it('getActiveCustomInstructions returns empty when disabled', async () => {
    await act(async () => {
      useSettingsStore.getState().setCustomInstructions('  веган  ');
      useSettingsStore.getState().setCustomInstructionsEnabled(false);
    });
    expect(getActiveCustomInstructions()).toBe('');
    await act(async () => {
      useSettingsStore.getState().setCustomInstructionsEnabled(true);
    });
    expect(getActiveCustomInstructions()).toBe('веган');
  });
  it('defaults feature flags to enabled', () => {
    expect(useSettingsStore.getState().featureVitamins).toBe(true);
    expect(useSettingsStore.getState().featureHealthiness).toBe(true);
    expect(useSettingsStore.getState().featureComposition).toBe(true);
  });

  it('setFeatureVitamins / Healthiness / Composition update state', async () => {
    await act(async () => {
      useSettingsStore.getState().setFeatureVitamins(false);
      useSettingsStore.getState().setFeatureHealthiness(false);
      useSettingsStore.getState().setFeatureComposition(false);
    });
    expect(useSettingsStore.getState().featureVitamins).toBe(false);
    expect(useSettingsStore.getState().featureHealthiness).toBe(false);
    expect(useSettingsStore.getState().featureComposition).toBe(false);
  });

  it('defaults aiModel to google/gemini-3-flash-preview', () => {
    expect(useSettingsStore.getState().aiModel).toBe(
      'google/gemini-3-flash-preview',
    );
    expect(DEFAULT_AI_MODEL).toBe('google/gemini-3-flash-preview');
  });

  it('exposes curated AI_MODEL_OPTIONS with known OpenRouter slugs', () => {
    const values = AI_MODEL_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.5-flash',
      'openai/gpt-4.1-mini',
      'google/gemini-3-flash-preview',
      'google/gemini-3.5-flash',
      'google/gemini-3.6-flash',
      'openai/gpt-5.4',
      'anthropic/claude-sonnet-4.6',
      'moonshotai/kimi-k2.5',
      'moonshotai/kimi-k2.6',
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

  it('temperatureForModel returns 0 for all models', () => {
    expect(AI_TEMPERATURE).toBe(0);
    expect(isGeminiModel('google/gemini-2.5-flash-lite')).toBe(true);
    expect(isGeminiModel('openai/gpt-4.1-mini')).toBe(false);
    expect(temperatureForModel('google/gemini-2.5-flash-lite')).toBe(0);
    expect(temperatureForModel('google/gemini-3-flash-preview')).toBe(0);
    expect(temperatureForModel('openai/gpt-4.1-mini')).toBe(0);
    expect(temperatureForModel('anthropic/claude-sonnet-4.6')).toBe(0);
    expect(temperatureForModel(undefined)).toBe(0);
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
