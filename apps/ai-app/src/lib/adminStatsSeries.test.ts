import { describe, expect, it } from 'vitest';
import {
  buildAdminStatsSeries,
  clampSeriesDays,
  utcDayKey,
} from './adminStatsSeries.js';
import { GATEWAY_REQUEST_TYPES } from './gatewayRequestTypes.js';
import { p50, p95 } from './percentile.js';

function emptyRequestByType(): Record<string, number> {
  return Object.fromEntries(GATEWAY_REQUEST_TYPES.map((t) => [t, 0]));
}

describe('clampSeriesDays', () => {
  it('defaults to 30', () => {
    expect(clampSeriesDays(undefined)).toBe(30);
    expect(clampSeriesDays('')).toBe(30);
    expect(clampSeriesDays('nope')).toBe(30);
  });

  it('clamps to 7..90', () => {
    expect(clampSeriesDays(3)).toBe(7);
    expect(clampSeriesDays(7)).toBe(7);
    expect(clampSeriesDays(30)).toBe(30);
    expect(clampSeriesDays(90)).toBe(90);
    expect(clampSeriesDays(100)).toBe(90);
    expect(clampSeriesDays('45')).toBe(45);
  });
});

describe('buildAdminStatsSeries', () => {
  // Fixed "now": 2026-08-07T12:00:00.000Z → last day key 2026-08-07
  const now = new Date('2026-08-07T12:00:00.000Z');

  it('returns days-length arrays with UTC keys ending at today', () => {
    const result = buildAdminStatsSeries({
      days: 7,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [],
    });
    expect(result.days).toBe(7);
    expect(result.series.users).toHaveLength(7);
    expect(result.series.users[6]?.date).toBe('2026-08-07');
    expect(result.series.users[0]?.date).toBe('2026-08-01');
    expect(result.series.users.every((p) => p.new === 0 && p.total === 0)).toBe(
      true,
    );
  });

  it('counts new users and absolute cumulative totals', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [
        new Date('2026-07-01T00:00:00.000Z'), // before window → total base
        new Date('2026-08-05T10:00:00.000Z'),
        new Date('2026-08-07T01:00:00.000Z'),
        new Date('2026-08-07T23:00:00.000Z'),
      ],
      payments: [],
      usageEvents: [],
      gatewayRequests: [],
    });
    // days: 08-05, 08-06, 08-07
    expect(result.series.users).toEqual([
      { date: '2026-08-05', new: 1, total: 2 },
      { date: '2026-08-06', new: 0, total: 2 },
      { date: '2026-08-07', new: 2, total: 4 },
    ]);
  });

  it('sums confirmed payment day amounts and absolute cumulative', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [],
      payments: [
        { amount: 1000, at: new Date('2026-07-01T00:00:00.000Z') },
        { amount: 500, at: new Date('2026-08-06T12:00:00.000Z') },
        { amount: 200, at: new Date('2026-08-07T12:00:00.000Z') },
      ],
      usageEvents: [],
      gatewayRequests: [],
    });
    expect(result.series.payments).toEqual([
      { date: '2026-08-05', sumKopecks: 0, totalKopecks: 1000 },
      { date: '2026-08-06', sumKopecks: 500, totalKopecks: 1500 },
      { date: '2026-08-07', sumKopecks: 200, totalKopecks: 1700 },
    ]);
  });

  it('buckets analyze* and refine usage separately', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [
        { kind: 'analyze_photo', at: new Date('2026-08-06T01:00:00.000Z') },
        { kind: 'analyze', at: new Date('2026-08-07T01:00:00.000Z') },
        { kind: 'refine', at: new Date('2026-08-07T02:00:00.000Z') },
        { kind: 'manual', at: new Date('2026-08-07T03:00:00.000Z') },
      ],
      gatewayRequests: [],
    });
    expect(result.series.usage).toEqual([
      { date: '2026-08-06', analyze: 1, refine: 0 },
      { date: '2026-08-07', analyze: 1, refine: 1 },
    ]);
  });

  it('buckets gateway request types per day into series.requests', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [
        { type: 'food_analyze', at: new Date('2026-08-06T01:00:00.000Z') },
        { type: 'food_ask', at: new Date('2026-08-07T01:00:00.000Z') },
        { type: 'food_ask', at: new Date('2026-08-07T02:00:00.000Z') },
        { type: 'unknown_type', at: new Date('2026-08-07T03:00:00.000Z') },
      ],
    });
    expect(result.series.requests).toEqual([
      {
        date: '2026-08-06',
        total: 1,
        byType: { ...emptyRequestByType(), food_analyze: 1 },
      },
      {
        date: '2026-08-07',
        total: 2,
        byType: { ...emptyRequestByType(), food_ask: 2 },
      },
    ]);
  });

  it('returns zeroed reliability series matching days when gateway input empty', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [],
    });
    expect(result.series.reliability).toHaveLength(3);
    expect(result.series.reliability).toEqual([
      {
        date: '2026-08-05',
        total: 0,
        errorCount: 0,
        errorRate: 0,
        p50DurationMs: null,
        p95DurationMs: null,
        p50TtfbMs: null,
        p95TtfbMs: null,
      },
      {
        date: '2026-08-06',
        total: 0,
        errorCount: 0,
        errorRate: 0,
        p50DurationMs: null,
        p95DurationMs: null,
        p50TtfbMs: null,
        p95TtfbMs: null,
      },
      {
        date: '2026-08-07',
        total: 0,
        errorCount: 0,
        errorRate: 0,
        p50DurationMs: null,
        p95DurationMs: null,
        p50TtfbMs: null,
        p95TtfbMs: null,
      },
    ]);
  });

  it('aggregates daily total, errorCount, and errorRate for mixed ok/error', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [
        {
          type: 'food_ask',
          at: new Date('2026-08-07T01:00:00.000Z'),
          ok: true,
          durationMs: 100,
          ttfbMs: 10,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T02:00:00.000Z'),
          ok: false,
          durationMs: null,
          ttfbMs: null,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T03:00:00.000Z'),
          ok: false,
          durationMs: 50,
          ttfbMs: 5,
        },
        {
          type: 'food_analyze',
          at: new Date('2026-08-06T01:00:00.000Z'),
          ok: true,
          durationMs: 200,
          ttfbMs: 20,
        },
      ],
    });
    expect(result.series.reliability[0]).toMatchObject({
      date: '2026-08-06',
      total: 1,
      errorCount: 0,
      errorRate: 0,
    });
    expect(result.series.reliability[1]).toMatchObject({
      date: '2026-08-07',
      total: 3,
      errorCount: 2,
      errorRate: 2 / 3,
    });
  });

  it('computes latency percentiles over ok rows with non-null values only', () => {
    const durations = [100, 200, 300, 400];
    const ttfbs = [10, 20, 30, 40];
    const result = buildAdminStatsSeries({
      days: 1,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [
        {
          type: 'food_ask',
          at: new Date('2026-08-07T01:00:00.000Z'),
          ok: true,
          durationMs: 100,
          ttfbMs: 10,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T02:00:00.000Z'),
          ok: true,
          durationMs: 200,
          ttfbMs: 20,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T03:00:00.000Z'),
          ok: true,
          durationMs: 300,
          ttfbMs: 30,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T04:00:00.000Z'),
          ok: true,
          durationMs: 400,
          ttfbMs: 40,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T05:00:00.000Z'),
          ok: false,
          durationMs: 9999,
          ttfbMs: 9999,
        },
        {
          type: 'food_ask',
          at: new Date('2026-08-07T06:00:00.000Z'),
          ok: true,
          durationMs: null,
          ttfbMs: null,
        },
      ],
    });
    const point = result.series.reliability[0]!;
    expect(point.p50DurationMs).toBe(p50(durations));
    expect(point.p95DurationMs).toBe(p95(durations));
    expect(point.p50TtfbMs).toBe(p50(ttfbs));
    expect(point.p95TtfbMs).toBe(p95(ttfbs));
  });

  it('keeps existing series keys backward compatible', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
      gatewayRequests: [
        {
          type: 'food_ask',
          at: new Date('2026-08-07T01:00:00.000Z'),
          ok: true,
          durationMs: 100,
          ttfbMs: 10,
        },
      ],
    });
    expect(result.series).toMatchObject({
      users: expect.any(Array),
      payments: expect.any(Array),
      usage: expect.any(Array),
      requests: expect.any(Array),
      reliability: expect.any(Array),
    });
    expect(result.series.users).toHaveLength(2);
    expect(result.series.payments).toHaveLength(2);
    expect(result.series.usage).toHaveLength(2);
    expect(result.series.requests).toHaveLength(2);
    expect(result.series.reliability).toHaveLength(2);
  });
});
