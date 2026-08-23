export type ImportSourceId = 'calzen';

export interface ImportedMealDraft {
  /** Local calendar date YYYY-MM-DD from report */
  date: string;
  /** HH:mm from report */
  time: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export type ImportPreviewRow = ImportedMealDraft & {
  status: 'new' | 'duplicate';
};
