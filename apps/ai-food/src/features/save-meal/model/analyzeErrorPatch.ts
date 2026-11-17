import type { ApiError, Meal } from '@ai-food/shared-types';
import {
  isResumableMealAnalyzeError,
  isTerminalMealAnalyzeError,
} from '@/entities/meal';

export function analyzeErrorPatch(
  error: unknown,
): Pick<Meal, 'status' | 'analyzeErrorCode' | 'analyzeJobId'> {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as ApiError).code === 'string'
  ) {
    const analyzeErrorCode = (error as ApiError).code;
    const keepJob = isResumableMealAnalyzeError(analyzeErrorCode);
    const clearJob =
      isTerminalMealAnalyzeError(analyzeErrorCode) || !keepJob;
    return {
      status: 'error',
      analyzeErrorCode,
      // Drop durable job id unless this is a soft interrupt that resume will poll.
      ...(clearJob ? { analyzeJobId: undefined } : {}),
    };
  }
  return { status: 'error', analyzeJobId: undefined };
}
