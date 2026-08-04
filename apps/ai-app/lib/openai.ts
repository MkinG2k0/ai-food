import OpenAI from 'openai';
import { createLimiter, OPENAI_CONCURRENCY } from './queue.js';

const openaiLimiter = createLimiter(OPENAI_CONCURRENCY);

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const defaultHeaders: Record<string, string> = {};
  if (process.env.OPENROUTER_HTTP_REFERER) {
    defaultHeaders['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_APP_TITLE) {
    defaultHeaders['X-Title'] = process.env.OPENROUTER_APP_TITLE;
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 30_000,
    defaultHeaders:
      Object.keys(defaultHeaders).length > 0 ? defaultHeaders : undefined,
  });
}

/**
 * Run OpenRouter upstream work under the shared in-process concurrency pool (limit 5).
 */
export function runOpenAI<T>(fn: (client: OpenAI) => Promise<T>): Promise<T> {
  return openaiLimiter.run(() => fn(getOpenAIClient()));
}

/**
 * Like runOpenAI, but the concurrency slot is held until `release()` is called
 * (use for streaming responses that outlive the initial create() promise).
 */
export function runOpenAIHeld<T>(
  fn: (client: OpenAI, release: () => void) => Promise<T>,
): Promise<T> {
  return openaiLimiter.runHeld((release) => fn(getOpenAIClient(), release));
}
