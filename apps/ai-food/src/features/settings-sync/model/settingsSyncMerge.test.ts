import { describe, expect, it } from 'vitest';
import type { SettingsSyncPayload } from '@/features/settings';
import {
  applySettingsSyncResponse,
  mergeSettingsLww,
} from './settingsSyncMerge';

const base: SettingsSyncPayload = {
  customInstructions: '',
  customInstructionsEnabled: true,
  aiModel: 'google/gemini-3-flash-preview',
  featureVitamins: true,
  featureHealthiness: true,
  featureComposition: true,
  calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
  sharePhotosToFriends: true,
};

describe('mergeSettingsLww', () => {
  it('remote wins when newer or equal', () => {
    const local = {
      settings: { ...base, customInstructions: 'local' },
      clientUpdatedAt: '2026-08-13T10:00:00.000Z',
    };
    const remote = {
      settings: { ...base, customInstructions: 'remote' },
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    };
    expect(mergeSettingsLww(local, remote).settings.customInstructions).toBe(
      'remote',
    );
    expect(
      mergeSettingsLww(local, {
        ...remote,
        clientUpdatedAt: '2026-08-13T10:00:00.000Z',
      }).settings.customInstructions,
    ).toBe('remote');
  });

  it('keeps local when remote is older', () => {
    const local = {
      settings: { ...base, customInstructions: 'local' },
      clientUpdatedAt: '2026-08-13T15:00:00.000Z',
    };
    const remote = {
      settings: { ...base, customInstructions: 'remote' },
      clientUpdatedAt: '2026-08-13T12:00:00.000Z',
    };
    expect(mergeSettingsLww(local, remote).settings.customInstructions).toBe(
      'local',
    );
  });
});

describe('applySettingsSyncResponse', () => {
  it('applies server response when newer', () => {
    const local = {
      settings: base,
      clientUpdatedAt: '2026-08-13T10:00:00.000Z',
    };
    const next = applySettingsSyncResponse(local, {
      settings: { ...base, featureVitamins: false },
      clientUpdatedAt: '2026-08-13T11:00:00.000Z',
    });
    expect(next.settings.featureVitamins).toBe(false);
  });
});
