import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectOpenRouterAdminSnapshot,
  resetOpenRouterAdminCacheForTests,
} from './openrouterAdminClient.js';

afterEach(() => {
  resetOpenRouterAdminCacheForTests();
  vi.unstubAllGlobals();
});

describe('collectOpenRouterAdminSnapshot', () => {
  it('assembles credits, activity spend, fx, key, runway', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/credits')) {
        return new Response(
          JSON.stringify({ data: { total_credits: 23.0, total_usage: 15.64 } }),
          { status: 200 },
        );
      }
      if (String(url).includes('/activity')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                date: '2026-08-28',
                model: 'google/gemini-3-flash-preview',
                model_permaslug: 'x',
                endpoint_id: 'e',
                provider_name: 'Google',
                usage: 1.4,
                byok_usage_inference: 0,
                requests: 10,
                prompt_tokens: 100,
                completion_tokens: 50,
                reasoning_tokens: 0,
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (String(url).includes('/key')) {
        return new Response(
          JSON.stringify({
            data: {
              label: 'sk-or-v1-abc...xyz',
              usage: 1,
              usage_daily: 0.1,
              usage_weekly: 0.5,
              usage_monthly: 1,
              byok_usage: 0,
              byok_usage_daily: 0,
              byok_usage_weekly: 0,
              byok_usage_monthly: 0,
              limit: null,
              limit_remaining: null,
              limit_reset: null,
              include_byok_in_limit: false,
              is_free_tier: false,
              is_management_key: false,
              is_provisioning_key: false,
              creator_user_id: null,
              rate_limit: { requests: -1, interval: '1h', note: '' },
            },
          }),
          { status: 200 },
        );
      }
      if (String(url).includes('frankfurter')) {
        return new Response(
          JSON.stringify({
            date: '2026-08-29',
            base: 'USD',
            quote: 'RUB',
            rate: 90,
          }),
          { status: 200 },
        );
      }
      return new Response('not found', { status: 404 });
    });

    const snap = await collectOpenRouterAdminSnapshot({
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-08-29T12:00:00.000Z'),
      getEnv: (k) =>
        k === 'OPENROUTER_MANAGEMENT_API_KEY'
          ? 'mgmt'
          : k === 'OPENROUTER_API_KEY'
            ? 'runtime'
            : undefined,
      countBillableGenerations30d: async () => 70,
    });

    expect(snap.credits?.available).toBeCloseTo(7.36);
    expect(snap.fx?.usdRub).toBe(90);
    expect(snap.spend.last7DaysUsd).toBe(1.4);
    expect(snap.avgCostPerGeneration.generations30d).toBe(70);
    expect(snap.runway.basedOn).toBe('7d');
    expect(snap.errors).toBeUndefined();
  });

  it('sets errors.credits when management key missing', async () => {
    const snap = await collectOpenRouterAdminSnapshot({
      fetchImpl: vi.fn() as unknown as typeof fetch,
      getEnv: (k) =>
        k === 'OPENROUTER_API_KEY' ? 'runtime' : undefined,
      countBillableGenerations30d: async () => 0,
      now: () => new Date('2026-08-29T12:00:00.000Z'),
    });
    expect(snap.credits).toBeNull();
    expect(snap.errors?.credits).toBe('missing_management_key');
  });
});
