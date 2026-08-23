import type { ImportSourceId, ImportedMealDraft } from '../model/types';

export interface MealImportAdapter {
  id: ImportSourceId;
  detect(text: string): boolean;
  parse(text: string): ImportedMealDraft[];
}
