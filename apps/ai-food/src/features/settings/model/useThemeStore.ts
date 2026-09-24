import { create } from 'zustand';
import {
  applyThemePreference,
  isThemePreference,
  readStoredTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/shared/lib/theme';

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Re-resolve when OS preference changes (system mode only). */
  syncFromSystem: () => void;
}

function applyAndSnapshot(preference: ThemePreference): ResolvedTheme {
  writeStoredTheme(preference);
  return applyThemePreference(preference);
}

const initialPreference = readStoredTheme();
const initialResolved = applyThemePreference(initialPreference);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolved: initialResolved,
  setPreference: (preference) => {
    if (!isThemePreference(preference)) return;
    const resolved = applyAndSnapshot(preference);
    set({ preference, resolved });
  },
  syncFromSystem: () => {
    const { preference } = get();
    if (preference !== 'system') return;
    const resolved = applyThemePreference(preference);
    set({ resolved });
  },
}));
