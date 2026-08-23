import { create } from 'zustand';
import type { ImportSourceId, ImportedMealDraft } from './types';

interface ImportMealsState {
  drafts: ImportedMealDraft[];
  sourceId: ImportSourceId | null;
  setImport: (drafts: ImportedMealDraft[], sourceId: ImportSourceId) => void;
  clear: () => void;
}

export const useImportMealsStore = create<ImportMealsState>((set) => ({
  drafts: [],
  sourceId: null,
  setImport: (drafts, sourceId) => set({ drafts, sourceId }),
  clear: () => set({ drafts: [], sourceId: null }),
}));
