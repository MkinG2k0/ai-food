import { beforeEach, describe, expect, it, vi } from 'vitest';

const preferenceStore = new Map<string, string>();
const mealFiles = new Map<string, string>();

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    keys: async () => ({ keys: [...preferenceStore.keys()] }),
    get: async ({ key }: { key: string }) => ({
      value: preferenceStore.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      preferenceStore.set(key, value);
    },
    clear: async () => {
      preferenceStore.clear();
    },
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    readdir: async () => ({
      files: [...mealFiles.keys()].map((name) => ({
        name: name.replace('meal-images/', ''),
        type: 'file',
      })),
    }),
    readFile: async ({ path }: { path: string }) => ({
      data: mealFiles.get(path) ?? '',
    }),
    writeFile: async ({ path, data }: { path: string; data: string }) => {
      mealFiles.set(path, data);
    },
    rmdir: async () => {
      mealFiles.clear();
    },
  },
}));

vi.mock('@/shared/lib/appVersion', () => ({
  getAppVersion: () => '1.0.17',
}));

import {
  applyClientDebugSnapshot,
  collectClientDebugSnapshot,
  reviveJsonSafe,
  toJsonSafe,
  unwrapClientDebugSnapshot,
} from './clientDebugSnapshot';

describe('clientDebugSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    preferenceStore.clear();
    mealFiles.clear();
    vi.stubGlobal('indexedDB', undefined);
  });

  it('round-trips a blob through JSON', async () => {
    const blob = new Blob(['hello'], { type: 'image/jpeg' });
    const safe = await toJsonSafe(blob);
    const restored = reviveJsonSafe(JSON.parse(JSON.stringify(safe))) as Blob;
    expect(restored).toBeInstanceOf(Blob);
    expect(restored.type).toBe('image/jpeg');
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(restored);
    });
    expect(text).toBe('hello');
  });

  it('collects storage, preferences and meal files', async () => {
    localStorage.setItem('CapacitorStorage.ai-food-diary', '{"meals":[]}');
    sessionStorage.setItem('draft', '1');
    preferenceStore.set('ai-food-auth', '{"user":{"username":"kama"}}');
    mealFiles.set('meal-images/a.jpg', 'aGVsbG8=');

    const snapshot = await collectClientDebugSnapshot();

    expect(snapshot.version).toBe(1);
    expect(snapshot.appVersion).toBe('1.0.17');
    expect(snapshot.localStorage['CapacitorStorage.ai-food-diary']).toContain('meals');
    expect(snapshot.sessionStorage.draft).toBe('1');
    expect(snapshot.preferences['ai-food-auth']).toContain('kama');
    expect(snapshot.mealFiles).toEqual([
      { path: 'meal-images/a.jpg', base64: 'aGVsbG8=' },
    ]);
  });

  it('unwraps a raw snapshot or an admin report', () => {
    const snapshot = {
      version: 1,
      localStorage: { a: '1' },
      sessionStorage: {},
      preferences: {},
      indexedDB: [],
      mealFiles: [],
      errors: [],
    };
    expect(unwrapClientDebugSnapshot(snapshot).localStorage.a).toBe('1');
    expect(
      unwrapClientDebugSnapshot({ clientSnapshot: snapshot }).localStorage.a,
    ).toBe('1');
  });

  it('replaces local storage, preferences and meal files', async () => {
    localStorage.setItem('old', '1');
    preferenceStore.set('old', '1');
    mealFiles.set('meal-images/old.jpg', 'b2xk');

    await applyClientDebugSnapshot({
      version: 1,
      localStorage: { 'CapacitorStorage.ai-food-auth': '{"token":"t"}' },
      sessionStorage: { tab: '1' },
      preferences: { 'ai-food-auth': '{"user":{"id":"1"}}' },
      indexedDB: [],
      mealFiles: [{ path: 'meal-images/b.jpg', base64: 'YmI=' }],
      errors: [],
    });

    expect(localStorage.getItem('old')).toBeNull();
    expect(localStorage.getItem('CapacitorStorage.ai-food-auth')).toContain('token');
    expect(sessionStorage.getItem('tab')).toBe('1');
    expect(preferenceStore.get('old')).toBeUndefined();
    expect(preferenceStore.get('ai-food-auth')).toContain('"id":"1"');
    expect(mealFiles.get('meal-images/old.jpg')).toBeUndefined();
    expect(mealFiles.get('meal-images/b.jpg')).toBe('YmI=');
  });
});
