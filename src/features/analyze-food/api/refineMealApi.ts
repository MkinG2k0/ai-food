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
  ITEM_COUNT_PROMPT_RULE,
  PACKAGED_FOOD_PROMPT_RULE,
  SINGLE_ITEM_COMPOSITION_RULE,
} from './analyzeFoodApi';
import {
  applyAnalyzeFeaturesToPrompt,
  DEFAULT_ANALYZE_FEATURES,
  maskNutritionResultByFeatures,
  type AnalyzeFeatures,
} from './analyzeFeatures';
import {
  isNutritionResult,
  normalizeMicronutrients,
} from './nutritionResultSchema';
import { temperatureForModel } from '@/features/settings';
import { getQuotaHeaders } from '@/features/auth';

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
  model?: string;
  features?: AnalyzeFeatures;
}

/** JSON-oriented micronutrient rule (analyze uses XML; refine stays on JSON). */
const REFINE_MICRONUTRIENTS_RULE = `micronutrients — массив из ровно 8 объектов { "id", "amount", "unit" } для всей порции (оценка, не меддиагноз):
id ∈ vitaminA|vitaminC|vitaminD|vitaminB12|iron|calcium|folate|magnesium;
amount — неотрицательное число в канонических единицах; неизвестно → 0;
unit строго по id: vitaminA/vitaminD/vitaminB12/folate → "µg"; vitaminC/iron/calcium/magnesium → "mg".
Всегда включай все 8 id. Не возвращай качественные level.`;

const SYSTEM_PROMPT_BASE = `You are a nutrition analysis assistant. The user provides a current meal snapshot and a free-text correction. Return ONLY a complete updated JSON NutritionResult (not a diff) with these exact fields:
{
  "foodName": string (краткое название всего блюда/приёма на русском),
  "itemCount": number (поштучные единицы: 5 роллов → 5; 8 крылышек → 8; салат/паста/рагу → 1; КБЖУ на все штуки; НЕ равно длине items),
  "totalGrams": number (оценка веса всего блюда в граммах; обычно ≈ сумма items[].grams),
  "calories": number (суммарные килокалории — сумма items),
  "protein": number (grams, сумма по составу),
  "carbs": number (grams, сумма по составу),
  "addedSugar": number (optional, grams of added/free sugar within carbs, 0 if none),
  "fat": number (grams, сумма по составу),
  "fiber": number (grams, сумма по составу),
  "healthiness": number (integer 1–10),
  "healthinessReason": string (optional, короткое пояснение на русском),
  "portionReference": string (optional, якорь размера порции),
  "items": [
    {
      "name": string (название атомарного ингредиента/слоя на русском),
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "grams": number (оценка веса в граммах; только число),
      "fiber": number
    }
  ],
  "micronutrients": [
    { "id": "vitaminA"|"vitaminC"|"vitaminD"|"vitaminB12"|"iron"|"calcium"|"folate"|"magnesium", "amount": number, "unit": "mg"|"µg" }
  ],
  "disclaimers": string[] (optional, скрытые калории / неопределённость; omit if none),
  "customContent": string (optional Markdown; include ONLY when the user correction explicitly asks to update/rewrite the extra custom answer — recipe, spiciness notes, «перепиши дополнительно», etc.; otherwise OMIT this key entirely so the client keeps the previous value)
}
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}
${ITEM_COUNT_PROMPT_RULE}
${PACKAGED_FOOD_PROMPT_RULE}
${REFINE_MICRONUTRIENTS_RULE}
Apply the user correction fully: portion scaling («съел половину»), ingredient substitutions, and free-text rewrites. Keep Russian names. Top-level calories/protein/carbs/fat/fiber must match the sum of items. Update itemCount when the correction changes how many countable units were eaten (e.g. «съел 3 из 5 роллов» → itemCount=3; KBJU for those units). Update totalGrams to match the revised dish weight.
Do not include any text outside the JSON object. No markdown fences.`;

function buildRefineSystemPrompt(features: AnalyzeFeatures): string {
  return applyAnalyzeFeaturesToPrompt(
    SYSTEM_PROMPT_BASE,
    features,
    COMPOSITION_PROMPT_RULE,
    SINGLE_ITEM_COMPOSITION_RULE,
  );
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
        'Бесплатный лимит генераций исчерпан. Войдите через Telegram.',
      'QUOTA_EXCEEDED',
      402,
    );
  }
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
    'Верни полный обновлённый NutritionResult в формате JSON с учётом уточнения. Без markdown.',
  ].join('\n');
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
  const features = input.features ?? DEFAULT_ANALYZE_FEATURES;
  const systemContent = appendDietPreference(
    appendCustomInstructions(buildRefineSystemPrompt(features), input.customInstructions),
    input.dietType,
  );

  const startTime = Date.now();

  let response;
  try {
    const temperature = temperatureForModel(input.model);
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: input.model,
        ...(temperature !== undefined ? { temperature } : {}),
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
          ...(await getQuotaHeaders('refine')),
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
    parsed = parseJsonContent(rawContent);
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
