import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';

const recordClientAnalyticsEvent = vi.fn();

vi.mock('../api', () => ({
  recordClientAnalyticsEvent: (...args: unknown[]) =>
    recordClientAnalyticsEvent(...args),
}));

import { useTrackAnalyzeFailureUi } from './useTrackAnalyzeFailureUi';

const meal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  timestamp: '2026-11-17T15:00:00.000Z',
  items: [],
  totalCalories: 0,
  status: 'analyzing',
  ...overrides,
});

describe('useTrackAnalyzeFailureUi', () => {
  beforeEach(() => {
    recordClientAnalyticsEvent.mockReset();
    recordClientAnalyticsEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits in-flight stale failure once when showRetry becomes true', () => {
    const { rerender } = renderHook(
      ({ showRetry, analyzingStale }) =>
        useTrackAnalyzeFailureUi({
          meal: meal({ analyzeJobId: 'job-1' }),
          showRetry,
          analyzingStale,
        }),
      { initialProps: { showRetry: false, analyzingStale: false } },
    );

    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();

    act(() => {
      rerender({ showRetry: true, analyzingStale: true });
    });

    expect(recordClientAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(recordClientAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'analyze_meal_card_failure',
        mealId: 'm1',
        inFlight: true,
        errorCode: null,
        payload: expect.objectContaining({ uiVariant: 'stale' }),
      }),
    );

    act(() => {
      rerender({ showRetry: true, analyzingStale: true });
    });
    expect(recordClientAnalyticsEvent).toHaveBeenCalledTimes(1);
  });

  it('emits terminal error failure for status=error retry UI', () => {
    renderHook(() =>
      useTrackAnalyzeFailureUi({
        meal: meal({
          status: 'error',
          analyzeErrorCode: 'NO_FOOD_DETECTED',
        }),
        showRetry: true,
        analyzingStale: false,
      }),
    );

    expect(recordClientAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: 'm1',
        inFlight: false,
        errorCode: 'NO_FOOD_DETECTED',
        payload: expect.objectContaining({ uiVariant: 'error' }),
      }),
    );
  });
});
