import axios from 'axios';
import type { ApiError } from '@ai-food/shared-types';
import { getQuotaHeaders } from '@/features/auth';
import { temperatureForModel } from '@/features/settings';
import {
  isObviouslyIrrelevantFoodInput,
  isOffTopicAskResponse,
  offTopicApiError,
} from '../lib/foodTopicGuard';

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
  /** Settings preferences / content requests (initial slide). */
  customInstructions?: string;
  /** Follow-up question about this meal (appends a new carousel slide). */
  question?: string;
  model?: string;
}

const SETTINGS_SYSTEM_PROMPT = `Ты помощник по еде. Пользователь сохранил приём пищи и задал кастомные инструкции в настройках.

Ответь ТОЛЬКО на запросы дополнительного контента из инструкций (рецепт, острота, комментарий, советы по приготовлению и т.п.).
Предпочтения диеты/единиц измерения/стиля анализа НЕ дублируй как весь ответ, если пользователь не просил такой контент.
Если в инструкциях только предпочтения без контентного запроса — верни пустую строку (ничего не пиши).

Формат ответа:
- Чистый Markdown на русском (заголовки, списки, абзацы по необходимости).
- Без XML, без JSON, без обёртки \`\`\`markdown\`\`\`.
- Без текста вне ответа (без преамбулы вроде «Вот рецепт:» отдельно от MD — можно сразу с MD).
- Держи ответ практичным и не слишком длинным.`;

const QUESTION_SYSTEM_PROMPT = `Ты помощник по еде. Пользователь задаёт ОДИН вопрос о конкретном приёме пищи.

Ответь ТОЛЬКО на этот вопрос по контексту блюда (состав, КБЖУ, приготовление, ингредиенты, аллергены, порция, советы по еде).
Не добавляй рецепт, ингредиенты для готовки, шаги приготовления, общую «оценку блюда» и другие разделы, если пользователь об этом не спрашивал.
Если вопрос оценочный (энергия, сытость, острота и т.п.) — дай краткую обоснованную оценку в Markdown, без лишних блоков.

Если вопрос НЕ о этом блюде/еде (математика, код, личность ассистента, политика, бессмыслица, мусор) — ответь РОВНО одним токеном OFF_TOPIC и больше ничего. Без Markdown, без пояснений.

Формат ответа (когда вопрос по теме):
- Чистый Markdown на русском, короткий и по делу.
- Без XML, без JSON, без обёртки \`\`\`markdown\`\`\`.`;

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

function buildSettingsUserText(
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

function buildQuestionUserText(
  question: string,
  mealContext: MealCustomContentInput['mealContext'],
): string {
  // Do not attach settings customInstructions — they often ask for a recipe
  // and the model would repeat it instead of answering only the question.
  return [
    'Вопрос пользователя:',
    question,
    '',
    'Контекст приёма пищи (JSON):',
    JSON.stringify(mealContext),
    '',
    'Верни Markdown-ответ ТОЛЬКО на этот вопрос о блюде/еде. Не добавляй рецепт и посторонние разделы.',
    'Если вопрос не о этом блюде/еде — ответь ровно OFF_TOPIC.',
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

  const question = input.question?.trim() ?? '';
  const instructions = input.customInstructions?.trim() ?? '';

  if (!question && !instructions) {
    return '';
  }

  const isQuestion = question.length > 0;
  if (isQuestion && isObviouslyIrrelevantFoodInput(question)) {
    throw offTopicApiError('ask');
  }

  const systemContent = isQuestion
    ? QUESTION_SYSTEM_PROMPT
    : SETTINGS_SYSTEM_PROMPT;
  const userText = isQuestion
    ? buildQuestionUserText(question, input.mealContext)
    : buildSettingsUserText(instructions, input.mealContext);

  let response;
  try {
    const temperature = temperatureForModel(input.model);
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: input.model,
        ...(temperature !== undefined ? { temperature } : {}),
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userText },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(await getQuotaHeaders('other')),
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

  const normalized = normalizeCustomContent(rawContent);
  if (isQuestion && isOffTopicAskResponse(normalized)) {
    throw offTopicApiError('ask');
  }

  return normalized;
}
