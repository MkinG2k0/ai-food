import type { ApiError } from '@ai-food/shared-types';
import { getQuotaHeaders } from '@/features/auth';

export const ANALYZE_JOB_POLL_MS = 1_500;
export const ANALYZE_JOB_DEADLINE_MS = 120_000;

export type AnalyzeJobPublic = {
  jobId: string;
  status: 'running' | 'done' | 'failed';
  content?: string;
  error?: {
    code: string;
    message: string;
    status: number;
  };
};

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchAnalyzeJobApi(
  jobId: string,
  signal?: AbortSignal,
): Promise<AnalyzeJobPublic> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;
  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${gatewayUrl}/v1/food/analyze/${jobId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(await getQuotaHeaders('other')),
      },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    }
    const message =
      error instanceof Error ? error.message : 'Не удалось получить статус анализа.';
    rejectApiError(message, 'ANALYSIS_FAILED', 500);
  }

  if (!response.ok) {
    let gatewayCode: string | undefined;
    let gatewayMessage: string | undefined;
    let gatewayStatus: number | undefined;
    try {
      const data = (await response.json()) as {
        message?: string;
        code?: string;
        status?: number;
      };
      gatewayCode = data.code;
      gatewayMessage = data.message;
      gatewayStatus = data.status;
    } catch {
      // non-JSON
    }
    rejectApiError(
      gatewayMessage ?? 'Анализ не найден.',
      gatewayCode ?? 'JOB_NOT_FOUND',
      gatewayStatus ?? response.status,
    );
  }

  return (await response.json()) as AnalyzeJobPublic;
}

/** Poll until the durable gateway job is done or failed. Returns raw XML content. */
export async function waitForAnalyzeJob(
  jobId: string,
  options?: { signal?: AbortSignal; deadlineAt?: number; pollMs?: number },
): Promise<string> {
  const deadlineAt = options?.deadlineAt ?? Date.now() + ANALYZE_JOB_DEADLINE_MS;
  const signal = options?.signal;
  const pollMs = options?.pollMs ?? ANALYZE_JOB_POLL_MS;

  while (true) {
    if (signal?.aborted) {
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    }
    if (Date.now() >= deadlineAt) {
      rejectApiError(
        'Анализ превысил время ожидания. Попробуйте ещё раз.',
        'ANALYSIS_TIMEOUT',
        504,
      );
    }

    const job = await fetchAnalyzeJobApi(jobId, signal);
    if (job.status === 'done') {
      return job.content ?? '';
    }
    if (job.status === 'failed') {
      rejectApiError(
        job.error?.message ?? 'Анализ не удался. Попробуйте ещё раз.',
        job.error?.code ?? 'ANALYSIS_FAILED',
        job.error?.status ?? 500,
      );
    }

    await sleep(pollMs, signal);
  }
}
