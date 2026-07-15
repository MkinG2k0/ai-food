import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodItem, Meal } from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';
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

export interface MealNutritionPatch {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

interface DiaryState {
  meals: Meal[];
  selectedDate: Date;
  addMeal: (meal: Meal) => void;
  updateMeal: (id: string, patch: Partial<Meal>) => void;
  removeMeal: (id: string) => void;
  updateMealItem: (
    mealId: string,
    itemId: string,
    patch: Partial<FoodItem>,
  ) => void;
  removeMealItem: (mealId: string, itemId: string) => void;
  updateMealNutrition: (mealId: string, nutrition: MealNutritionPatch) => void;
  setMealPortions: (mealId: string, portions: number) => void;
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

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      selectedDate: new Date(),
      addMeal: (meal) => set((state) => ({ meals: [meal, ...state.meals] })),
      updateMeal: (id, patch) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === id ? { ...meal, ...patch } : meal
          ),
        })),
      removeMeal: (id) =>
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) })),
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
          meals[mealIndex] = {
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
          };
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
          meals[mealIndex] = {
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
          };
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
          meals[mealIndex] = {
            ...meal,
            items,
            totalCalories: sumItemCalories(items),
          };
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

          const { items, totalCalories } = scaleMealByPortionRatio(
            meal.items,
            next / current,
          );

          const meals = [...state.meals];
          meals[mealIndex] = {
            ...meal,
            portions: next,
            items,
            totalCalories,
          };
          return { meals };
        }),
      clearDiary: () => set({ meals: [] }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'ai-food-diary',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({ meals: state.meals }),
    }
  )
);
