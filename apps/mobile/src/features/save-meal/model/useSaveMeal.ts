import { useQueryClient } from '@tanstack/react-query';
import {
  beginMealAnalyze,
  endMealAnalyze,
  useDiaryStore,
} from '@/entities/meal';
import { analyzeFoodApi, type PartialNutritionXml } from '@/features/analyze-food';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore, getActiveCustomInstructions, getAnalyzeFeaturesFromSettings } from '@/features/settings';
import { saveMealImage, timestampForSelectedDate } from '@/shared/lib';
import type { Meal, FoodItem } from '@ai-food/shared-types';
import { applyAnalyzeResultToMeal } from './applyAnalyzeResultToMeal';
import { applyPartialAnalyzeResultToMeal } from './applyPartialAnalyzeResultToMeal';
import { analyzeErrorPatch } from './analyzeErrorPatch';

export interface SubmitFoodInput {
  image?: File | null;
  /** Several photos of the same dish (different angles). All saved to diary. */
  images?: File[] | null;
  description?: string | null;
}

function resolveSubmitImages(input: SubmitFoodInput): File[] {
  const fromList = (input.images ?? []).filter((f): f is File => f instanceof File);
  if (fromList.length > 0) return fromList;
  return input.image ? [input.image] : [];
}

export function useSaveMeal() {
  const queryClient = useQueryClient();
  const addMeal = useDiaryStore((s) => s.addMeal);
  const updateMeal = useDiaryStore((s) => s.updateMeal);

  return async (input: SubmitFoodInput) => {
    const { description } = input;
    const imageList = resolveSubmitImages(input);
    const mealId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const trimmedDescription = description?.trim() || '';
    const { selectedDate } = useDiaryStore.getState();
    const timestamp = timestampForSelectedDate(selectedDate);

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

    // Empty text without photo: manual stub, no AI call
    if (imageList.length === 0 && !trimmedDescription) {
      addMeal({
        id: mealId,
        timestamp,
        name: 'Без названия',
        items: [
          {
            ...placeholderItem,
            name: 'Без названия',
          },
        ],
        totalCalories: 0,
        portions: 1,
        status: 'ready',
      });
      return;
    }

    const imageUris =
      imageList.length > 0
        ? await Promise.all(imageList.map((file) => saveMealImage(file)))
        : undefined;
    const imageUri = imageUris?.[0];
    const aiModel = useSettingsStore.getState().aiModel;

    const pendingMeal: Meal = {
      id: mealId,
      timestamp,
      name: trimmedDescription || undefined,
      items: [placeholderItem],
      totalCalories: 0,
      portions: 1,
      imageUri,
      imageUris,
      status: 'analyzing',
      aiModel,
    };

    beginMealAnalyze(mealId);
    addMeal(pendingMeal);

    try {
      const customInstructions = getActiveCustomInstructions();
      const dietType = useProfileStore.getState().profile?.dietType ?? 'none';
      const features = getAnalyzeFeaturesFromSettings();
      const analyzeOptions = {
        customInstructions,
        dietType,
        model: aiModel,
        features,
        onPartial: (partial: PartialNutritionXml) =>
          applyPartialAnalyzeResultToMeal(mealId, partial, itemId),
      };
      const response = await queryClient.fetchQuery({
        queryKey:
          imageList.length > 0
            ? [
                'analyze-food',
                ...imageList.map(
                  (f) => `${f.name}:${f.size}:${f.lastModified}`,
                ),
                trimmedDescription,
                customInstructions,
                dietType,
                aiModel,
                features,
              ]
            : [
                'analyze-food',
                'text',
                trimmedDescription,
                customInstructions,
                dietType,
                aiModel,
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
      applyAnalyzeResultToMeal(mealId, response.result, itemId);
    } catch (error) {
      updateMeal(mealId, analyzeErrorPatch(error));
    } finally {
      endMealAnalyze(mealId);
    }
  };
}
