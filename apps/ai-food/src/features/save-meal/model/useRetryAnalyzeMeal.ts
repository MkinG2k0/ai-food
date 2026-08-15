import { useQueryClient } from '@tanstack/react-query';
import type { Meal } from '@ai-food/shared-types';
import {
  beginMealAnalyze,
  endMealAnalyze,
  resolveMealImageUris,
  useDiaryStore,
} from '@/entities/meal';
import { analyzeFoodApi, type PartialNutritionXml } from '@/features/analyze-food';
import { usageQueryKey } from '@/features/auth';
import { useProfileStore } from '@/features/onboarding';
import { getActiveCustomInstructions, getAnalyzeFeaturesFromSettings, useSettingsStore } from '@/features/settings';
import { loadMealImageAsFile } from '@/shared/lib';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';
import { applyPartialAnalyzeResultToMeal } from './applyPartialAnalyzeResultToMeal';
import { analyzeErrorPatch } from './analyzeErrorPatch';

const ANALYZING_PLACEHOLDER = 'Анализ…';

function usableDescription(name: string | undefined): string | null {
  const trimmed = name?.trim() ?? '';
  if (!trimmed || trimmed === ANALYZING_PLACEHOLDER) return null;
  return trimmed;
}

export function useRetryAnalyzeMeal() {
  const queryClient = useQueryClient();
  const updateMeal = useDiaryStore((s) => s.updateMeal);

  return async (mealId: string): Promise<void> => {
    const meal = useDiaryStore.getState().meals.find((m: Meal) => m.id === mealId);
    if (!meal) return;

    const imagePaths = resolveMealImageUris(meal);
    const images: File[] = [];
    for (const path of imagePaths) {
      const file = await loadMealImageAsFile(path);
      if (file) images.push(file);
    }

    const description = usableDescription(meal.name);

    if (images.length === 0 && !description) {
      updateMeal(mealId, { status: 'error' });
      return;
    }

    const customInstructions = getActiveCustomInstructions();
    const aiModel = useSettingsStore.getState().aiModel;
    const dietType = useProfileStore.getState().profile?.dietType ?? 'none';
    const features = getAnalyzeFeaturesFromSettings();

    const signal = beginMealAnalyze(mealId);
    updateMeal(mealId, {
      status: 'analyzing',
      analyzeErrorCode: undefined,
      aiModel,
    });

    try {
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
          applyPartialAnalyzeResultToMeal(
            mealId,
            partial,
            meal.items[0]?.id,
          );
        },
      };
      const response = await queryClient.fetchQuery({
        queryKey:
          images.length > 0
            ? [
                'analyze-food',
                'retry',
                mealId,
                ...images.map((f) => `${f.name}:${f.size}:${f.lastModified}`),
                customInstructions,
                dietType,
                features,
              ]
            : [
                'analyze-food',
                'retry',
                mealId,
                'text',
                description,
                customInstructions,
                dietType,
                features,
              ],
        queryFn: () =>
          images.length > 0
            ? analyzeFoodApi(
                {
                  ...(images.length === 1
                    ? { image: images[0] }
                    : { images }),
                  ...(description ? { description } : {}),
                },
                analyzeOptions,
              )
            : analyzeFoodApi(
                { description: description! },
                analyzeOptions,
              ),
      });
      if (signal.aborted) return;
      applyAnalyzeResultToMeal(mealId, response.result, meal.items[0]?.id);
      void queryClient.invalidateQueries({ queryKey: usageQueryKey });
    } catch (error) {
      if (signal.aborted) return;
      updateMeal(mealId, analyzeErrorPatch(error));
    } finally {
      endMealAnalyze(mealId);
    }
  };
}
