import type { QueryClient } from '@tanstack/react-query';
import type { ApiError, Meal } from '@ai-food/shared-types';
import {
  beginMealAnalyze,
  endMealAnalyze,
  holdPendingAnalyzeStatus,
  isMealAnalyzeInFlight,
  mealShouldResumeAnalyze,
  useDiaryStore,
} from '@/entities/meal';
import {
  parseAnalyzeFoodResponse,
  waitForAnalyzeJob,
} from '@/features/analyze-food';
import { usageQueryKey } from '@/features/auth';
import { queueDiarySync } from '@/features/diary-sync';
import { getAnalyzeFeaturesFromSettings } from '@/features/settings';
import { analyzeErrorPatch } from './analyzeErrorPatch';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as ApiError).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

async function resumeAnalyzeJob(
  meal: Meal,
  jobId: string,
  retryMeal: (mealId: string) => Promise<void>,
  queryClient?: QueryClient,
): Promise<void> {
  const signal = beginMealAnalyze(meal.id);
  let retryAfter = false;
  try {
    const features = getAnalyzeFeaturesFromSettings();
    const raw = await waitForAnalyzeJob(jobId, { signal });
    if (signal.aborted) return;
    const response = parseAnalyzeFoodResponse(raw, features, 0);
    applyAnalyzeResultToMeal(meal.id, response.result, meal.items[0]?.id);
    queueDiarySync({ mode: 'upsert', mealIds: [meal.id] });
    void queryClient?.invalidateQueries({ queryKey: usageQueryKey });
  } catch (error) {
    if (errorCode(error) === 'JOB_NOT_FOUND') {
      retryAfter = true;
    } else if (!signal.aborted) {
      useDiaryStore.getState().updateMeal(meal.id, analyzeErrorPatch(error));
      queueDiarySync({ mode: 'upsert', mealIds: [meal.id] });
    }
  } finally {
    endMealAnalyze(meal.id);
  }
  if (retryAfter) {
    await retryMeal(meal.id);
  }
}

/** Reconnect to durable gateway jobs (or retry locally) after lock / process death. */
export async function resumePendingAnalyzes(
  retryMeal: (mealId: string) => Promise<void>,
  queryClient?: QueryClient,
): Promise<void> {
  const meals = useDiaryStore.getState().meals;
  for (const meal of meals) {
    if (isMealAnalyzeInFlight(meal.id)) continue;
    const pending = holdPendingAnalyzeStatus(meal);
    if (!mealShouldResumeAnalyze(pending)) continue;
    if (
      pending.status !== meal.status ||
      pending.analyzeErrorCode !== meal.analyzeErrorCode
    ) {
      useDiaryStore.getState().updateMeal(meal.id, {
        status: pending.status,
        analyzeErrorCode: pending.analyzeErrorCode,
      });
    }

    const jobId = pending.analyzeJobId ?? meal.analyzeJobId;
    if (jobId) {
      await resumeAnalyzeJob(meal, jobId, retryMeal, queryClient);
    } else {
      await retryMeal(meal.id);
    }
  }
}
