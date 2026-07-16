import axios from 'axios';
import type {
  AnalyzeFoodResponse,
  ApiError,
  DietType,
} from '@ai-food/shared-types';
import {
  appendCustomInstructions,
  appendDietPreference,
  COMPOSITION_PROMPT_RULE,
  FOOD_NAME_PROMPT_RULE,
  MICRONUTRIENTS_PROMPT_RULE,
} from './analyzeFoodApi';
import {
  isNutritionResult,
  normalizeMicronutrients,
} from './nutritionResultSchema';

export interface RefineMealContextItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
}

export interface RefineMealInput {
  correction: string;
  mealContext: {
    name?: string;
    items: RefineMealContextItem[];
  };
  imageDataUrl?: string;
  customInstructions?: string;
  dietType?: DietType;
}

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. The user provides a current meal snapshot and a free-text correction. Return ONLY a complete updated JSON NutritionResult (not a diff) with these exact fields:
{
  "foodName": string (краткое название всего блюда/приёма на русском — НЕ перечень ингредиентов через запятую),
  "calories": number (суммарные килокалории всего приёма),
  "protein": number (grams, сумма по составу),
  "carbs": number (grams, сумма по составу),
  "fat": number (grams, сумма по составу),
  "fiber": number (grams, сумма по составу),
  "confidence": number (0.0 to 1.0, your confidence in the estimate),
  "healthiness": number (integer 1–10, оценка полезности блюда для здоровья),
  "items": [
    {
      "name": string (название атомарного ингредиента/слоя на русском),
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "grams": number (optional, оценка веса в граммах; только число),
      "fiber": number (optional)
    }
  ],
  "micronutrients": [
    { "id": "vitaminA"|"vitaminC"|"vitaminD"|"vitaminB12"|"iron"|"calcium"|"folate"|"magnesium", "amount": number, "unit": "mg"|"µg" }
  ]
}
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}
${MICRONUTRIENTS_PROMPT_RULE}
Apply the user correction fully: portion scaling («съел половину»), ingredient substitutions, and free-text rewrites. Keep Russian names. Top-level calories/protein/carbs/fat/fiber must match the sum of items (and fiber items where set).
Do not include any text outside the JSON object.`;

const APP_ERROR_CODES = new Set([
  'INVALID_IMAGE',
  'RATE_LIMITED',
  'ANALYSIS_TIMEOUT',
  'ANALYSIS_FAILED',
]);

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

function mapGatewayError(error: unknown): never {
  const axiosError = error as {
    response?: { data?: { message?: string; code?: string; status?: number }; status?: number };
    message?: string;
  };

  const gatewayCode = axiosError.response?.data?.code;
  const gatewayMessage = axiosError.response?.data?.message;

  if (gatewayCode === 'RATE_LIMITED') {
    rejectApiError(
      gatewayMessage ?? 'Превышен лимит запросов. Попробуйте позже.',
      'RATE_LIMITED',
      429
    );
  }
  if (gatewayCode === 'UPSTREAM_TIMEOUT') {
    rejectApiError(
      gatewayMessage ?? 'Анализ превысил время ожидания. Попробуйте ещё раз.',
      'ANALYSIS_TIMEOUT',
      504
    );
  }
  if (gatewayCode === 'BAD_REQUEST') {
    rejectApiError(
      gatewayMessage ?? 'Не удалось обработать изображение. Попробуйте другое фото.',
      'INVALID_IMAGE',
      400
    );
  }
  if (gatewayCode && APP_ERROR_CODES.has(gatewayCode)) {
    rejectApiError(
      gatewayMessage ?? 'Анализ не удался. Попробуйте ещё раз.',
      gatewayCode,
      axiosError.response?.data?.status ?? axiosError.response?.status ?? 500
    );
  }

  rejectApiError(
    gatewayMessage ?? axiosError.message ?? 'Анализ не удался. Попробуйте ещё раз.',
    'ANALYSIS_FAILED',
    500
  );
}

function buildUserText(correction: string, mealContext: RefineMealInput['mealContext']): string {
  return [
    'Уточнение пользователя:',
    correction,
    '',
    'Текущий снимок приёма пищи (JSON):',
    JSON.stringify(mealContext),
    '',
    'Верни полный обновлённый NutritionResult в формате JSON с учётом уточнения.',
  ].join('\n');
}

export async function refineMealApi(input: RefineMealInput): Promise<AnalyzeFoodResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500
    );
  }

  const correction = input.correction.trim();
  if (!correction) {
    rejectApiError('Текст уточнения не передан.', 'ANALYSIS_FAILED', 400);
  }

  const userText = buildUserText(correction, input.mealContext);
  const imageDataUrl = input.imageDataUrl?.trim();
  const userContent =
    imageDataUrl && imageDataUrl.startsWith('data:')
      ? [
          { type: 'image_url' as const, image_url: { url: imageDataUrl } },
          { type: 'text' as const, text: userText },
        ]
      : userText;
  const systemContent = appendDietPreference(
    appendCustomInstructions(SYSTEM_PROMPT, input.customInstructions),
    input.dietType,
  );

  const startTime = Date.now();

  let response;
  try {
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      }
    );
  } catch (error) {
    mapGatewayError(error);
  }

  const processingTime = Date.now() - startTime;
  const rawContent = response.data?.choices?.[0]?.message?.content;

  if (!rawContent || typeof rawContent !== 'string') {
    rejectApiError('Анализ вернул пустой ответ.', 'ANALYSIS_FAILED', 500);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500
    );
  }

  if (!isNutritionResult(parsed)) {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500
    );
  }

  return {
    result: {
      ...parsed,
      micronutrients: normalizeMicronutrients(parsed.micronutrients),
    },
    processingTime,
  };
}
