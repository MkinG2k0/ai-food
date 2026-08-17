import type { Meal } from '@ai-food/shared-types';

const TERMINAL_ANALYZE_ERROR_CODES = new Set([
  'NO_FOOD_DETECTED',
  'QUOTA_EXCEEDED',
  'JOB_NOT_FOUND',
  'INVALID_INPUT',
  'INVALID_IMAGE',
]);

export function isTerminalMealAnalyzeError(code?: string): boolean {
  return Boolean(code && TERMINAL_ANALYZE_ERROR_CODES.has(code));
}

export function mealShowsAnalyzeLoader(meal: Meal): boolean {
  const status = meal.status ?? 'ready';
  if (status === 'ready') return false;
  // Terminal result already landed (e.g. no-food XML) — leftover job id must not keep the skeleton.
  if (isTerminalMealAnalyzeError(meal.analyzeErrorCode)) return false;
  if (status === 'analyzing') return true;
  if (meal.analyzeJobId) return true;
  return status === 'error';
}

export function mealShowsAnalyzeRetry(meal: Meal): boolean {
  if (mealShowsAnalyzeLoader(meal)) return false;
  return meal.status === 'error';
}

export function mealShouldResumeAnalyze(meal: Meal): boolean {
  const status = meal.status ?? 'ready';
  if (status === 'ready') return false;
  if (isTerminalMealAnalyzeError(meal.analyzeErrorCode)) return false;
  if (status === 'analyzing') return true;
  if (meal.analyzeJobId) return true;
  return status === 'error';
}

/** Keep a leftover generic error in analyzing so resume/poll can settle the job. */
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
