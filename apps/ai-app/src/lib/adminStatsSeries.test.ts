import { describe, expect, it } from 'vitest';
import {
  buildAdminStatsSeries,
  clampSeriesDays,
  utcDayKey,
} from './adminStatsSeries.js';
import { GATEWAY_REQUEST_TYPES } from './gatewayRequestTypes.js';

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
});
