import type { QueryClient } from '@tanstack/react-query';
import {
  beginMealAnalyze,
  endMealAnalyze,
  useDiaryStore,
} from '@/entities/meal';
import { usageQueryKey } from '@/features/auth';
import { analyzeFoodApi, type PartialNutritionXml } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import {
  useSettingsStore,
  getActiveCustomInstructions,
  getAnalyzeFeaturesFromSettings,
} from '@/features/settings';
import { saveMealImage, timestampForSelectedDate, appDebugLog } from '@/shared/lib';
import type { ApiError, Meal, FoodItem } from '@ai-food/shared-types';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';
import { applyPartialAnalyzeResultToMeal } from './applyPartialAnalyzeResultToMeal';
import { analyzeErrorPatch } from './analyzeErrorPatch';
import { queueDiarySync } from '@/features/diary-sync';

export interface AnalyzeMealInput {
  image?: File | null;
  images?: File[] | null;
  description?: string | null;
}

export interface AnalyzingMealHandle {
  mealId: string;
  itemId: string;
  signal: AbortSignal;
}

export function resolveSubmitImages(input: AnalyzeMealInput): File[] {
  const fromList = (input.images ?? []).filter((f): f is File => f instanceof File);
  if (fromList.length > 0) return fromList;
  return input.image ? [input.image] : [];
}

/** Insert analyzing card immediately (before JPEG encode / disk / AI). */
export function beginAnalyzingMeal(options?: {
  description?: string;
}): AnalyzingMealHandle {
  const mealId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const trimmedDescription = options?.description?.trim() || '';
  const { selectedDate } = useDiaryStore.getState();
  const timestamp = timestampForSelectedDate(selectedDate);
  const aiModel = useSettingsStore.getState().aiModel;

  const placeholderItem: FoodItem = {
    id: itemId,
    name: trimmedDescription || 'Анализ…',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    grams: 100,
  };

  const pendingMeal: Meal = {
    id: mealId,
    timestamp,
    name: trimmedDescription || undefined,
    items: [placeholderItem],
    totalCalories: 0,
    portions: 1,
    status: 'analyzing',
    aiModel,
  };

  const signal = beginMealAnalyze(mealId);
  useDiaryStore.getState().addMeal(pendingMeal);
  queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
  appDebugLog('meal', 'card created', undefined, { meal: mealId.slice(0, 8) });
  return { mealId, itemId, signal };
}

export function persistMealImages(mealId: string, imageList: File[]): void {
  const t0 = performance.now();
  void Promise.all(imageList.map((file) => saveMealImage(file)))
    .then((imageUris) => {
      appDebugLog('photo', 'persistImages', performance.now() - t0, {
        count: imageList.length,
      });
      useDiaryStore.getState().updateMeal(mealId, {
        imageUri: imageUris[0],
        imageUris,
      });
      queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
    })
    .catch((err) => {
      appDebugLog('photo', 'persistImages FAIL', performance.now() - t0, {
        err: String(err).slice(0, 40),
      });
    });
}

/** Drop optimistic card when shutter encode fails (never reached AI). */
export function cancelAnalyzingMeal(mealId: string): void {
  endMealAnalyze(mealId);
  useDiaryStore.getState().recordPendingDelete(mealId);
  queueDiarySync({ mode: 'delete', mealIds: [mealId] });
}

/** Gateway AI — runs in parallel per meal; encode/persist stay on shutter path. */
export function runMealAnalyze(
  queryClient: QueryClient,
  handle: AnalyzingMealHandle,
  input: AnalyzeMealInput,
): Promise<void> {
  if (handle.signal.aborted) return Promise.resolve();
  return runMealAnalyzeCore(queryClient, handle, input);
}

/** Native camera — persist immediately, then AI. */
export function runMealAnalyzeWithFile(
  queryClient: QueryClient,
  handle: AnalyzingMealHandle,
  file: File,
): Promise<void> {
  persistMealImages(handle.mealId, [file]);
  return runMealAnalyze(queryClient, handle, { image: file });
}

async function runMealAnalyzeCore(
  queryClient: QueryClient,
  handle: AnalyzingMealHandle,
  input: AnalyzeMealInput,
): Promise<void> {
  const { mealId, itemId, signal } = handle;
  if (signal.aborted) return;

  const imageList = resolveSubmitImages(input);
  const trimmedDescription = input.description?.trim() || '';
  const updateMeal = useDiaryStore.getState().updateMeal;
  const t0 = performance.now();

  try {
    const customInstructions = getActiveCustomInstructions();
    const dietType = useProfileStore.getState().profile?.dietType ?? 'none';
    const features = getAnalyzeFeaturesFromSettings();
    const analyzeOptions = {
      customInstructions,
      dietType,
      features,
      signal,
      onJobId: (jobId: string) => {
        updateMeal(mealId, { analyzeJobId: jobId });
      },
      onPartial: (partial: PartialNutritionXml) => {
        if (signal.aborted) return;
        applyPartialAnalyzeResultToMeal(mealId, partial, itemId);
      },
    };
    const response = await queryClient.fetchQuery({
      // AI calls are expensive; terminal errors (no-food, quota) must not auto-retry.
      retry: false,
      queryKey:
        imageList.length > 0
          ? [
              'analyze-food',
              ...imageList.map((f) => `${f.name}:${f.size}:${f.lastModified}`),
              trimmedDescription,
              customInstructions,
              dietType,
              features,
            ]
          : [
              'analyze-food',
              'text',
              trimmedDescription,
              customInstructions,
              dietType,
              features,
            ],
      queryFn: () =>
        imageList.length > 0
          ? analyzeFoodApi(
              {
                ...(imageList.length === 1
                  ? { image: imageList[0] }
                  : { images: imageList }),
                ...(trimmedDescription
                  ? { description: trimmedDescription }
                  : {}),
              },
              analyzeOptions,
            )
          : analyzeFoodApi(
              { description: trimmedDescription },
              analyzeOptions,
            ),
    });
    if (signal.aborted) return;
    applyAnalyzeResultToMeal(mealId, response.result, itemId);
    queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
    void queryClient.invalidateQueries({ queryKey: usageQueryKey });
    appDebugLog('analyze', 'ok', performance.now() - t0, {
      images: imageList.length,
    });
  } catch (error) {
    if (signal.aborted) return;
    updateMeal(mealId, analyzeErrorPatch(error));
    queueDiarySync({ mode: 'upsert', mealIds: [mealId] });
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as ApiError).code === 'string'
        ? (error as ApiError).code
        : 'UNKNOWN';
    appDebugLog(
      'analyze',
      code === 'NO_FOOD_DETECTED' ? 'noFood' : 'ERR',
      performance.now() - t0,
      { code },
    );
  } finally {
    endMealAnalyze(mealId);
  }
}
