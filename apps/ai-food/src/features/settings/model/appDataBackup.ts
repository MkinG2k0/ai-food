import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type {
  DailyTargets,
  Meal,
  MicronutrientEstimate,
  UserProfile,
} from '@ai-food/shared-types';
import type { FavoriteFood } from '@/features/favorites';
import type { WeightEntry } from '@/features/stats';
import {
  normalizeAiModel,
  normalizeCalendarRingMode,
  type CalendarRingMode,
} from './useSettingsStore';

export const APP_DATA_EXPORT_VERSION = 1 as const;

export interface AppDataExportSettings {
  customInstructions: string;
  customInstructionsEnabled: boolean;
  aiModel: string;
  featureVitamins: boolean;
  featureHealthiness: boolean;
  featureComposition: boolean;
  calendarRingMode: CalendarRingMode;
}

export interface AppDataExport {
  version: typeof APP_DATA_EXPORT_VERSION;
  exportedAt: string;
  diary: { meals: Meal[] };
  profile: {
    profile: UserProfile | null;
    targets: DailyTargets | null;
    micronutrientTargets: MicronutrientEstimate[] | null;
  };
  settings: AppDataExportSettings;
  favorites: { favorites: FavoriteFood[] };
  weight: {
    entries: WeightEntry[];
    goalKg: number | null;
  };
}

export interface AppDataSnapshot {
  meals: Meal[];
  profile: UserProfile | null;
  targets: DailyTargets | null;
  micronutrientTargets: MicronutrientEstimate[] | null;
  settings: AppDataExportSettings;
  favorites: FavoriteFood[];
  weightEntries: WeightEntry[];
  weightGoalKg: number | null;
}

export class AppDataBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppDataBackupError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

export function buildAppDataExport(snapshot: AppDataSnapshot): AppDataExport {
  return {
    version: APP_DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    diary: { meals: snapshot.meals },
    profile: {
      profile: snapshot.profile,
      targets: snapshot.targets,
      micronutrientTargets: snapshot.micronutrientTargets,
    },
    settings: {
      ...snapshot.settings,
      aiModel: normalizeAiModel(snapshot.settings.aiModel),
      calendarRingMode: normalizeCalendarRingMode(
        snapshot.settings.calendarRingMode,
      ),
    },
    favorites: { favorites: snapshot.favorites },
    weight: {
      entries: snapshot.weightEntries,
      goalKg: snapshot.weightGoalKg,
    },
  };
}

export function parseAppDataExport(raw: unknown): AppDataExport {
  if (!isRecord(raw)) {
    throw new AppDataBackupError('Файл не является JSON-объектом');
  }

  if (raw.version !== APP_DATA_EXPORT_VERSION) {
    throw new AppDataBackupError(
      `Неподдерживаемая версия бэкапа (ожидается ${APP_DATA_EXPORT_VERSION})`,
    );
  }

  if (!isRecord(raw.diary) || !Array.isArray(raw.diary.meals)) {
    throw new AppDataBackupError('В файле нет дневника (diary.meals)');
  }

  if (!isRecord(raw.profile)) {
    throw new AppDataBackupError('В файле нет профиля (profile)');
  }

  if (!isRecord(raw.settings)) {
    throw new AppDataBackupError('В файле нет настроек (settings)');
  }

  const s = raw.settings;
  if (
    typeof s.customInstructions !== 'string' ||
    !isBoolean(s.customInstructionsEnabled) ||
    typeof s.aiModel !== 'string' ||
    !isBoolean(s.featureVitamins) ||
    !isBoolean(s.featureHealthiness) ||
    !isBoolean(s.featureComposition)
  ) {
    throw new AppDataBackupError('Некорректный блок settings');
  }

  if (!isRecord(raw.favorites) || !Array.isArray(raw.favorites.favorites)) {
    throw new AppDataBackupError('В файле нет избранного (favorites.favorites)');
  }

  if (
    !isRecord(raw.weight) ||
    !Array.isArray(raw.weight.entries) ||
    !isNumberOrNull(raw.weight.goalKg)
  ) {
    throw new AppDataBackupError('Некорректный блок weight');
  }

  return {
    version: APP_DATA_EXPORT_VERSION,
    exportedAt:
      typeof raw.exportedAt === 'string'
        ? raw.exportedAt
        : new Date().toISOString(),
    diary: { meals: raw.diary.meals as Meal[] },
    profile: {
      profile: (raw.profile.profile as UserProfile | null) ?? null,
      targets: (raw.profile.targets as DailyTargets | null) ?? null,
      micronutrientTargets:
        (raw.profile.micronutrientTargets as MicronutrientEstimate[] | null) ??
        null,
    },
    settings: {
      customInstructions: s.customInstructions,
      customInstructionsEnabled: s.customInstructionsEnabled,
      aiModel: normalizeAiModel(s.aiModel),
      featureVitamins: s.featureVitamins,
      featureHealthiness: s.featureHealthiness,
      featureComposition: s.featureComposition,
      calendarRingMode: normalizeCalendarRingMode(s.calendarRingMode),
    },
    favorites: { favorites: raw.favorites.favorites as FavoriteFood[] },
    weight: {
      entries: raw.weight.entries as WeightEntry[],
      goalKg: raw.weight.goalKg,
    },
  };
}

export function snapshotFromExport(data: AppDataExport): AppDataSnapshot {
  return {
    meals: data.diary.meals,
    profile: data.profile.profile,
    targets: data.profile.targets,
    micronutrientTargets: data.profile.micronutrientTargets,
    settings: data.settings,
    favorites: data.favorites.favorites,
    weightEntries: data.weight.entries,
    weightGoalKg: data.weight.goalKg,
  };
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `ai-food-backup-${y}-${m}-${d}.json`;
}

export async function downloadAppDataJson(data: AppDataExport): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const filename = backupFileName();

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(new AppDataBackupError('Не удалось прочитать файл'));
    reader.readAsText(file);
  });
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppDataBackupError('Не удалось разобрать JSON');
  }
}
