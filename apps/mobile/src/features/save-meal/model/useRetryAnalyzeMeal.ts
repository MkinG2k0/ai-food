import { useQueryClient } from '@tanstack/react-query';
import type { Meal } from '@ai-food/shared-types';
import {
  beginMealAnalyze,
  endMealAnalyze,
  useDiaryStore,
} from '@/entities/meal';
import { analyzeFoodApi } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import { getAnalyzeFeaturesFromSettings, useSettingsStore } from '@/features/settings';
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

    let image: File | null = null;
    if (meal.imageUri) {
      image = await loadMealImageAsFile(meal.imageUri);
    }

    const description = usableDescription(meal.name);

    if (!image && !description) {
      updateMeal(mealId, { status: 'error' });
      return;
    }

    const customInstructions = useSettingsStore.getState().customInstructions;
    const aiModel = useSettingsStore.getState().aiModel;
    const dietType = useProfileStore.getState().profile?.dietType ?? 'none';
    const features = getAnalyzeFeaturesFromSettings();

    beginMealAnalyze(mealId);
    updateMeal(mealId, {
      status: 'analyzing',
      analyzeErrorCode: undefined,
      aiModel,
    });

    try {
      const response = await queryClient.fetchQuery({
        queryKey: image
          ? [
              'analyze-food',
              'retry',
              mealId,
              image.name,
              image.size,
              image.lastModified,
              customInstructions,
              dietType,
              aiModel,
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
              aiModel,
              features,
            ],
        queryFn: () =>
          image
            ? analyzeFoodApi(image, {
                customInstructions,
                dietType,
                model: aiModel,
                features,
                onPartial: (partial) =>
                  applyPartialAnalyzeResultToMeal(
                    mealId,
                    partial,
                    meal.items[0]?.id,
                  ),
              })
            : analyzeFoodApi(
                { description: description! },
                {
                  customInstructions,
                  dietType,
                  model: aiModel,
                  features,
                  onPartial: (partial) =>
                    applyPartialAnalyzeResultToMeal(
                      mealId,
                      partial,
                      meal.items[0]?.id,
                    ),
                },
              ),
      });
      applyAnalyzeResultToMeal(mealId, response.result, meal.items[0]?.id);
    } catch (error) {
      updateMeal(mealId, analyzeErrorPatch(error));
    } finally {
      endMealAnalyze(mealId);
    }
  };
}
