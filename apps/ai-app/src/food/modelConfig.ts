/** Default OpenRouter model — matches frontend DEFAULT_AI_MODEL. */
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-flash-preview';

/** Hardcoded temperature for all food routes (deterministic estimates). */
export const FOOD_TEMPERATURE = 0;

export function resolveModel(): string {
  const fromEnv = process.env.OPENROUTER_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_OPENROUTER_MODEL;
}

/** Same heuristic as frontend `isGeminiModel`. */
export function isGeminiModel(model?: string | null): boolean {
  return !!model && /gemini/i.test(model);
}
