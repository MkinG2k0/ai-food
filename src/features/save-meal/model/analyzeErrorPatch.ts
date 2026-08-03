import type { ApiError, Meal } from '@ai-food/shared-types';

export function analyzeErrorPatch(error: unknown): Pick<Meal, 'status' | 'analyzeErrorCode'> {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as ApiError).code === 'string'
  ) {
    return { status: 'error', analyzeErrorCode: (error as ApiError).code };
  }
  return { status: 'error' };
}
