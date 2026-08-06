import type {
  AnalyzeFoodResponse,
  ApiError,
  DietType,
  NutritionResult,
} from '@ai-food/shared-types';
import { compressImageForAi } from '@/shared/lib';
import {
  getQuotaHeaders,
  resolveAnalyzeUsageKind,
} from '@/features/auth';
import {
  DEFAULT_ANALYZE_FEATURES,
  maskNutritionResultByFeatures,
  type AnalyzeFeatures,
} from './analyzeFeatures';
import {
  isNoFoodResult,
  normalizeMicronutrients,
} from './nutritionResultSchema';
import {
  parseNutritionXml,
  parsePartialNutritionXml,
  type PartialNutritionXml,
} from './parseNutritionXml';
import { streamFoodAnalyze } from './streamChatCompletions';

export type { AnalyzeFeatures };
export {
  DEFAULT_ANALYZE_FEATURES,
  SINGLE_ITEM_COMPOSITION_RULE,
  GEMINI_SINGLE_ITEM_COMPOSITION_RULE,
} from './analyzeFeatures';

export interface AnalyzeFoodInput {
  /** Single photo (legacy). Ignored when `images` is non-empty. */
  image?: File | null;
  /** Several photos of the same dish (e.g. different angles). */
  images?: File[] | null;
  description?: string | null;
}

export interface AnalyzeFoodOptions {
  customInstructions?: string;
  dietType?: DietType;
  features?: AnalyzeFeatures;
  /** Called as closed XML tags become available during the stream */
  onPartial?: (partial: PartialNutritionXml) => void;
  /** Cancels the in-flight gateway request (also respects the 30s timeout). */
  signal?: AbortSignal;
}

export type { PartialNutritionXml };

export const NO_FOOD_ERROR_MESSAGE =
  'На фото не обнаружена еда. Сфотографируйте блюдо и попробуйте снова.';

function resolveAnalyzeInput(input: File | AnalyzeFoodInput): {
  images: File[];
  description: string;
} {
  if (input instanceof File) {
    return { images: [input], description: '' };
  }
  const fromList = (input.images ?? []).filter((f): f is File => f instanceof File);
  const images =
    fromList.length > 0 ? fromList : input.image ? [input.image] : [];
  return {
    images,
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

function partialFingerprint(partial: PartialNutritionXml): string {
  return JSON.stringify(partial);
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
      500,
    );
  }

  const { images, description } = resolveAnalyzeInput(input);
  const usageKind = resolveAnalyzeUsageKind({
    hasImage: images.length > 0,
    hasDescription: Boolean(description.trim()),
  });

  if (images.length === 0 && !description) {
    rejectApiError('Укажите фото или описание еды.', 'INVALID_INPUT', 400);
  }

  const features = options?.features ?? DEFAULT_ANALYZE_FEATURES;

  let imageDataUrls: string[] = [];
  if (images.length > 0) {
    imageDataUrls = await Promise.all(
      images.map(async (file) => {
        const compressed = await compressImageForAi(file);
        return fileToDataUrl(compressed);
      }),
    );
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let lastPartialKey = '';
  const emitPartial = (accumulated: string) => {
    const partial = parsePartialNutritionXml(accumulated);
    const key = partialFingerprint(partial);
    if (key === '{}' || key === lastPartialKey) return;
    lastPartialKey = key;
    options?.onPartial?.(partial);
  };

  let rawContent: string;
  try {
    rawContent = await streamFoodAnalyze({
      gatewayUrl,
      apiKey,
      signal: controller.signal,
      onDelta: emitPartial,
      extraHeaders: await getQuotaHeaders(usageKind),
      body: {
        ...(imageDataUrls.length > 0 ? { images: imageDataUrls } : {}),
        ...(description ? { description } : {}),
        ...(options?.customInstructions
          ? { customInstructions: options.customInstructions }
          : {}),
        ...(options?.dietType ? { dietType: options.dietType } : {}),
        features,
      },
    });
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort);
    clearTimeout(timeoutId);
  }

  const processingTime = Date.now() - startTime;

  if (!rawContent || typeof rawContent !== 'string') {
    rejectApiError('Анализ вернул пустой ответ.', 'ANALYSIS_FAILED', 500);
  }

  let parsed: NutritionResult | ReturnType<typeof parseNutritionXml>;
  try {
    parsed = parseNutritionXml(rawContent);
  } catch {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  if (isNoFoodResult(parsed)) {
    rejectApiError(NO_FOOD_ERROR_MESSAGE, 'NO_FOOD_DETECTED', 422);
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
