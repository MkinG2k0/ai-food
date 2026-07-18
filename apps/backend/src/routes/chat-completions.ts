import { Router, Request, Response } from 'express';
import {
  OPENROUTER_BASE_URL,
  getOpenRouterApiKey,
  getOpenRouterModel,
  openRouterHeaders,
  toOpenRouterModel,
} from '../openrouter';

const router = Router();

interface ChatCompletionsBody {
  model?: string;
  messages?: unknown;
  response_format?: unknown;
  temperature?: number;
  max_tokens?: number;
}

function formatUpstreamError(data: unknown, status: number): {
  message: string;
  type: string;
  code: string;
  metadata?: unknown;
} {
  const raw = (data as { error?: unknown })?.error;

  if (typeof raw === 'string') {
    return {
      message: raw,
      type: 'api_error',
      code: status === 403 ? 'PROVIDER_FORBIDDEN' : 'ANALYSIS_FAILED',
    };
  }

  const errObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const message =
    typeof errObj.message === 'string'
      ? errObj.message
      : `OpenRouter request failed (${status})`;

  return {
    message,
    type: typeof errObj.type === 'string' ? errObj.type : 'api_error',
    code:
      typeof errObj.code === 'string'
        ? errObj.code
        : status === 429
          ? 'RATE_LIMITED'
          : status === 403
            ? 'PROVIDER_FORBIDDEN'
            : 'ANALYSIS_FAILED',
    metadata: errObj.metadata,
  };
}

/**
 * OpenAI-compatible proxy → OpenRouter `/api/v1/chat/completions`
 * @see https://openrouter.ai/docs/quickstart
 */
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as ChatCompletionsBody;
  if (!body?.messages) {
    res.status(400).json({
      error: { message: 'messages are required', type: 'invalid_request_error' },
    });
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    res.status(500).json({
      error: {
        message: 'OPENROUTER_API_KEY is not configured',
        type: 'api_error',
        code: 'ANALYSIS_FAILED',
      },
    });
    return;
  }

  const clientModel =
    typeof body.model === 'string' ? body.model.trim() : '';
  const model = clientModel
    ? toOpenRouterModel(clientModel)
    : getOpenRouterModel();

  const payload = {
    model,
    messages: body.messages,
    ...(body.response_format ? { response_format: body.response_format } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.max_tokens !== undefined ? { max_tokens: body.max_tokens } : {}),
    stream: false,
  };

  try {
    const upstream = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error('OpenRouter non-JSON response:', upstream.status, text.slice(0, 500));
      res.status(502).json({
        error: {
          message: 'OpenRouter returned a non-JSON response',
          type: 'api_error',
          code: 'ANALYSIS_FAILED',
        },
      });
      return;
    }

    if (!upstream.ok) {
      console.error('OpenRouter error:', upstream.status, JSON.stringify((data as { error?: unknown }).error ?? data));
      res.status(upstream.status).json({ error: formatUpstreamError(data, upstream.status) });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Chat completions proxy error:', error);

    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      res.status(504).json({
        error: { message: 'Request timed out', type: 'timeout_error', code: 'ANALYSIS_TIMEOUT' },
      });
      return;
    }

    res.status(500).json({
      error: { message: 'Chat completion failed', type: 'api_error', code: 'ANALYSIS_FAILED' },
    });
  }
});

export default router;
