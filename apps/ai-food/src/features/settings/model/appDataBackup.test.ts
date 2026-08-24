import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  APP_DATA_EXPORT_VERSION,
  AppDataBackupError,
  backupFileName,
  buildAppDataExport,
  downloadAppDataJson,
  parseAppDataExport,
  readJsonFile,
  snapshotFromExport,
  type AppDataSnapshot,
} from './appDataBackup';
import { DEFAULT_AI_MODEL } from './useSettingsStore';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: vi.fn(),
  },
}));

function sampleSnapshot(overrides: Partial<AppDataSnapshot> = {}): AppDataSnapshot {
  return {
    meals: [
      {
        id: 'm1',
        timestamp: '2026-07-21T10:00:00.000Z',
        items: [],
        totalCalories: 100,
        name: 'Овсянка',
      },
    ],
    profile: {
      gender: 'male',
      age: 30,
      height: 180,
      weight: 80,
      targetWeight: 75,
      targetWeightDate: '2026-12-31',
      activity: 'medium',
      goal: 'maintain',
      dietType: 'none',
    },
    targets: { kcal: 2200, protein: 140, fat: 70, carbs: 250, fiber: 30 },
    micronutrientTargets: null,
    settings: {
      customInstructions: 'я веган',
      customInstructionsEnabled: true,
      aiModel: DEFAULT_AI_MODEL,
      featureVitamins: true,
      featureHealthiness: false,
      featureComposition: true,
      calendarRings: {
        kcal: true,
        protein: true,
        fat: false,
        carbs: false,
      },
    },
    favorites: [],
    weightEntries: [{ id: 'w1', date: '2026-07-20', kg: 79.5 }],
    weightGoalKg: 75,
    ...overrides,
  };
}

describe('appDataBackup', () => {
  it('buildAppDataExport wraps snapshot with version and timestamp', () => {
    const data = buildAppDataExport(sampleSnapshot());
    expect(data.version).toBe(APP_DATA_EXPORT_VERSION);
    expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.diary.meals).toHaveLength(1);
    expect(data.settings.featureHealthiness).toBe(false);
    expect(data.weight.goalKg).toBe(75);
  });

  it('parseAppDataExport round-trips a valid export', () => {
    const built = buildAppDataExport(sampleSnapshot());
    const parsed = parseAppDataExport(built);
    expect(parsed.diary.meals[0].id).toBe('m1');
    expect(snapshotFromExport(parsed).settings.customInstructions).toBe(
      'я веган',
    );
  });

  it('parseAppDataExport rejects wrong version', () => {
    expect(() =>
      parseAppDataExport({ version: 99, diary: { meals: [] } }),
    ).toThrow(AppDataBackupError);
  });

  it('parseAppDataExport rejects missing diary', () => {
    expect(() =>
      parseAppDataExport({
        version: 1,
        settings: {
          customInstructions: '',
          customInstructionsEnabled: true,
          aiModel: DEFAULT_AI_MODEL,
          featureVitamins: true,
          featureHealthiness: true,
          featureComposition: true,
        },
      }),
    ).toThrow(/дневника/i);
  });

  it('parseAppDataExport normalizes unknown aiModel', () => {
    const built = buildAppDataExport(sampleSnapshot());
    built.settings.aiModel = 'unknown/model';
    const parsed = parseAppDataExport(built);
    expect(parsed.settings.aiModel).toBe(DEFAULT_AI_MODEL);
  });

  it('buildAppDataExport includes calendarRings', () => {
    const data = buildAppDataExport(
      sampleSnapshot({
        settings: {
          customInstructions: '',
          customInstructionsEnabled: true,
          aiModel: DEFAULT_AI_MODEL,
          featureVitamins: true,
          featureHealthiness: true,
          featureComposition: true,
          calendarRings: {
            kcal: true,
            protein: true,
            fat: true,
            carbs: true,
          },
        },
      }),
    );
    expect(data.settings.calendarRings).toEqual({
      kcal: true,
      protein: true,
      fat: true,
      carbs: true,
    });
  });

  it('parseAppDataExport round-trips calendarRings', () => {
    const built = buildAppDataExport(
      sampleSnapshot({
        settings: {
          customInstructions: '',
          customInstructionsEnabled: true,
          aiModel: DEFAULT_AI_MODEL,
          featureVitamins: true,
          featureHealthiness: true,
          featureComposition: true,
          calendarRings: {
            kcal: true,
            protein: false,
            fat: false,
            carbs: false,
          },
        },
      }),
    );
    expect(parseAppDataExport(built).settings.calendarRings).toEqual({
      kcal: true,
      protein: false,
      fat: false,
      carbs: false,
    });
  });

  it('parseAppDataExport defaults missing calendarRings to КБ', () => {
    const built = buildAppDataExport(sampleSnapshot());
    const legacy = {
      ...built,
      settings: {
        customInstructions: built.settings.customInstructions,
        customInstructionsEnabled: built.settings.customInstructionsEnabled,
        aiModel: built.settings.aiModel,
        featureVitamins: built.settings.featureVitamins,
        featureHealthiness: built.settings.featureHealthiness,
        featureComposition: built.settings.featureComposition,
      },
    };
    const parsed = parseAppDataExport(legacy);
    expect(parsed.settings.calendarRings).toEqual({
      kcal: true,
      protein: true,
      fat: false,
      carbs: false,
    });
  });

  it('parseAppDataExport migrates legacy calendarRingMode string', () => {
    const built = buildAppDataExport(sampleSnapshot());
    const legacy = {
      ...built,
      settings: {
        ...built.settings,
        calendarRingMode: 'full',
        calendarRings: undefined,
      },
    };
    expect(
      parseAppDataExport(legacy).settings.calendarRings,
    ).toEqual({
      kcal: true,
      protein: true,
      fat: true,
      carbs: true,
    });
  });

  it('backupFileName uses local calendar date', () => {
    expect(backupFileName(new Date(2026, 6, 21))).toBe(
      'ai-food-backup-2026-07-21.json',
    );
  });

  it('readJsonFile parses file contents', async () => {
    const file = new File(['{"ok":true}'], 't.json', {
      type: 'application/json',
    });
    await expect(readJsonFile(file)).resolves.toEqual({ ok: true });
  });

  it('readJsonFile throws on invalid JSON', async () => {
    const file = new File(['not-json'], 't.json', {
      type: 'application/json',
    });
    await expect(readJsonFile(file)).rejects.toThrow(AppDataBackupError);
  });

  describe('downloadAppDataJson (web)', () => {
    const click = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock'),
        revokeObjectURL: vi.fn(),
      });
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        const el = {
          href: '',
          download: '',
          rel: '',
          click,
          parentNode: {
            removeChild: vi.fn(),
          },
        };
        return el as unknown as HTMLAnchorElement;
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(
        (node) => node,
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('triggers an anchor download', async () => {
      await downloadAppDataJson(buildAppDataExport(sampleSnapshot()));
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });
  });
});
