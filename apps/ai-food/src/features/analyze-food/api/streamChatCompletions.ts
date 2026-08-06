import type { ApiError } from '@ai-food/shared-types';

export interface StreamChatCompletionsParams {
  gatewayUrl: string;
  apiKey: string;
  body: Record<string, unknown>;
  /** Abort / timeout signal */
  signal?: AbortSignal;
  /** Called with cumulative content after each delta */
  onDelta?: (accumulated: string) => void;
  /** Extra headers (quota / user token) */
  extraHeaders?: Record<string, string>;
}

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

/**
 * POST /v1/chat/completions with stream:true, parse OpenAI SSE,
 * accumulate choices[0].delta.content. Returns full assistant text.
 */
export async function streamChatCompletions(
  params: StreamChatCompletionsParams,
): Promise<string> {
  const { gatewayUrl, apiKey, body, signal, onDelta, extraHeaders } = params;

  let response: Response;
  try {
    response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...extraHeaders,
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      rejectApiError(
        'Анализ превысил время ожидания. Попробуйте ещё раз.',
        'ANALYSIS_TIMEOUT',
        504,
      );
    }
    const message =
      error instanceof Error ? error.message : 'Анализ не удался. Попробуйте ещё раз.';
    rejectApiError(message, 'ANALYSIS_FAILED', 500);
  }

  if (!response.ok) {
    await mapHttpError(response);
  }

  if (!response.body) {
    rejectApiError('Анализ вернул пустой поток.', 'ANALYSIS_FAILED', 500);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';
  let content = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trimStart();
        if (data === '[DONE]') {
          return content;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Ignore malformed SSE chunks; final XML parse will fail if needed
          continue;
        }

        const delta = extractDeltaContent(parsed);
        if (delta) {
          content += delta;
          onDelta?.(content);
        }

        const usage = (parsed as { usage?: unknown })?.usage;
        if (usage && typeof usage === 'object') {
          const u = usage as {
            prompt_tokens?: number;
            completion_tokens?: number;
            prompt_tokens_details?: {
              cached_tokens?: number;
              cache_write_tokens?: number;
            };
          };
          console.debug('[analyzeFood] usage', {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            cached_tokens: u.prompt_tokens_details?.cached_tokens,
            cache_write_tokens: u.prompt_tokens_details?.cache_write_tokens,
          });
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      rejectApiError(
        'Анализ превысил время ожидания. Попробуйте ещё раз.',
        'ANALYSIS_TIMEOUT',
        504,
      );
    }
    rejectApiError(
      error instanceof Error ? error.message : 'Поток анализа оборвался.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  return content;
}

function extractDeltaContent(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const choices = (parsed as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const delta = (choices[0] as { delta?: { content?: unknown } })?.delta;
  const content = delta?.content;
  return typeof content === 'string' && content.length > 0 ? content : null;
}

async function mapHttpError(response: Response): Promise<never> {
  let gatewayCode: string | undefined;
  let gatewayMessage: string | undefined;
  let gatewayStatus: number | undefined;

  try {
    const data = (await response.json()) as {
      message?: string;
      code?: string;
      status?: number;
      error?: { message?: string; code?: string };
    };
    gatewayCode = data.code ?? data.error?.code;
    gatewayMessage = data.message ?? data.error?.message;
    gatewayStatus = data.status;
  } catch {
    // non-JSON error body
  }

  if (gatewayCode === 'QUOTA_EXCEEDED' || response.status === 402) {
    rejectApiError(
      gatewayMessage ??
        'Бесплатный лимит генераций исчерпан. Войдите или оформите лицензию.',
      'QUOTA_EXCEEDED',
      402,
    );
  }
  if (gatewayCode === 'RATE_LIMITED' || response.status === 429) {
    rejectApiError(
      gatewayMessage ?? 'Превышен лимит запросов. Попробуйте позже.',
      'RATE_LIMITED',
      429,
    );
  }
  if (gatewayCode === 'UPSTREAM_TIMEOUT' || response.status === 504) {
    rejectApiError(
      gatewayMessage ?? 'Анализ превысил время ожидания. Попробуйте ещё раз.',
      'ANALYSIS_TIMEOUT',
      504,
    );
  }
  if (gatewayCode === 'BAD_REQUEST' || response.status === 400) {
    rejectApiError(
      gatewayMessage ?? 'Не удалось обработать изображение. Попробуйте другое фото.',
      'INVALID_IMAGE',
      400,
    );
  }

  const APP_ERROR_CODES = new Set([
    'INVALID_IMAGE',
    'INVALID_INPUT',
    'NO_FOOD_DETECTED',
    'RATE_LIMITED',
    'ANALYSIS_TIMEOUT',
    'ANALYSIS_FAILED',
    'QUOTA_EXCEEDED',
  ]);

  if (gatewayCode && APP_ERROR_CODES.has(gatewayCode)) {
    rejectApiError(
      gatewayMessage ?? 'Анализ не удался. Попробуйте ещё раз.',
      gatewayCode,
      gatewayStatus ?? response.status,
    );
  }

  rejectApiError(
    gatewayMessage ?? `Анализ не удался (${response.status}).`,
    'ANALYSIS_FAILED',
    response.status >= 400 ? response.status : 500,
  );
}
