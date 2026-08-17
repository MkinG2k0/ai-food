import type { ApiError, Meal } from '@ai-food/shared-types';
import { isTerminalMealAnalyzeError } from '@/entities/meal';

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
    return {
      status: 'error',
      analyzeErrorCode,
      // Drop durable job id so the card is not treated as still in-flight.
      ...(isTerminalMealAnalyzeError(analyzeErrorCode)
        ? { analyzeJobId: undefined }
        : {}),
    };
  }
  return { status: 'error' };
}
