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
  photoBodiesWithinBudget,
  pickMealPhotoSample,
  reviveJsonSafe,
  toDebugJson,
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
    expect(snapshot.mealFileIndex).toEqual([
      { path: 'meal-images/a.jpg', bytes: 5 },
    ]);
  });

  it('keeps two photos from the old, middle and new meals', async () => {
    const meals = Array.from({ length: 9 }, (_, index) => ({
      id: String(index),
      timestamp: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      imageUri: `meal-images/p${index}.jpg`,
    }));
    preferenceStore.set('ai-food-diary', JSON.stringify({ state: { meals } }));
    for (let index = 0; index < 9; index += 1) {
      mealFiles.set(`meal-images/p${index}.jpg`, 'YQ==');
    }

    const snapshot = await collectClientDebugSnapshot();

    expect(snapshot.mealFileIndex).toHaveLength(9);
    expect(snapshot.mealFiles.map((file) => file.path)).toEqual([
      'meal-images/p0.jpg',
      'meal-images/p3.jpg',
      'meal-images/p6.jpg',
      'meal-images/p2.jpg',
      'meal-images/p5.jpg',
      'meal-images/p8.jpg',
    ]);
  });

  it('picks range edges and stops when the photo budget is full', () => {
    const paths = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    expect(
      pickMealPhotoSample(
        paths,
        paths.map((path, index) => ({ path, at: index })),
      ),
    ).toEqual(['a', 'd', 'g', 'c', 'f', 'i']);
    expect(
      photoBodiesWithinBudget(
        ['a', 'c', 'e'],
        new Map([
          ['a', 5],
          ['c', 5],
          ['e', 5],
        ]),
        12,
      ),
    ).toEqual(['a', 'c']);
  });

  it('drops large indexedDB values', async () => {
    const safe = await toDebugJson({ photo: 'x'.repeat(5000), name: 'soup' });
    expect(safe).toEqual({
      photo: { __type: 'omitted', bytes: 5000 },
      name: 'soup',
    });
  });

  it('unwraps a raw snapshot or an admin report', () => {
    const snapshot = {
      version: 1,
      localStorage: { a: '1' },
      sessionStorage: {},
      preferences: {},
      indexedDB: [],
      mealFileIndex: [],
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
