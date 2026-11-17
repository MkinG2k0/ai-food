import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

import { installCanvasMocks } from './canvasMocks';
import { ensureWebStorage } from './memoryStorage';

const { prefsStore } = vi.hoisted(() => ({
  prefsStore: new Map<string, string>(),
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...actual,
    registerPlugin: vi.fn(() => ({})),
  };
});

/** Prefer in-memory Preferences over PreferencesWeb → localStorage. */
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    clear: vi.fn(async () => {
      prefsStore.clear();
    }),
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: prefsStore.has(key) ? prefsStore.get(key)! : null,
    })),
    keys: vi.fn(async () => ({ keys: [...prefsStore.keys()] })),
    remove: vi.fn(async ({ key }: { key: string }) => {
      prefsStore.delete(key);
    }),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      prefsStore.set(key, value);
    }),
  },
}));

ensureWebStorage('localStorage');
ensureWebStorage('sessionStorage');
installCanvasMocks();

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = (_blob: Blob) => `blob:mock-${Math.random()}`;
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  prefsStore.clear();
  // Re-apply after tests that call `vi.restoreAllMocks()`.
  installCanvasMocks();
  ensureWebStorage('localStorage');
  ensureWebStorage('sessionStorage');
});
