import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MicronutrientId } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS } from '@ai-food/shared-types';
import { PRIORITY_MICRONUTRIENT_IDS } from '@/entities/nutrition';
import { capacitorStorage } from '@/shared/lib';

const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 2000;

export const DEFAULT_AI_MODEL = 'google/gemini-3-flash-preview';

/** Default collapsed Stats / badges list (same as PRIORITY_MICRONUTRIENT_IDS). */
export const DEFAULT_STATS_MICRONUTRIENT_IDS: MicronutrientId[] = [
  ...PRIORITY_MICRONUTRIENT_IDS,
];

const MICRONUTRIENT_ID_SET = new Set<string>(MICRONUTRIENT_IDS);

/** Keep known ids, dedupe; empty/invalid → defaults. */
export function normalizeStatsMicronutrientIds(
  value: unknown,
): MicronutrientId[] {
  if (!Array.isArray(value)) return [...DEFAULT_STATS_MICRONUTRIENT_IDS];
  const out: MicronutrientId[] = [];
  const seen = new Set<MicronutrientId>();
  for (const item of value) {
    if (typeof item !== 'string' || !MICRONUTRIENT_ID_SET.has(item)) continue;
    const id = item as MicronutrientId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length > 0 ? out : [...DEFAULT_STATS_MICRONUTRIENT_IDS];
}

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

/** Individual calendar ring metrics (К / Б / Ж / У). */
export type CalendarRingKey = 'kcal' | 'protein' | 'fat' | 'carbs';

export const CALENDAR_RING_ORDER: CalendarRingKey[] = [
  'kcal',
  'protein',
  'fat',
  'carbs',
];

export interface CalendarRingsSelection {
  kcal: boolean;
  protein: boolean;
  fat: boolean;
  carbs: boolean;
}

/** Default КБ — calories + protein. */
export const DEFAULT_CALENDAR_RINGS: CalendarRingsSelection = {
  kcal: true,
  protein: true,
  fat: false,
  carbs: false,
};

function isCalendarRingsRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Migrate legacy presets К / КБ / КБЖУ → boolean selection. */
function ringsFromLegacyMode(value: string): CalendarRingsSelection | null {
  if (value === 'kcal') {
    return { kcal: true, protein: false, fat: false, carbs: false };
  }
  if (value === 'kcal_protein') {
    return { ...DEFAULT_CALENDAR_RINGS };
  }
  if (value === 'full') {
    return { kcal: true, protein: true, fat: true, carbs: true };
  }
  return null;
}

export function normalizeCalendarRings(value: unknown): CalendarRingsSelection {
  if (typeof value === 'string') {
    return ringsFromLegacyMode(value) ?? { ...DEFAULT_CALENDAR_RINGS };
  }
  if (isCalendarRingsRecord(value)) {
    return {
      kcal: Boolean(value.kcal),
      protein: Boolean(value.protein),
      fat: Boolean(value.fat),
      carbs: Boolean(value.carbs),
    };
  }
  return { ...DEFAULT_CALENDAR_RINGS };
}

/** Enabled keys in fixed outer→inner order. */
export function enabledCalendarRings(
  selection: CalendarRingsSelection,
): CalendarRingKey[] {
  return CALENDAR_RING_ORDER.filter((key) => selection[key]);
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

/** Epoch clock — loses LWW to any real server/client edit. */
export const SETTINGS_EPOCH_ISO = '1970-01-01T00:00:00.000Z';

function bumpClock(): string {
  return new Date().toISOString();
}

/** Fields synced via POST /user/settings/sync (no clientUpdatedAt). */
export type SettingsSyncPayload = {
  customInstructions: string;
  customInstructionsEnabled: boolean;
  aiModel: string;
  featureVitamins: boolean;
  featureHealthiness: boolean;
  featureComposition: boolean;
  calendarRings: CalendarRingsSelection;
  sharePhotosToFriends: boolean;
};

export function settingsSyncPayloadFromState(s: {
  customInstructions: string;
  customInstructionsEnabled: boolean;
  aiModel: string;
  featureVitamins: boolean;
  featureHealthiness: boolean;
  featureComposition: boolean;
  calendarRings: CalendarRingsSelection;
  sharePhotosToFriends: boolean;
}): SettingsSyncPayload {
  return {
    customInstructions: s.customInstructions,
    customInstructionsEnabled: s.customInstructionsEnabled,
    aiModel: s.aiModel,
    featureVitamins: s.featureVitamins,
    featureHealthiness: s.featureHealthiness,
    featureComposition: s.featureComposition,
    calendarRings: { ...s.calendarRings },
    sharePhotosToFriends: s.sharePhotosToFriends,
  };
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
  /** When false, friends see text-only meal rows in profile (D-01). */
  sharePhotosToFriends: boolean;
  setSharePhotosToFriends: (value: boolean) => void;
  /** Which КБЖУ rings to show on the calendar (any combination). */
  calendarRings: CalendarRingsSelection;
  setCalendarRing: (key: CalendarRingKey, enabled: boolean) => void;
  setCalendarRings: (value: CalendarRingsSelection) => void;
  /** Micronutrients shown by default in Stats / meal badges (before «все»). */
  statsMicronutrientIds: MicronutrientId[];
  setStatsMicronutrientIds: (ids: MicronutrientId[]) => void;
  /** LWW clock for settings sync */
  clientUpdatedAt: string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      customInstructions: '',
      setCustomInstructions: (value) =>
        set({
          customInstructions: value.slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH),
          clientUpdatedAt: bumpClock(),
        }),
      customInstructionsEnabled: true,
      setCustomInstructionsEnabled: (value) =>
        set({
          customInstructionsEnabled: value,
          clientUpdatedAt: bumpClock(),
        }),
      aiModel: DEFAULT_AI_MODEL,
      setAiModel: (value) =>
        set({
          aiModel: normalizeAiModel(value),
          clientUpdatedAt: bumpClock(),
        }),
      featureVitamins: true,
      setFeatureVitamins: (value) =>
        set({ featureVitamins: value, clientUpdatedAt: bumpClock() }),
      featureHealthiness: true,
      setFeatureHealthiness: (value) =>
        set({ featureHealthiness: value, clientUpdatedAt: bumpClock() }),
      featureComposition: true,
      setFeatureComposition: (value) =>
        set({ featureComposition: value, clientUpdatedAt: bumpClock() }),
      sharePhotosToFriends: true,
      setSharePhotosToFriends: (value) =>
        set({ sharePhotosToFriends: value, clientUpdatedAt: bumpClock() }),
      calendarRings: { ...DEFAULT_CALENDAR_RINGS },
      setCalendarRing: (key, enabled) =>
        set((s) => ({
          calendarRings: { ...s.calendarRings, [key]: enabled },
          clientUpdatedAt: bumpClock(),
        })),
      setCalendarRings: (value) =>
        set({
          calendarRings: normalizeCalendarRings(value),
          clientUpdatedAt: bumpClock(),
        }),
      statsMicronutrientIds: [...DEFAULT_STATS_MICRONUTRIENT_IDS],
      setStatsMicronutrientIds: (ids) =>
        set({
          statsMicronutrientIds: normalizeStatsMicronutrientIds(ids),
        }),
      clientUpdatedAt: SETTINGS_EPOCH_ISO,
    }),
    {
      name: 'ai-food-settings',
      version: 5,
      storage: createJSONStorage(() => capacitorStorage),
      migrate: (persisted, version) => {
        if (!isCalendarRingsRecord(persisted)) {
          return persisted as unknown as SettingsState;
        }
        const next: Record<string, unknown> = { ...persisted };
        if (version < 2) {
          next.calendarRings = normalizeCalendarRings(
            next.calendarRings ?? next.calendarRingMode,
          );
          delete next.calendarRingMode;
        } else {
          next.calendarRings = normalizeCalendarRings(next.calendarRings);
        }
        if (typeof next.clientUpdatedAt !== 'string') {
          next.clientUpdatedAt = SETTINGS_EPOCH_ISO;
        }
        if (version < 4) {
          next.sharePhotosToFriends =
            typeof next.sharePhotosToFriends === 'boolean'
              ? next.sharePhotosToFriends
              : true;
        }
        if (version < 5) {
          next.statsMicronutrientIds = normalizeStatsMicronutrientIds(
            next.statsMicronutrientIds,
          );
        } else {
          next.statsMicronutrientIds = normalizeStatsMicronutrientIds(
            next.statsMicronutrientIds,
          );
        }
        return next as unknown as SettingsState;
      },
    }
  )
);
