import axios from 'axios';
import type {
  AnalyzeFoodResponse,
  ApiError,
  DietType,
} from '@ai-food/shared-types';
import {
  DEFAULT_ANALYZE_FEATURES,
  maskNutritionResultByFeatures,
  type AnalyzeFeatures,
} from './analyzeFeatures';
import {
  isNutritionResult,
  normalizeMicronutrients,
} from './nutritionResultSchema';
import { getQuotaHeaders } from '@/features/auth';
import {
  isObviouslyIrrelevantFoodInput,
  isOffTopicRefinePayload,
  offTopicApiError,
} from '../lib/foodTopicGuard';

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
  features?: AnalyzeFeatures;
}

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

  if (gatewayCode === 'QUOTA_EXCEEDED') {
    rejectApiError(
      gatewayMessage ??
        'Бесплатный лимит генераций исчерпан. Войдите или оформите лицензию.',
      'QUOTA_EXCEEDED',
      402,
    );
  }
  if (gatewayCode === 'RATE_LIMITED') {
    rejectApiError(
      gatewayMessage ?? 'Превышен лимит запросов. Попробуйте позже.',
      'RATE_LIMITED',
      429,
    );
  }
  if (gatewayCode === 'UPSTREAM_TIMEOUT') {
    rejectApiError(
      gatewayMessage ?? 'Анализ превысил время ожидания. Попробуйте ещё раз.',
      'ANALYSIS_TIMEOUT',
      504,
    );
  }
  if (gatewayCode === 'BAD_REQUEST') {
    rejectApiError(
      gatewayMessage ?? 'Не удалось обработать изображение. Попробуйте другое фото.',
      'INVALID_IMAGE',
      400,
    );
  }
  if (gatewayCode && APP_ERROR_CODES.has(gatewayCode)) {
    rejectApiError(
      gatewayMessage ?? 'Анализ не удался. Попробуйте ещё раз.',
      gatewayCode,
      axiosError.response?.data?.status ?? axiosError.response?.status ?? 500,
    );
  }

  rejectApiError(
    gatewayMessage ?? axiosError.message ?? 'Анализ не удался. Попробуйте ещё раз.',
    'ANALYSIS_FAILED',
    500,
  );
}

/** Strip ```json fences and extract the outermost JSON object if needed. */
export function parseJsonContent(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) {
    text = fenced[1].trim();
  } else if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('Invalid JSON');
  }
}

export async function refineMealApi(input: RefineMealInput): Promise<AnalyzeFoodResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  const correction = input.correction.trim();
  if (!correction) {
    rejectApiError('Текст уточнения не передан.', 'ANALYSIS_FAILED', 400);
  }

  if (isObviouslyIrrelevantFoodInput(correction)) {
    throw offTopicApiError('edit');
  }

  const features = input.features ?? DEFAULT_ANALYZE_FEATURES;
  const startTime = Date.now();

  let response;
  try {
    response = await axios.post(
      `${gatewayUrl}/v1/food/refine`,
      {
        correction,
        mealContext: input.mealContext,
        ...(input.imageDataUrl ? { imageDataUrl: input.imageDataUrl } : {}),
        ...(input.customInstructions
          ? { customInstructions: input.customInstructions }
          : {}),
        ...(input.dietType ? { dietType: input.dietType } : {}),
        features,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(await getQuotaHeaders('refine')),
        },
        timeout: 30_000,
      },
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
    parsed = parseJsonContent(rawContent);
  } catch {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  if (isOffTopicRefinePayload(parsed)) {
    throw offTopicApiError('edit');
  }

  if (!isNutritionResult(parsed)) {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  return {
    result: maskNutritionResultByFeatures(
      {
        ...parsed,
        micronutrients: normalizeMicronutrients(parsed.micronutrients),
      },
      features,
    ),
    processingTime,
  };
}
