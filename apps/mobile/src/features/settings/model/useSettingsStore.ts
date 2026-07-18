import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

export const DEFAULT_AI_MODEL = 'openai/gpt-4.1-mini';

export const AI_MODEL_OPTIONS = [
  { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'openai/gpt-4.1', label: 'GPT-4.1' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const;

const ALLOWED_MODELS = new Set<string>(
  AI_MODEL_OPTIONS.map((o) => o.value),
);

export function normalizeAiModel(value: string): string {
  return ALLOWED_MODELS.has(value) ? value : DEFAULT_AI_MODEL;
}

interface SettingsState {
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  aiModel: string;
  setAiModel: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      customInstructions: '',
      setCustomInstructions: (value) =>
        set({
          customInstructions: value.slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH),
        }),
      aiModel: DEFAULT_AI_MODEL,
      setAiModel: (value) => set({ aiModel: normalizeAiModel(value) }),
    }),
    {
      name: 'ai-food-settings',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
