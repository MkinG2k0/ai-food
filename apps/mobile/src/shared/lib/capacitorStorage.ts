import { Preferences } from '@capacitor/preferences';
import type { StateStorage } from 'zustand/middleware';

/**
 * Zustand persist storage backed by Capacitor Preferences.
 * On first read, migrates legacy Zustand localStorage payloads if present
 * (Preferences web uses a Cap-prefixed key, so old `ai-food-*` keys would be missed).
 */
export const capacitorStorage: StateStorage = {
  getItem: async (name) => {
    const { value } = await Preferences.get({ key: name });
    if (value !== null) return value;

    try {
      const legacy = localStorage.getItem(name);
      if (legacy === null) return null;
      await Preferences.set({ key: name, value: legacy });
      localStorage.removeItem(name);
      return legacy;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name) => {
    await Preferences.remove({ key: name });
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
