import OpenAI from 'openai';

/** OpenRouter OpenAI-compatible base URL — https://openrouter.ai/docs/quickstart */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const DEFAULT_MODEL = 'openai/gpt-4.1-mini';

const APP_REFERER = process.env.OPENROUTER_HTTP_REFERER ?? 'https://github.com/ai-food';
const APP_TITLE = process.env.OPENROUTER_APP_TITLE ?? 'AI Food';

/** Read at call time so dotenv can load before first use. */
export function getOpenRouterModel(): string {
  return toOpenRouterModel(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL);
}

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

/**
 * OpenAI SDK pointed at OpenRouter (drop-in from the quickstart).
 * Attribution headers are optional but recommended for OpenRouter rankings.
 */
export function createOpenRouterClient(): OpenAI {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    timeout: 60_000,
    defaultHeaders: {
      'HTTP-Referer': APP_REFERER,
      'X-OpenRouter-Title': APP_TITLE,
    },
  });
}

/** Headers for raw fetch to OpenRouter `/chat/completions`. */
export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': APP_REFERER,
    'X-OpenRouter-Title': APP_TITLE,
  };
}

/** Prefix bare OpenAI model ids so OpenRouter accepts them (e.g. gpt-4o → openai/gpt-4o). */
export function toOpenRouterModel(model: string): string {
  if (model.includes('/')) return model;
  return `openai/${model}`;
}
