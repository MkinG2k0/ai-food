import { capacitorStorage, getDeviceId } from '@/shared/lib';
import { useAuthStore } from '../model/useAuthStore';
import {
  getQuotaHeaders,
  type UsageKindHeader,
} from '../model/quotaHeaders';

/** Offline UI fallback for guest free quota (server truth: AppSettings / GET /usage). */
export const GUEST_FREE_USAGE_LIMIT = 50;

/** Offline UI fallback for login bonus (server truth: AppSettings / GET /usage). */
export const AUTH_LOGIN_GENERATION_BONUS = 100;

/** Guest: free only. Authenticated (no sub): free + login bonus. */
export function getEffectiveFreeLimit(authenticated: boolean): number {
  return (
    GUEST_FREE_USAGE_LIMIT +
    (authenticated ? AUTH_LOGIN_GENERATION_BONUS : 0)
  );
}

export type UsageSnapshot = {
  used: number;
  limit: number;
  remaining: number | null;
  authenticated: boolean;
  hasActiveSubscription?: boolean;
  freeGenerationLimit: number;
  authLoginGenerationBonus: number;
  degraded?: boolean;
};

const USAGE_CACHE_KEY = 'ai-food-usage';

export const usageQueryKey = ['usage'] as const;

/** Sync memory cache for immediate UI (seeded from localStorage). */
let memoryCache: UsageSnapshot | null = null;
let hydratePromise: Promise<UsageSnapshot> | null = null;

export function createDefaultGuestUsage(
  authenticated = false,
): UsageSnapshot {
  const limit = getEffectiveFreeLimit(authenticated);
  return {
    used: 0,
    limit,
    remaining: limit,
    authenticated,
    hasActiveSubscription: false,
    freeGenerationLimit: GUEST_FREE_USAGE_LIMIT,
    authLoginGenerationBonus: AUTH_LOGIN_GENERATION_BONUS,
  };
}

function isUsageSnapshot(value: unknown): value is UsageSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.used === 'number' &&
    typeof v.limit === 'number' &&
    (v.remaining === null || typeof v.remaining === 'number') &&
    typeof v.authenticated === 'boolean'
  );
}

function normalizeUsageSnapshot(value: UsageSnapshot): UsageSnapshot {
  return {
    ...value,
    freeGenerationLimit:
      typeof value.freeGenerationLimit === 'number' &&
      Number.isFinite(value.freeGenerationLimit)
        ? value.freeGenerationLimit
        : GUEST_FREE_USAGE_LIMIT,
    authLoginGenerationBonus:
      typeof value.authLoginGenerationBonus === 'number' &&
      Number.isFinite(value.authLoginGenerationBonus)
        ? value.authLoginGenerationBonus
        : AUTH_LOGIN_GENERATION_BONUS,
  };
}

function parseUsageSnapshot(raw: string | null | undefined): UsageSnapshot | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isUsageSnapshot(parsed) ? normalizeUsageSnapshot(parsed) : null;
  } catch {
    return null;
  }
}

/** Sync localStorage read — avoids UI flicker before Preferences hydrate. */
function readLocalStorageCache(): UsageSnapshot | null {
  try {
    return parseUsageSnapshot(localStorage.getItem(USAGE_CACHE_KEY));
  } catch {
    return null;
  }
}

function writeLocalStorageCache(snap: UsageSnapshot): void {
  try {
    localStorage.setItem(USAGE_CACHE_KEY, JSON.stringify(snap));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Immediate value for UI: memory → localStorage → default (50 guest / 150 auth).
 * Never returns null, so the settings bar does not jump from empty.
 */
export function getCachedUsage(): UsageSnapshot {
  if (memoryCache) return memoryCache;
  const fromLocal = readLocalStorageCache();
  if (fromLocal) {
    memoryCache = fromLocal;
    return fromLocal;
  }
  return createDefaultGuestUsage(Boolean(useAuthStore.getState().userToken));
}

export async function hydrateUsageCache(): Promise<UsageSnapshot> {
  if (memoryCache) return memoryCache;

  const sync = readLocalStorageCache();
  if (sync) {
    memoryCache = sync;
    return sync;
  }

  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const raw = await capacitorStorage.getItem(USAGE_CACHE_KEY);
        const parsed = parseUsageSnapshot(raw);
        if (parsed) {
          memoryCache = parsed;
          writeLocalStorageCache(parsed);
          return parsed;
        }
      } catch {
        // fall through to default
      }
      const fallback = createDefaultGuestUsage(
        Boolean(useAuthStore.getState().userToken),
      );
      memoryCache = fallback;
      return fallback;
    })();
  }
  return hydratePromise;
}

async function persistUsageCache(snap: UsageSnapshot): Promise<void> {
  memoryCache = snap;
  writeLocalStorageCache(snap);
  try {
    await capacitorStorage.setItem(USAGE_CACHE_KEY, JSON.stringify(snap));
  } catch {
    // localStorage still holds the value for next paint
  }
}

/** Drop in-memory + persisted usage snapshot (e.g. on sign-out). */
export function clearUsageCache(): void {
  memoryCache = null;
  hydratePromise = null;
  try {
    localStorage.removeItem(USAGE_CACHE_KEY);
  } catch {
    // ignore
  }
  void capacitorStorage.removeItem(USAGE_CACHE_KEY);
}

export async function fetchUsage(): Promise<UsageSnapshot> {
  await hydrateUsageCache();

  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl) {
    const snap: UsageSnapshot = {
      ...createDefaultGuestUsage(Boolean(useAuthStore.getState().userToken)),
      degraded: true,
    };
    await persistUsageCache(snap);
    return snap;
  }

  await getDeviceId();
  const headers = await getQuotaHeaders('other' satisfies UsageKindHeader);
  const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/usage`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`usage ${res.status}`);
  }
  const snap = normalizeUsageSnapshot((await res.json()) as UsageSnapshot);
  await persistUsageCache(snap);
  return snap;
}
