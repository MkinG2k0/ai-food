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
  "confidence": number (0.0–1.0),
  "healthiness": number (целое 1–10),
  "items": [
    {
      "name": string (название атомарного видимого ингредиента/слоя на русском, например «Помидоры» или «Булка»),
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "grams": number (REQUIRED — оценка веса видимого количества в граммах; только число, без суффиксов единиц),
      "fiber": number (optional)
    }
  ],
  "micronutrients": [
    { "id": "vitaminA"|"vitaminC"|"vitaminD"|"vitaminB12"|"iron"|"calcium"|"folate"|"magnesium", "amount": number, "unit": "mg"|"µg" }
  ]
}`;

const SYSTEM_PROMPT = `Ты ассистент по анализу питания по фото. Верни ТОЛЬКО один JSON-объект — без markdown и без текста снаружи.

## Если еды нет
${NO_FOOD_PROMPT_RULE}

## Если еда или напиток есть
Верни ТОЛЬКО JSON с этими полями:
${NUTRITION_JSON_SCHEMA}

## Правила названия и состава
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item (только число в граммах).
- Якоря масштаба: тарелка ≈ 22–27 см; столовая ложка; банка; бутылка 0.5 л.
- Оценивай видимую порцию на фото, а не «стандартную порцию из меню».
- Top-level calories/protein/carbs/fat/fiber = сумма соответствующих полей items (и fiber items, где задан).

## Способ приготовления
Учитывай масло, корочку, панировку, гриль, сырое vs приготовленное. Если способ неочевиден — типичный для блюда и ниже confidence.

## confidence (0.0–1.0)
- 0.85–1.0: ясно видно, порция и состав уверенны
- 0.55–0.84: частично видно / смешанная уверенность
- 0.25–0.54: неопределённо
- ниже 0.25: почти угадывание

## healthiness (целое 1–10, не медсовет)
- 1–3: ультрапереработанное / жареное / фастфуд
- 4–6: смешанное
- 7–10: цельные продукты, минимальная обработка
Это оценка полезности блюда, не медицинский совет.

## Краевые случаи
- Еда + человек на фото → анализируй еду (не noFood).
- Упаковка / меню / этикетка без видимой съедобной порции → noFood.
- Несколько блюд → все компоненты в items; foodName = название всего приёма.
- Размытое / еды нет → noFood.

## Микронутриенты
${MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Текстовые поля (foodName, items[].name, reason) — на русском. Числа — только числа. Только JSON.

## Примеры
Пример A (бургер → состав с grams; макросы ≥ 0). В реальных ответах всегда возвращай все 8 micronutrients; в примере массив может быть опущен:
{"foodName":"Бургер с сыром","calories":520,"protein":28,"carbs":42,"fat":26,"fiber":3,"confidence":0.78,"healthiness":4,"items":[{"name":"Булка","calories":180,"protein":6,"carbs":34,"fat":3,"grams":80,"fiber":2},{"name":"Котлета","calories":250,"protein":18,"carbs":2,"fat":18,"grams":120,"fiber":0},{"name":"Сыр","calories":90,"protein":4,"carbs":1,"fat":7,"grams":25,"fiber":0}]}

Пример B (человек / селфи без еды → noFood):
{"noFood":true,"reason":"На фото человек, еды нет"}`;

/** Text-description analysis: same structure, no vision. */
const TEXT_SYSTEM_PROMPT = `Ты ассистент по анализу питания по текстовому описанию (текст). Верни ТОЛЬКО один JSON-объект — без markdown и без текста снаружи.

## Если еды нет в описании
Если пользователь не описал съедобную еду или напиток — верни ТОЛЬКО JSON:
{ "noFood": true, "reason": string (кратко на русском) }
НЕ придумывай блюдо.

## Если еда или напиток описаны
Верни ТОЛЬКО JSON с этими полями:
${NUTRITION_JSON_SCHEMA}

## Правила названия и состава
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item (только число в граммах).
- Если размер порции в описании неясен — оцени типичную порцию и снизь confidence.
- Якоря: тарелка ≈ 22–27 см; столовая ложка; банка; бутылка 0.5 л.
- Top-level calories/protein/carbs/fat/fiber = сумма соответствующих полей items.

## Способ приготовления
Учитывай масло, корочку, панировку, гриль, сырое vs приготовленное, если упомянуто или типично. Если неочевидно — типичный способ и ниже confidence.

## confidence (0.0–1.0)
- 0.85–1.0: описание чёткое, порция и состав уверенны
- 0.55–0.84: частично / смешанная уверенность
- 0.25–0.54: неопределённо
- ниже 0.25: почти угадывание

## healthiness (целое 1–10, не медсовет)
- 1–3: ультрапереработанное / жареное / фастфуд
- 4–6: смешанное
- 7–10: цельные продукты, минимальная обработка
Это оценка полезности блюда, не медицинский совет.

## Краевые случаи
- Несколько блюд в описании → все компоненты в items; foodName = название всего приёма.
- Пустое / бессмысленное описание без еды → noFood.

## Микронутриенты
${MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Текстовые поля — на русском. Числа — только числа. Только JSON.

## Примеры
Пример A (бургер → состав с grams; макросы ≥ 0). В реальных ответах всегда возвращай все 8 micronutrients; в примере массив может быть опущен:
{"foodName":"Бургер с сыром","calories":520,"protein":28,"carbs":42,"fat":26,"fiber":3,"confidence":0.72,"healthiness":4,"items":[{"name":"Булка","calories":180,"protein":6,"carbs":34,"fat":3,"grams":80,"fiber":2},{"name":"Котлета","calories":250,"protein":18,"carbs":2,"fat":18,"grams":120,"fiber":0},{"name":"Сыр","calories":90,"protein":4,"carbs":1,"fat":7,"grams":25,"fiber":0}]}

Пример B (описание без еды → noFood):
{"noFood":true,"reason":"В описании нет еды"}`;

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
          text: 'Оцени видимую порцию на фото. Разбей состав на items с обязательными grams. Учти способ приготовления. Не выдумывай еду, если её нет. Верни только JSON по схеме.',
        },
      ]
    : `Пользователь описал приём пищи текстом: «${description}». Оцени порцию/типичную порцию. Разбей состав на items с обязательными grams. Учти способ приготовления, если упомянут. Не выдумывай еду, если её нет. Верни только JSON по схеме.`;

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
