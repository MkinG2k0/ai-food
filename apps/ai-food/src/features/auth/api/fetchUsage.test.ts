import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: storage.get(key) ?? null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      storage.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      storage.delete(key);
    }),
  },
}));

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ userToken: null }),
  },
}));

vi.mock('../model/quotaHeaders', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-Usage-Kind': 'other',
  })),
}));

vi.mock('@/shared/lib', () => ({
  getDeviceId: vi.fn(async () => 'test-device'),
  capacitorStorage: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

describe('fetchUsage cache', () => {
  beforeEach(async () => {
    storage.clear();
    localStorage.clear();
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    const { clearUsageCache } = await import('./fetchUsage');
    clearUsageCache();
  });

  it('defaults to GUEST_FREE_USAGE_LIMIT without network', async () => {
    const {
      getCachedUsage,
      GUEST_FREE_USAGE_LIMIT,
      AUTH_LOGIN_GENERATION_BONUS,
      createDefaultGuestUsage,
      getEffectiveFreeLimit,
    } = await import('./fetchUsage');

    expect(GUEST_FREE_USAGE_LIMIT).toBe(50);
    expect(AUTH_LOGIN_GENERATION_BONUS).toBe(100);
    expect(getEffectiveFreeLimit(false)).toBe(50);
    expect(getEffectiveFreeLimit(true)).toBe(150);
    expect(getCachedUsage()).toEqual(createDefaultGuestUsage(false));
    expect(createDefaultGuestUsage(true).limit).toBe(150);
  });

  it('persists to localStorage and restores sync', async () => {
    const mod = await import('./fetchUsage');

    const snap = await mod.fetchUsage();
    expect(snap.remaining).toBe(mod.GUEST_FREE_USAGE_LIMIT);
    expect(mod.getCachedUsage().remaining).toBe(mod.GUEST_FREE_USAGE_LIMIT);
    expect(localStorage.getItem('ai-food-usage')).toContain(
      `"remaining":${mod.GUEST_FREE_USAGE_LIMIT}`,
    );

    vi.resetModules();
    const fresh = await import('./fetchUsage');
    expect(fresh.getCachedUsage().remaining).toBe(fresh.GUEST_FREE_USAGE_LIMIT);
  });
});
