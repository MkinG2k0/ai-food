import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

export const DEFAULT_AI_MODEL = 'google/gemini-2.5-flash-lite';

export const AI_MODEL_OPTIONS = [
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'qwen/qwen-vl-max', label: 'Qwen VL Max' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 mini' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { value: 'openai/gpt-5.4', label: 'GPT-5.4' },
  { value: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
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
