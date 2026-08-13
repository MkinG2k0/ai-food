import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { useDiaryStore } from '@/entities/meal';
import { useImageStore } from '@/features/add-food';
import { useFavoritesStore } from '@/features/favorites';
import {
  KBJU_WIDGET_PREFS_KEY,
  WEEK_KCAL_WIDGET_PREFS_KEY,
} from '@/features/kbju-widget';
import { useModelTestStore } from '@/features/model-test';
import { useProfileStore } from '@/features/onboarding';
import {
  DEFAULT_AI_MODEL,
  DEFAULT_CALENDAR_RINGS,
  SETTINGS_EPOCH_ISO,
  useSettingsStore,
} from '@/features/settings';
import { useWeightStore } from '@/features/stats';
import { queryClient } from '@/shared/lib';
import { clearUsageCache } from '../api/fetchUsage';

const MEAL_IMAGES_DIR = 'meal-images';

/**
 * Wipe all user-local app data on logout.
 * Keeps device id (Capacitor Device.getId — not stored under ai-food-* keys).
 */
export function clearLocalUserDataOnSignOut(): void {
  useDiaryStore.getState().clearDiary();
  useDiaryStore.setState({ selectedDate: new Date() });

  useFavoritesStore.setState({ favorites: [], pendingDeletes: [] });
  useWeightStore.setState({ entries: [], goalKg: null });
  useProfileStore.getState().resetProfile();
  useImageStore.getState().clear();

  useSettingsStore.setState({
    customInstructions: '',
    customInstructionsEnabled: true,
    aiModel: DEFAULT_AI_MODEL,
    featureVitamins: true,
    featureHealthiness: true,
    featureComposition: true,
    calendarRings: { ...DEFAULT_CALENDAR_RINGS },
    clientUpdatedAt: SETTINGS_EPOCH_ISO,
  });

  useModelTestStore.getState().clearResults();
  clearUsageCache();
  void queryClient.clear();

  void Preferences.remove({ key: KBJU_WIDGET_PREFS_KEY });
  void Preferences.remove({ key: WEEK_KCAL_WIDGET_PREFS_KEY });

  void Filesystem.rmdir({
    path: MEAL_IMAGES_DIR,
    directory: Directory.Data,
    recursive: true,
  }).catch(() => {
    // dir may not exist
  });
}
