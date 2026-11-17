import { describe, expect, it } from 'vitest';
import {
  buildAnalyzeFailureSummary,
  serializeAnalyzeFailureEvent,
} from './analyzeFailureAnalytics.js';

describe('buildAnalyzeFailureSummary', () => {
  it('counts frequency, users, devices, and error codes', () => {
    const summary = buildAnalyzeFailureSummary([
      {
        userId: 'u1',
        deviceId: 'd1',
        errorCode: null,
        inFlight: true,
      },
      {
        userId: 'u1',
        deviceId: 'd2',
        errorCode: 'NO_FOOD_DETECTED',
        inFlight: false,
      },
      {
        userId: null,
        deviceId: 'd2',
        errorCode: 'QUOTA_EXCEEDED',
        inFlight: false,
      },
    ]);

    expect(summary).toEqual({
      total: 3,
      inFlightCount: 1,
      terminalCount: 2,
      uniqueUsers: 1,
      uniqueDevices: 2,
      byErrorCode: {
        '(none)': 1,
        NO_FOOD_DETECTED: 1,
        QUOTA_EXCEEDED: 1,
      },
    });
  });
});

describe('serializeAnalyzeFailureEvent', () => {
  it('serializes dates to ISO strings', () => {
    const createdAt = new Date('2026-11-17T12:00:00.000Z');
    const clientAt = new Date('2026-11-17T11:59:00.000Z');
    expect(
      serializeAnalyzeFailureEvent({
        id: 'e1',
        name: 'analyze_meal_card_failure',
        userId: 'u1',
        deviceId: 'dev-1',
        mealId: 'm1',
        errorCode: null,
        inFlight: true,
        clientAt,
        createdAt,
        user: {
          id: 'u1',
          telegramId: '1',
          username: 'alice',
          firstName: 'A',
          lastName: null,
        },
      }),
    ).toEqual({
      id: 'e1',
      name: 'analyze_meal_card_failure',
      userId: 'u1',
      deviceId: 'dev-1',
      mealId: 'm1',
      errorCode: null,
      inFlight: true,
      clientAt: '2026-11-17T11:59:00.000Z',
      createdAt: '2026-11-17T12:00:00.000Z',
      user: {
        id: 'u1',
        telegramId: '1',
        username: 'alice',
        firstName: 'A',
        lastName: null,
      },
    });
  });
});
