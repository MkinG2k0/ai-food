import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodItem, Meal } from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';
import { isMealAnalyzeInFlight } from './analyzeInFlight';
import {
  sanitizeFoodItemPatch,
  scaleItemsNutrient,
  sumItemCalories,
  type NutrientKey,
} from './mealNutritionMath';
import {
  normalizePortions,
  resolveMealPortions,
  scaleMealByPortionRatio,
} from './mealPortions';
import {
  resolveMealTotalGrams,
  sanitizeGrams,
  scaleItemsGramsToTotal,
  sumItemGrams,
} from './mealGrams';

export interface MealNutritionPatch {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export type DiaryPendingDelete = { id: string; clientUpdatedAt: string };

function nowClientUpdatedAt(): string {
  return new Date().toISOString();
}

function withClientClock(meal: Meal, clock = nowClientUpdatedAt()): Meal {
  return { ...meal, clientUpdatedAt: clock };
}

interface DiaryState {
  meals: Meal[];
  /** Soft-delete clocks awaiting server sync (D-03). */
  pendingDeletes: DiaryPendingDelete[];
  selectedDate: Date;
  addMeal: (meal: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  removeMeal: (id: string) => void;
  /** Record tombstone clock then remove locally (confirm-delete). */
  recordPendingDelete: (id: string, clientUpdatedAt?: string) => void;
  updateMealItem: (
    mealId: string,
    itemId: string,
    patch: Partial<FoodItem>,
  ) => void;
  removeMealItem: (mealId: string, itemId: string) => void;
  updateMealNutrition: (mealId: string, nutrition: MealNutritionPatch) => void;
  /** Scale KBJU/grams by portions ratio (ate more/less). */
  setMealPortions: (mealId: string, portions: number) => void;
  /** Change portion count label only — does not rescale nutrients (fix AI count). */
  redefineMealPortions: (mealId: string, portions: number) => void;
  /**
   * Set dish totalGrams and redistribute item grams by current shares.
   * Does not change KBJU.
   */
  setMealTotalGrams: (mealId: string, totalGrams: number) => void;
  clearDiary: () => void;
  setSelectedDate: (date: Date) => void;
}

const NUTRIENT_KEYS: NutrientKey[] = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
];

/** Meals left as analyzing after reload/abort have no live request — flip to error for retry. */
export function recoverStaleAnalyzingMeals(): number {
  const { meals } = useDiaryStore.getState();
  let recovered = 0;
  const next = meals.map((meal) => {
    if (meal.status !== 'analyzing') return meal;
    if (isMealAnalyzeInFlight(meal.id)) return meal;
    recovered += 1;
    return { ...meal, status: 'error' as const };
  });
  if (recovered === 0) return 0;
  useDiaryStore.setState({ meals: next });
  return recovered;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      pendingDeletes: [],
      selectedDate: new Date(),
      addMeal: (meal) =>
        set((state) => ({
          meals: [withClientClock(meal), ...state.meals],
        })),
      updateMeal: (id, patch) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === id
              ? withClientClock({ ...meal, ...patch })
              : meal
          ),
        })),
      removeMeal: (id) =>
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) })),
      recordPendingDelete: (id, clientUpdatedAt) =>
        set((state) => {
          const clock = clientUpdatedAt ?? nowClientUpdatedAt();
          const pendingDeletes = [
            ...state.pendingDeletes.filter((d) => d.id !== id),
            { id, clientUpdatedAt: clock },
          ];
          return {
            pendingDeletes,
            meals: state.meals.filter((meal) => meal.id !== id),
          };
        }),
      updateMealItem: (mealId, itemId, patch) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          const itemIndex = meal.items.findIndex((i) => i.id === itemId);
          if (itemIndex === -1) return state;

          const safePatch = sanitizeFoodItemPatch(patch);
          const items = meal.items.map((item, i) =>
            i === itemIndex ? { ...item, ...safePatch } : item
          );

          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
            // Editing item grams updates that item's share and dish totalGrams
            ...(safePatch.grams !== undefined
              ? { totalGrams: sumItemGrams(items) }
              : {}),
          });
          return { meals };
        }),
      removeMealItem: (mealId, itemId) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          if (!meal.items.some((i) => i.id === itemId)) return state;

          const items = meal.items.filter((i) => i.id !== itemId);
          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
            ...(meal.totalGrams !== undefined
              ? { totalGrams: sumItemGrams(items) }
              : {}),
          });
          return { meals };
        }),
      updateMealNutrition: (mealId, nutrition) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          if (meal.items.length === 0) return state;

          let items = meal.items;
          for (const key of NUTRIENT_KEYS) {
            if (nutrition[key] !== undefined) {
              items = scaleItemsNutrient(items, key, nutrition[key]!);
            }
          }

          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
          });
          return { meals };
        }),
      setMealPortions: (mealId, portions) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          const current = resolveMealPortions(meal);
          const next = normalizePortions(portions);
          if (next === current) return state;

          const ratio = next / current;
          const { items, totalCalories } = scaleMealByPortionRatio(
            meal.items,
            ratio,
          );

          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            portions: next,
            items,
            totalCalories,
            ...(meal.totalGrams !== undefined
              ? {
                  totalGrams: sanitizeGrams(
                    resolveMealTotalGrams(meal) * ratio,
                  ),
                }
              : sumItemGrams(items) > 0
                ? { totalGrams: sumItemGrams(items) }
                : {}),
          });
          return { meals };
        }),
      redefineMealPortions: (mealId, portions) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          const next = normalizePortions(portions);
          if (next === resolveMealPortions(meal)) return state;

          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            portions: next,
          });
          return { meals };
        }),
      setMealTotalGrams: (mealId, totalGrams) =>
        set((state) => {
          const mealIndex = state.meals.findIndex((m) => m.id === mealId);
          if (mealIndex === -1) return state;

          const meal = state.meals[mealIndex];
          if (meal.items.length === 0) {
            const next = sanitizeGrams(totalGrams);
            if (next === resolveMealTotalGrams(meal)) return state;
            const meals = [...state.meals];
            meals[mealIndex] = withClientClock({ ...meal, totalGrams: next });
            return { meals };
          }

          const next = sanitizeGrams(totalGrams);
          const compositionSum = sumItemGrams(meal.items);
          // No-op only when total and every item gram already match the target
          if (
            next === meal.totalGrams &&
            next === compositionSum
          ) {
            return state;
          }

          const { items, totalGrams: scaledTotal } = scaleItemsGramsToTotal(
            meal.items,
            next,
          );

          const meals = [...state.meals];
          meals[mealIndex] = withClientClock({
            ...meal,
            items,
            totalGrams: scaledTotal,
          });
          return { meals };
        }),
      clearDiary: () => set({ meals: [], pendingDeletes: [] }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'ai-food-diary',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        meals: state.meals,
        pendingDeletes: state.pendingDeletes,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          recoverStaleAnalyzingMeals();
        });
      },
    }
  )
);
