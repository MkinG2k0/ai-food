import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/shared/lib';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

export const DEFAULT_AI_MODEL = 'google/gemini-3-flash-preview';

/** Zero temperature for all models — deterministic nutrition estimates. */
export const AI_TEMPERATURE = 0;

export const AI_MODEL_OPTIONS = [
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { value: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { value: 'openai/gpt-5.4', label: 'GPT-5.4' },
  { value: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { value: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5' },
  { value: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6' },
] as const;

const ALLOWED_MODELS = new Set<string>(
  AI_MODEL_OPTIONS.map((o) => o.value),
);

export function normalizeAiModel(value: string): string {
  return ALLOWED_MODELS.has(value) ? value : DEFAULT_AI_MODEL;
}

/** Calendar day-cell ring density: К / КБ / КБЖУ. */
export type CalendarRingMode = 'kcal' | 'kcal_protein' | 'full';

export const DEFAULT_CALENDAR_RING_MODE: CalendarRingMode = 'kcal_protein';

const ALLOWED_CALENDAR_RING_MODES = new Set<string>([
  'kcal',
  'kcal_protein',
  'full',
]);

export function normalizeCalendarRingMode(value: unknown): CalendarRingMode {
  if (typeof value === 'string' && ALLOWED_CALENDAR_RING_MODES.has(value)) {
    return value as CalendarRingMode;
  }
  return DEFAULT_CALENDAR_RING_MODE;
}

export function aiModelLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const option = AI_MODEL_OPTIONS.find((o) => o.value === value);
  return option?.label ?? value;
}

export function isGeminiModel(model?: string | null): boolean {
  return !!model && /gemini/i.test(model);
}

/** All models get temperature 0 for deterministic estimates. */
export function temperatureForModel(_model?: string | null): number {
  return AI_TEMPERATURE;
}

/** Snapshot of analyze/refine feature flags from settings. */
export function getAnalyzeFeaturesFromSettings(): {
  vitamins: boolean;
  healthiness: boolean;
  composition: boolean;
} {
  const s = useSettingsStore.getState();
  return {
    vitamins: s.featureVitamins,
    healthiness: s.featureHealthiness,
    composition: s.featureComposition,
  };
}

/**
 * Custom instructions text to send to AI, or empty when the toggle is off.
 * The stored textarea value is never cleared by the toggle.
 */
export function getActiveCustomInstructions(): string {
  const s = useSettingsStore.getState();
  if (!s.customInstructionsEnabled) return '';
  return s.customInstructions.trim();
}

interface SettingsState {
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  /** When false, instructions are not sent to AI and the textarea is hidden (text kept). */
  customInstructionsEnabled: boolean;
  setCustomInstructionsEnabled: (value: boolean) => void;
  aiModel: string;
  setAiModel: (value: string) => void;
  /** Show vitamins/minerals in UI and request them from AI */
  featureVitamins: boolean;
  setFeatureVitamins: (value: boolean) => void;
  /** Show healthiness score in UI and request it from AI */
  featureHealthiness: boolean;
  setFeatureHealthiness: (value: boolean) => void;
  /** Show dish composition (items) in UI and ask AI to break down ingredients */
  featureComposition: boolean;
  setFeatureComposition: (value: boolean) => void;
  /** Concentric calendar rings: kcal / kcal+protein / full KBJU */
  calendarRingMode: CalendarRingMode;
  setCalendarRingMode: (value: CalendarRingMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      customInstructions: '',
      setCustomInstructions: (value) =>
        set({
          customInstructions: value.slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH),
        }),
      customInstructionsEnabled: true,
      setCustomInstructionsEnabled: (value) =>
        set({ customInstructionsEnabled: value }),
      aiModel: DEFAULT_AI_MODEL,
      setAiModel: (value) => set({ aiModel: normalizeAiModel(value) }),
      featureVitamins: true,
      setFeatureVitamins: (value) => set({ featureVitamins: value }),
      featureHealthiness: true,
      setFeatureHealthiness: (value) => set({ featureHealthiness: value }),
      featureComposition: true,
      setFeatureComposition: (value) => set({ featureComposition: value }),
      calendarRingMode: DEFAULT_CALENDAR_RING_MODE,
      setCalendarRingMode: (value) =>
        set({ calendarRingMode: normalizeCalendarRingMode(value) }),
    }),
    {
      name: 'ai-food-settings',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
