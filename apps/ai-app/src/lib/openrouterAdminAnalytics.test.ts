import { describe, expect, it } from 'vitest';
import {
  buildAvgCostPerGeneration,
  buildRunway,
  buildSpendFromActivity,
} from './openrouterAdminAnalytics.js';

describe('buildSpendFromActivity', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('sums 7d and 30d USD and converts RUB', () => {
    const items = [
      {
        date: '2026-08-28',
        model: 'google/gemini-3-flash-preview',
        usage: 1.5,
        requests: 10,
        prompt_tokens: 100,
        completion_tokens: 50,
        reasoning_tokens: 0,
      },
      {
        date: '2026-08-01',
        model: 'google/gemini-3-flash-preview',
        usage: 2.0,
        requests: 5,
        prompt_tokens: 80,
        completion_tokens: 40,
        reasoning_tokens: 0,
      },
      {
        date: '2026-08-28',
        model: 'openai/gpt-4.1-mini',
        usage: 0.5,
        requests: 2,
        prompt_tokens: 20,
        completion_tokens: 10,
        reasoning_tokens: 5,
      },
    ];
    const { spend, byModel, seriesDaily } = buildSpendFromActivity(
      items,
      now,
      90,
    );
    expect(spend.last7DaysUsd).toBe(2);
    expect(spend.last30DaysUsd).toBe(4);
    expect(spend.last7DaysRub).toBe(180);
    expect(spend.requests30d).toBe(17);
    expect(byModel[0].model).toBe('google/gemini-3-flash-preview');
    expect(byModel[0].usageUsd).toBe(3.5);
    expect(seriesDaily.find((d) => d.date === '2026-08-28')?.usageUsd).toBe(2);
    expect(seriesDaily).toHaveLength(30);
    expect(seriesDaily.some((d) => d.date === '2026-08-29')).toBe(false);
  });

  it('excludes in-progress UTC day from spend totals', () => {
    const items = [
      {
        date: '2026-08-29',
        model: 'google/gemini-3-flash-preview',
        usage: 99,
        requests: 1,
        prompt_tokens: 1,
        completion_tokens: 1,
        reasoning_tokens: 0,
      },
    ];
    const { spend } = buildSpendFromActivity(items, now, 90);
    expect(spend.last7DaysUsd).toBe(0);
    expect(spend.last30DaysUsd).toBe(0);
  });
});

describe('buildAvgCostPerGeneration', () => {
  it('divides spend by generations', () => {
    expect(buildAvgCostPerGeneration(4, 100, 90)).toEqual({
      usd: 0.04,
      rub: 3.6,
      generations30d: 100,
    });
  });
  it('returns null costs when generations is 0', () => {
    expect(buildAvgCostPerGeneration(4, 0, 90).usd).toBeNull();
  });
  it('returns null costs when spend is unavailable', () => {
    expect(buildAvgCostPerGeneration(null, 100, 90)).toEqual({
      usd: null,
      rub: null,
      generations30d: 100,
    });
  });
});

describe('buildRunway', () => {
  it('uses 7d average when positive', () => {
    expect(buildRunway(7.36, 1.4, 3)).toMatchObject({
      basedOn: '7d',
      avgDailySpendUsd: 0.2,
      daysLeft: 36.8,
      monthsLeft: 36.8 / 30,
    });
  });
  it('falls back to 30d when 7d is ~0', () => {
    expect(buildRunway(30, 0, 3)).toMatchObject({
      basedOn: '30d',
      avgDailySpendUsd: 0.1,
      daysLeft: 300,
    });
  });
  it('returns null days when spend is unavailable', () => {
    expect(buildRunway(10, null, null).daysLeft).toBeNull();
  });
  it('returns null days when spend is zero', () => {
    expect(buildRunway(10, 0, 0).daysLeft).toBeNull();
  });
});
