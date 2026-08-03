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

vi.mock('@/shared/lib', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib')>(
    '@/shared/lib',
  );
  return {
    ...actual,
    getDeviceId: vi.fn(async () => 'test-device'),
  };
});

describe('fetchUsage cache', () => {
  beforeEach(() => {
    storage.clear();
    localStorage.clear();
    vi.resetModules();
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
  });

  it('defaults to GUEST_FREE_USAGE_LIMIT without network', async () => {
    const { getCachedUsage, GUEST_FREE_USAGE_LIMIT, createDefaultGuestUsage } =
      await import('./fetchUsage');

    expect(GUEST_FREE_USAGE_LIMIT).toBe(50);
    expect(getCachedUsage()).toEqual(createDefaultGuestUsage(false));
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
