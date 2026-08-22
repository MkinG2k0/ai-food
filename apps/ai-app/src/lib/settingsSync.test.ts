import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { applySettingsSync } from './settingsSync.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

function prismaStub() {
  return {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  } as never;
}

const sampleSettings = {
  customInstructions: 'я веган',
  customInstructionsEnabled: true,
  aiModel: 'google/gemini-3-flash-preview',
  featureVitamins: true,
  featureHealthiness: true,
  featureComposition: false,
  calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
  sharePhotosToFriends: true,
};

describe('applySettingsSync LWW', () => {
  beforeEach(() => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('writes when nothing stored', async () => {
    const body = {
      settings: sampleSettings,
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    };
    const result = await applySettingsSync(prismaStub(), 'user-1', body);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        clientSettings: sampleSettings,
        settingsClientUpdatedAt: new Date('2026-08-13T12:00:00.000Z'),
      },
    });
    expect(result).toEqual(body);
  });

  it('writes when incoming clock is newer or equal', async () => {
    mocks.findUnique.mockResolvedValue({
      clientSettings: { ...sampleSettings, customInstructions: 'old' },
      settingsClientUpdatedAt: new Date('2026-08-13T11:00:00.000Z'),
    });

    const body = {
      settings: sampleSettings,
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    };
    const result = await applySettingsSync(prismaStub(), 'user-1', body);

    expect(mocks.update).toHaveBeenCalled();
    expect(result.settings.customInstructions).toBe('я веган');
    expect(result.clientUpdatedAt).toBe('2026-08-13T12:00:00.000Z');
  });

  it('skips write and returns stored when stored clock is newer', async () => {
    const stored = {
      ...sampleSettings,
      customInstructions: 'server wins',
    };
    mocks.findUnique.mockResolvedValue({
      clientSettings: stored,
      settingsClientUpdatedAt: new Date('2026-08-13T15:00:00.000Z'),
    });

    const result = await applySettingsSync(prismaStub(), 'user-1', {
      settings: sampleSettings,
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      settings: stored,
      clientUpdatedAt: '2026-08-13T15:00:00.000Z',
    });
  });
});
