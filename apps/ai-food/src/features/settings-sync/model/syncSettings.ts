import { useAuthStore } from '@/features/auth';
import {
  normalizeAiModel,
  normalizeCalendarRings,
  settingsSyncPayloadFromState,
  useSettingsStore,
} from '@/features/settings';
import { syncSettingsApi } from '../api/syncSettingsApi';
import { applySettingsSyncResponse } from './settingsSyncMerge';

export async function syncSettings(): Promise<void> {
  if (!useAuthStore.getState().userToken) return;

  const state = useSettingsStore.getState();
  const local = {
    settings: settingsSyncPayloadFromState(state),
    clientUpdatedAt: state.clientUpdatedAt,
  };

  const response = await syncSettingsApi({
    settings: local.settings,
    clientUpdatedAt: local.clientUpdatedAt,
  });

  const next = applySettingsSyncResponse(local, response);
  useSettingsStore.setState({
    customInstructions: next.settings.customInstructions.slice(0, 2000),
    customInstructionsEnabled: next.settings.customInstructionsEnabled,
    aiModel: normalizeAiModel(next.settings.aiModel),
    featureVitamins: next.settings.featureVitamins,
    featureHealthiness: next.settings.featureHealthiness,
    featureComposition: next.settings.featureComposition,
    calendarRings: normalizeCalendarRings(next.settings.calendarRings),
    sharePhotosToFriends: next.settings.sharePhotosToFriends ?? true,
    clientUpdatedAt: next.clientUpdatedAt,
  });
}
