import axios from 'axios';
import type {
  AnalyzeFoodResponse,
  ApiError,
  DietType,
} from '@ai-food/shared-types';
import { compressImageForAi } from '@/shared/lib';
import {
  isNoFoodResult,
  isNutritionResult,
  MICRONUTRIENTS_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
  normalizeMicronutrients,
} from './nutritionResultSchema';

/** Prompt rule: dish-level foodName ≠ composition list in items[].name */
export const FOOD_NAME_PROMPT_RULE =
  'foodName — краткое название всего блюда/приёма (например «Свежий овощной салат»); никогда comma-separated ingredient list. Запрещено писать перечень состава в foodName. items[].name — отдельные видимые компоненты состава (Помидоры, Огурцы, …), не дублируй foodName как список.';

/** Prompt rule: compound dishes → ingredient/layer items, not a single dish-level item */
export const COMPOSITION_PROMPT_RULE =
  'Состав (items[]): составные/слойные блюда (бургер, сэндвич, ролл, шаурма, пицца с начинкой, салат-сборка) всегда разбивай на видимые ингредиенты/слои. Пример: бургер → отдельные items «Булка», «Котлета», «Сыр», «Салат», «Помидор» — не оставляй один item «Гамбургер»/«Бургер», когда на фото видны слои. Простые однородные продукты (картофель фри, яблоко, стакан сока) — один item допустим. foodName = название всего приёма; items[].name = атомарные компоненты — не дублируй название составного блюда как единственный item, если видны части.';

export { MICRONUTRIENTS_PROMPT_RULE, NO_FOOD_PROMPT_RULE };

const NUTRITION_JSON_SCHEMA = `{
  "foodName": string (краткое название всего блюда/приёма на русском, например «Свежий овощной салат» — НЕ перечень ингредиентов через запятую),
  "calories": number (суммарные килокалории всего приёма),
  "protein": number (grams, сумма по составу),
  "carbs": number (grams, сумма по составу),
  "fat": number (grams, сумма по составу),
  "fiber": number (grams, сумма по составу),
  "confidence": number (0.0 to 1.0, your confidence in the estimate),
  "healthiness": number (integer 1–10, оценка полезности блюда для здоровья),
  "items": [
    {
      "name": string (название атомарного видимого ингредиента/слоя составного блюда на русском, например «Помидоры» или «Булка»),
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "grams": number (optional, оценка веса видимого количества этого ингредиента в граммах; только число, без единиц шт/порция),
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
Top-level calories/protein/carbs/fat/fiber должны совпадать с суммой соответствующих полей items (и fiber items, где задан).
Все текстовые значения полей (foodName и items[].name) пиши на русском языке.
Do not include any text outside the JSON object.`;

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyze the food in the image and return ONLY a JSON object.

${NO_FOOD_PROMPT_RULE}

If food or drink IS visible, return ONLY a JSON object with these exact fields:
${NUTRITION_JSON_SCHEMA}`;

/** Text-description analysis: same JSON schema, no vision. */
const TEXT_SYSTEM_PROMPT = `You are a nutrition analysis assistant. The user will describe in free text (текст) what they ate. Estimate nutrition for the meal they describe and return ONLY a JSON object with these exact fields:
${NUTRITION_JSON_SCHEMA}
Use typical serving sizes when the description is vague, and lower confidence accordingly.`;

export interface AnalyzeFoodInput {
  image?: File | null;
  description?: string | null;
}
export interface AnalyzeFoodOptions {
  customInstructions?: string;
  dietType?: DietType;
}

/** Append non-empty trimmed user prefs to a system prompt. */
export function appendCustomInstructions(
  systemPrompt: string,
  customInstructions?: string,
): string {
  const trimmed = customInstructions?.trim();
  if (!trimmed) return systemPrompt;
  return `${systemPrompt}\n\n## User custom instructions\nFollow these user preferences for diet, units, and response style:\n${trimmed}`;
}

const DIET_RULES: Record<Exclude<DietType, 'none'>, string> = {
  halal: [
    'The user follows a Halal (халяль) diet.',
    'Do not identify pork or other non-halal meats as the food on the photo.',
    'If the meat looks like pork (похож на свинину), prefer labeling it as chicken (курица).',
  ].join('\n'),
  vegan: [
    'The user follows a vegan (веган) diet.',
    'Do not identify animal products: no meat, fish, dairy, eggs, or honey.',
  ].join('\n'),
  vegetarian: [
    'The user follows a vegetarian (вегетарианство) diet.',
    'Do not identify meat or fish; dairy and eggs are allowed.',
  ].join('\n'),
};

/** Append structured diet preference rules; pork→chicken bias only for halal. */
export function appendDietPreference(
  systemPrompt: string,
  dietType?: DietType | null,
): string {
  if (!dietType || dietType === 'none') return systemPrompt;
  const rules = DIET_RULES[dietType];
  if (!rules) return systemPrompt;
  return `${systemPrompt}\n\n## User diet preference\n${rules}`;
}

const APP_ERROR_CODES = new Set([
  'INVALID_IMAGE',
  'INVALID_INPUT',
  'NO_FOOD_DETECTED',
  'RATE_LIMITED',
  'ANALYSIS_TIMEOUT',
  'ANALYSIS_FAILED',
]);

export const NO_FOOD_ERROR_MESSAGE =
  'На фото не обнаружена еда. Сфотографируйте блюдо и попробуйте снова.';

function resolveAnalyzeInput(input: File | AnalyzeFoodInput): {
  image: File | null;
  description: string;
} {
  if (input instanceof File) {
    return { image: input, description: '' };
  }
  return {
    image: input.image ?? null,
    description: input.description?.trim() ?? '',
  };
}
function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

function fileToDataUrl(image: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Не удалось прочитать изображение.'));
        return;
      }
      // FileReader may omit mime for empty-type blobs; normalize fallback
      if (result.startsWith('data:;') || result.startsWith('data:application/octet-stream;')) {
        const mime = image.type || 'image/jpeg';
        resolve(result.replace(/^data:[^;]*;/, `data:${mime};`));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать изображение.'));
    reader.readAsDataURL(image);
  });
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

export async function analyzeFoodApi(
  input: File | AnalyzeFoodInput,
  options?: AnalyzeFoodOptions,
): Promise<AnalyzeFoodResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500
    );
  }

  const { image, description } = resolveAnalyzeInput(input);

  if (!image && !description) {
    rejectApiError('Укажите фото или описание еды.', 'INVALID_INPUT', 400);
  }

  const systemContent = appendDietPreference(
    appendCustomInstructions(
      image ? SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT,
      options?.customInstructions,
    ),
    options?.dietType,
  );

  const imageForAi = image ? await compressImageForAi(image) : null;

  const userContent = imageForAi
    ? [
        {
          type: 'image_url' as const,
          image_url: { url: await fileToDataUrl(imageForAi) },
        },
        {
          type: 'text' as const,
          text: 'Проанализируй это изображение еды и верни данные о питании в формате JSON.',
        },
      ]
    : `Пользователь описал приём пищи текстом: «${description}». Оцени КБЖУ для типичной порции и верни данные о питании в формате JSON.`;

  const startTime = Date.now();

  let response;
  try {
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: 'gpt-4.1-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemContent },
          {
            role: 'user',
            content: userContent,
          },
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

  if (isNoFoodResult(parsed)) {
    rejectApiError(NO_FOOD_ERROR_MESSAGE, 'NO_FOOD_DETECTED', 422);
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
