import {
  buildAvgCostPerGeneration,
  buildRunway,
  buildSpendFromActivity,
} from './openrouterAdminAnalytics.js';
import type {
  OpenRouterActivityItem,
  OpenRouterAdminSnapshot,
} from './openrouterAdminTypes.js';

export const OPENROUTER_ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;

const CREDITS_URL = 'https://openrouter.ai/api/v1/credits';
const ACTIVITY_URL = 'https://openrouter.ai/api/v1/activity';
const KEY_URL = 'https://openrouter.ai/api/v1/key';
const FX_URL =
  'https://api.frankfurter.dev/v2/rate/USD/RUB?providers=CBR';

type FetchError = 'timeout' | 'upstream_error';

type ActivityFetchResult =
  | { ok: true; items: OpenRouterActivityItem[] }
  | { ok: false };

type CollectOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  getEnv?: (k: string) => string | undefined;
  countBillableGenerations30d: (now: Date) => Promise<number>;
  cache?: {
    get(): OpenRouterAdminSnapshot | null;
    set(s: OpenRouterAdminSnapshot): void;
  };
};

let moduleCache: { at: number; value: OpenRouterAdminSnapshot } | null = null;

export function resetOpenRouterAdminCacheForTests() {
  moduleCache = null;
}

function unavailableSpend(): OpenRouterAdminSnapshot['spend'] {
  return {
    last7DaysUsd: null,
    last30DaysUsd: null,
    last7DaysRub: null,
    last30DaysRub: null,
    requests30d: 0,
    promptTokens30d: 0,
    completionTokens30d: 0,
    reasoningTokens30d: 0,
  };
}

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: FetchError }> {
  try {
    const res = await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, error: 'upstream_error' };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')
    ) {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'upstream_error' };
  }
}

function setError(
  errors: NonNullable<OpenRouterAdminSnapshot['errors']>,
  field: keyof NonNullable<OpenRouterAdminSnapshot['errors']>,
  code: string,
) {
  errors[field] = code;
}

function mapActivityItem(raw: Record<string, unknown>): OpenRouterActivityItem {
  return {
    date: String(raw.date),
    model: String(raw.model),
    usage: Number(raw.usage),
    requests: Number(raw.requests),
    prompt_tokens: Number(raw.prompt_tokens),
    completion_tokens: Number(raw.completion_tokens),
    reasoning_tokens: Number(raw.reasoning_tokens),
  };
}

function mapKeyData(data: Record<string, unknown>) {
  return {
    label: String(data.label),
    usage: Number(data.usage),
    usageDaily: Number(data.usage_daily),
    usageWeekly: Number(data.usage_weekly),
    usageMonthly: Number(data.usage_monthly),
    limit: data.limit == null ? null : Number(data.limit),
    limitRemaining:
      data.limit_remaining == null ? null : Number(data.limit_remaining),
    limitReset: data.limit_reset == null ? null : String(data.limit_reset),
    isFreeTier: Boolean(data.is_free_tier),
  };
}

export async function collectOpenRouterAdminSnapshot(
  options: CollectOptions,
): Promise<OpenRouterAdminSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowFn = options.now ?? (() => new Date());
  const getEnv = options.getEnv ?? ((k: string) => process.env[k]);
  const now = nowFn();
  const nowMs = now.getTime();

  if (options.cache) {
    const cached = options.cache.get();
    if (cached) return cached;
  } else if (
    moduleCache &&
    nowMs - moduleCache.at < OPENROUTER_ADMIN_CACHE_TTL_MS
  ) {
    return moduleCache.value;
  }

  const managementKey = getEnv('OPENROUTER_MANAGEMENT_API_KEY');
  const runtimeKey = getEnv('OPENROUTER_API_KEY');
  const errors: NonNullable<OpenRouterAdminSnapshot['errors']> = {};

  const creditsPromise = (async () => {
    if (!managementKey) {
      setError(errors, 'credits', 'missing_management_key');
      return null;
    }
    const result = await fetchJson<{ data: { total_credits: number; total_usage: number } }>(
      fetchImpl,
      CREDITS_URL,
      { headers: { Authorization: `Bearer ${managementKey}` } },
    );
    if (!result.ok) {
      setError(errors, 'credits', result.error);
      return null;
    }
    const { total_credits, total_usage } = result.data.data;
    return {
      totalCredits: total_credits,
      totalUsage: total_usage,
      available: total_credits - total_usage,
    };
  })();

  const activityPromise = (async (): Promise<ActivityFetchResult> => {
    if (!managementKey) {
      setError(errors, 'activity', 'missing_management_key');
      return { ok: false };
    }
    const result = await fetchJson<{ data: Record<string, unknown>[] }>(
      fetchImpl,
      ACTIVITY_URL,
      { headers: { Authorization: `Bearer ${managementKey}` } },
    );
    if (!result.ok) {
      setError(errors, 'activity', result.error);
      return { ok: false };
    }
    return { ok: true, items: result.data.data.map(mapActivityItem) };
  })();

  const keyPromise = (async () => {
    if (!runtimeKey) {
      setError(errors, 'key', 'missing_api_key');
      return null;
    }
    const result = await fetchJson<{ data: Record<string, unknown> }>(
      fetchImpl,
      KEY_URL,
      { headers: { Authorization: `Bearer ${runtimeKey}` } },
    );
    if (!result.ok) {
      setError(errors, 'key', result.error);
      return null;
    }
    return mapKeyData(result.data.data);
  })();

  const fxPromise = (async () => {
    const result = await fetchJson<{
      date: string;
      rate: number;
    }>(fetchImpl, FX_URL);
    if (!result.ok) {
      setError(errors, 'fx', result.error);
      return null;
    }
    return {
      usdRub: result.data.rate,
      asOf: result.data.date,
      source: 'frankfurter-cbr' as const,
    };
  })();

  const [credits, activityResult, key, fx, generations30d] = await Promise.all([
    creditsPromise,
    activityPromise,
    keyPromise,
    fxPromise,
    options.countBillableGenerations30d(now),
  ]);

  const usdRub = fx?.usdRub ?? null;
  const activityAvailable = activityResult.ok;

  const { spend, seriesDaily, byModel } = activityAvailable
    ? buildSpendFromActivity(activityResult.items, now, usdRub)
    : {
        spend: unavailableSpend(),
        seriesDaily: [],
        byModel: [],
      };

  const avgCostPerGeneration = activityAvailable
    ? buildAvgCostPerGeneration(
        spend.last30DaysUsd,
        generations30d,
        usdRub,
      )
    : { usd: null, rub: null, generations30d };

  const runway = activityAvailable
    ? buildRunway(
        credits?.available ?? null,
        spend.last7DaysUsd,
        spend.last30DaysUsd,
      )
    : {
        avgDailySpendUsd: null,
        daysLeft: null,
        monthsLeft: null,
        basedOn: null,
      };

  const snapshot: OpenRouterAdminSnapshot = {
    fetchedAt: now.toISOString(),
    fx,
    credits,
    key,
    spend,
    avgCostPerGeneration,
    runway,
    seriesDaily,
    byModel,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };

  if (options.cache) {
    options.cache.set(snapshot);
  } else {
    moduleCache = { at: nowMs, value: snapshot };
  }

  return snapshot;
}
