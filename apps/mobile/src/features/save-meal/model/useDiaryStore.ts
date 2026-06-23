import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meal } from '@ai-food/shared-types';

interface DiaryState {
  meals: Meal[];
  addMeal: (meal: Meal) => void;
  clearDiary: () => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      meals: [],
      addMeal: (meal) => set((state) => ({ meals: [meal, ...state.meals] })),
      clearDiary: () => set({ meals: [] }),
    }),
    { name: 'ai-food-diary' }
  )
);
