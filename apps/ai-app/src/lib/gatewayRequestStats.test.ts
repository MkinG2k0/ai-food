import { describe, expect, it } from 'vitest';
import { countWindow, statsByType } from './gatewayRequestStats.js';

const base = new Date('2026-08-12T12:00:00.000Z');

describe('gatewayRequestStats', () => {
  it('countWindow splits ok/error', () => {
    expect(
      countWindow([
        { type: 'models', ok: true, ttfbMs: 1, durationMs: 1, createdAt: base },
        { type: 'models', ok: false, ttfbMs: null, durationMs: 2, createdAt: base },
      ]),
    ).toEqual({ count: 2, okCount: 1, errorCount: 1 });
  });

  it('statsByType computes latency only from ok samples', () => {
    const rows = [
      { type: 'food_ask', ok: true, ttfbMs: 10, durationMs: 10, createdAt: base },
      { type: 'food_ask', ok: true, ttfbMs: 30, durationMs: 30, createdAt: base },
      { type: 'food_ask', ok: false, ttfbMs: null, durationMs: 99, createdAt: base },
    ];
    const ask = statsByType(rows).find((r) => r.type === 'food_ask')!;
    expect(ask.count).toBe(3);
    expect(ask.okCount).toBe(2);
    expect(ask.errorCount).toBe(1);
    expect(ask.avgDurationMs).toBe(20);
    expect(ask.p50DurationMs).toBe(10); // nearest-rank on [10,30]
    expect(ask.avgTtfbMs).toBe(20);
  });
});
