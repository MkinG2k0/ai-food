import axios from 'axios';
import type { ApiError } from '@ai-food/shared-types';
import { temperatureForModel } from '@/features/settings';

const MAX_CUSTOM_CONTENT_LENGTH = 8000;

export interface MealCustomContentContextItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams?: number;
}

export interface MealCustomContentInput {
  mealContext: {
    name?: string;
    totalCalories: number;
    items: MealCustomContentContextItem[];
  };
  customInstructions: string;
  model?: string;
}

const SYSTEM_PROMPT = `Ты помощник по еде. Пользователь сохранил приём пищи и задал кастомные инструкции в настройках.

Ответь ТОЛЬКО на запросы дополнительного контента из инструкций (рецепт, острота, комментарий, советы по приготовлению и т.п.).
Предпочтения диеты/единиц измерения/стиля анализа НЕ дублируй как весь ответ, если пользователь не просил такой контент.
Если в инструкциях только предпочтения без контентного запроса — верни пустую строку (ничего не пиши).

Формат ответа:
- Чистый Markdown на русском (заголовки, списки, абзацы по необходимости).
- Без XML, без JSON, без обёртки \`\`\`markdown\`\`\`.
- Без текста вне ответа (без преамбулы вроде «Вот рецепт:» отдельно от MD — можно сразу с MD).
- Держи ответ практичным и не слишком длинным.`;

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

const APP_ERROR_CODES = new Set([
  'INVALID_IMAGE',
  'RATE_LIMITED',
  'ANALYSIS_TIMEOUT',
  'ANALYSIS_FAILED',
]);

function mapGatewayError(error: unknown): never {
  const axiosError = error as {
    response?: {
      data?: { message?: string; code?: string; status?: number };
      status?: number;
    };
    message?: string;
  };

  const gatewayCode = axiosError.response?.data?.code;
  const gatewayMessage = axiosError.response?.data?.message;

  if (gatewayCode === 'RATE_LIMITED') {
    rejectApiError(
      gatewayMessage ?? 'Превышен лимит запросов. Попробуйте позже.',
      'RATE_LIMITED',
      429,
    );
  }
  if (gatewayCode === 'UPSTREAM_TIMEOUT') {
    rejectApiError(
      gatewayMessage ?? 'Запрос превысил время ожидания. Попробуйте ещё раз.',
      'ANALYSIS_TIMEOUT',
      504,
    );
  }
  if (gatewayCode && APP_ERROR_CODES.has(gatewayCode)) {
    rejectApiError(
      gatewayMessage ?? 'Не удалось получить доп. ответ. Попробуйте ещё раз.',
      gatewayCode,
      axiosError.response?.data?.status ?? axiosError.response?.status ?? 500,
    );
  }

  rejectApiError(
    gatewayMessage ??
      axiosError.message ??
      'Не удалось получить доп. ответ. Попробуйте ещё раз.',
    'ANALYSIS_FAILED',
    500,
  );
}

/** Strip markdown code fences if the model wraps the answer. */
export function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  if (fenced) {
    return fenced[1].trim();
  }
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:markdown|md)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  return text;
}

export function normalizeCustomContent(raw: string): string {
  const stripped = stripMarkdownFences(raw);
  if (stripped.length <= MAX_CUSTOM_CONTENT_LENGTH) return stripped;
  return stripped.slice(0, MAX_CUSTOM_CONTENT_LENGTH);
}

function buildUserText(
  instructions: string,
  mealContext: MealCustomContentInput['mealContext'],
): string {
  return [
    'Кастомные инструкции пользователя:',
    instructions,
    '',
    'Контекст приёма пищи (JSON):',
    JSON.stringify(mealContext),
    '',
    'Верни Markdown-ответ на доп. запросы или пустую строку.',
  ].join('\n');
}

export async function fetchMealCustomContentApi(
  input: MealCustomContentInput,
): Promise<string> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  const instructions = input.customInstructions.trim();
  if (!instructions) {
    return '';
  }

  const userText = buildUserText(instructions, input.mealContext);

  let response;
  try {
    const temperature = temperatureForModel(input.model);
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: input.model,
        ...(temperature !== undefined ? { temperature } : {}),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userText },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      },
    );
  } catch (error) {
    mapGatewayError(error);
  }

  const rawContent = response.data?.choices?.[0]?.message?.content;
  if (rawContent == null) {
    rejectApiError('Пустой ответ доп. запроса.', 'ANALYSIS_FAILED', 500);
  }
  if (typeof rawContent !== 'string') {
    rejectApiError('Пустой ответ доп. запроса.', 'ANALYSIS_FAILED', 500);
  }

  return normalizeCustomContent(rawContent);
}
