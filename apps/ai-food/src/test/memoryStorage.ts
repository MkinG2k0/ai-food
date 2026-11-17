/** In-memory Web Storage for Vitest when jsdom localStorage is unavailable. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
  } satisfies Storage;
}

export function ensureWebStorage(name: 'localStorage' | 'sessionStorage'): void {
  const target = globalThis as typeof globalThis & {
    localStorage?: Storage;
    sessionStorage?: Storage;
  };

  const assign = (storage: Storage): void => {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: storage,
    });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: storage,
      });
    }
  };

  try {
    const existing = target[name];
    if (!existing) throw new Error('missing');
    const probe = '__vitest_storage_probe__';
    existing.setItem(probe, '1');
    existing.removeItem(probe);
  } catch {
    assign(createMemoryStorage());
  }
}
