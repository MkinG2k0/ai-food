import type { Meal } from '@ai-food/shared-types';

/**
 * Soft UI hint only — must NOT flip the card to Retry while a request is still
 * pending. Real failures/timeouts come from the analyze lifecycle.
 * @deprecated Prefer request-driven phases via resolveAnalyzeUiPhase.
 */
export const ANALYZING_STALE_MS = 120_000;

/** Definitive failures — show «Повторить», clear job id, do not keep loading. */
const TERMINAL_ANALYZE_ERROR_CODES = new Set([
  'NO_FOOD_DETECTED',
  'QUOTA_EXCEEDED',
  'JOB_NOT_FOUND',
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'ANALYSIS_TIMEOUT',
  'ANALYSIS_FAILED',
  'UPSTREAM_ERROR',
  'RATE_LIMITED',
]);

/** Soft interrupt — keep job id so resume can poll GET /analyze/:jobId. */
const RESUMABLE_ANALYZE_ERROR_CODES = new Set(['STREAM_INTERRUPTED']);

export type AnalyzeUiPhase = 'ready' | 'pending' | 'failed';

export function isTerminalMealAnalyzeError(code?: string): boolean {
  return Boolean(code && TERMINAL_ANALYZE_ERROR_CODES.has(code));
}

export function isResumableMealAnalyzeError(code?: string): boolean {
  return Boolean(code && RESUMABLE_ANALYZE_ERROR_CODES.has(code));
}

export function mealShouldResumeAnalyze(meal: Meal): boolean {
  const status = meal.status ?? 'ready';
  if (status === 'ready') return false;
  if (isTerminalMealAnalyzeError(meal.analyzeErrorCode)) return false;
  if (status === 'analyzing') return true;
  if (meal.analyzeJobId && isResumableMealAnalyzeError(meal.analyzeErrorCode)) {
    return true;
  }
  if (meal.analyzeJobId && meal.analyzeErrorCode === undefined) return true;
  // Crash recovery: analyzing → error with no code (recoverStaleAnalyzingMeals).
  if (status === 'error' && meal.analyzeErrorCode === undefined) return true;
  return false;
}

export function mealShowsAnalyzeLoader(meal: Meal): boolean {
  return mealShouldResumeAnalyze(meal);
}

export function mealShowsAnalyzeRetry(meal: Meal): boolean {
  if (mealShowsAnalyzeLoader(meal)) return false;
  return meal.status === 'error';
}

export function resolveAnalyzeUiPhase(meal: Meal): AnalyzeUiPhase {
  if (mealShowsAnalyzeLoader(meal)) return 'pending';
  if (mealShowsAnalyzeRetry(meal)) return 'failed';
  return 'ready';
}

/** Keep a soft-interrupt / crash-recovery row in analyzing so resume can settle. */
export function holdPendingAnalyzeStatus(meal: Meal): Meal {
  if (!mealShouldResumeAnalyze(meal)) return meal;
  if (meal.status === 'analyzing' && meal.analyzeErrorCode === undefined) {
    return meal;
  }
  return {
    ...meal,
    status: 'analyzing',
    analyzeErrorCode: undefined,
  };
}
