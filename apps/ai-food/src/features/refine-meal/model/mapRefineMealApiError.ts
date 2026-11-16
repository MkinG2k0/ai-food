import type { ApiError } from '@ai-food/shared-types';

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string' &&
    'code' in error &&
    'status' in error
  );
}

function isPayloadTooLarge(error: ApiError): boolean {
  const lower = error.message.toLowerCase();
  return (
    error.status === 413 ||
    error.code === 'PAYLOAD_TOO_LARGE' ||
    lower.includes('payload too large') ||
    lower.includes('entity too large') ||
    lower.includes('request entity too large')
  );
}

function isRefineTimeout(error: ApiError): boolean {
  const lower = error.message.toLowerCase();
  return (
    error.status === 504 ||
    error.code === 'ANALYSIS_TIMEOUT' ||
    error.code === 'ERR_CANCELED' ||
    lower.includes('timeout') ||
    lower.includes('aborted')
  );
}

export function rethrowRefineMealApiError(error: unknown): never {
  if (!isApiError(error)) {
    throw error;
  }

  if (isPayloadTooLarge(error)) {
    const mapped: ApiError = {
      message:
        'Фото слишком большое для уточнения — попробуйте ещё раз без фото или короче текст.',
      code: 'PAYLOAD_TOO_LARGE',
      status: error.status || 413,
    };
    throw mapped;
  }

  if (isRefineTimeout(error)) {
    const mapped: ApiError = {
      message: 'Сервер не успел обработать уточнение. Попробуйте ещё раз.',
      code: 'ANALYSIS_TIMEOUT',
      status: error.status === 0 ? 504 : error.status,
    };
    throw mapped;
  }

  throw error;
}