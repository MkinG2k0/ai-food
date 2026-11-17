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

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as ApiError).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as ApiError).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/** Fatal for this poll loop — do not keep asking the gateway. */
function isFatalPollError(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'JOB_NOT_FOUND') return true;
  if (code === 'ANALYSIS_TIMEOUT') return true;
  // Client abort / cancel (also mapped as ANALYSIS_FAILED + 499 in places).
  if (code === 'ANALYSIS_FAILED' && errorStatus(error) === 499) return true;
  return false;
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

    let job: AnalyzeJobPublic;
    try {
      job = await fetchAnalyzeJobApi(jobId, signal);
    } catch (error) {
      if (signal?.aborted) {
        rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
      }
      if (isFatalPollError(error)) {
        throw error;
      }
      // Transient transport / 5xx on GET — job may still be running; keep the id
      // by continuing to poll instead of surfacing ANALYSIS_FAILED upstream.
      await sleep(pollMs, signal);
      continue;
    }

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
