import { useEffect, useRef } from 'react';
import type { Meal } from '@ai-food/shared-types';
import { ANALYZE_MEAL_CARD_FAILURE } from '../config';
import { recordClientAnalyticsEvent } from '../api';

interface TrackAnalyzeFailureUiArgs {
  meal: Meal;
  showRetry: boolean;
  analyzingStale: boolean;
}

/** Emit once per meal when Retry / stale-failure UI becomes visible. */
export function useTrackAnalyzeFailureUi({
  meal,
  showRetry,
  analyzingStale,
}: TrackAnalyzeFailureUiArgs): void {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showRetry) {
      lastKeyRef.current = null;
      return;
    }

    const inFlight = analyzingStale && meal.status !== 'error';
    const key = `${meal.id}:${inFlight ? 'inflight' : 'terminal'}:${meal.analyzeErrorCode ?? ''}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    void recordClientAnalyticsEvent({
      name: ANALYZE_MEAL_CARD_FAILURE,
      mealId: meal.id,
      errorCode: meal.analyzeErrorCode ?? null,
      inFlight,
      clientAt: new Date().toISOString(),
      payload: {
        uiVariant: inFlight ? 'stale' : 'error',
        mealStatus: meal.status ?? null,
        analyzeJobId: meal.analyzeJobId ?? null,
      },
    });
  }, [
    analyzingStale,
    meal.analyzeErrorCode,
    meal.analyzeJobId,
    meal.id,
    meal.status,
    showRetry,
  ]);
}
