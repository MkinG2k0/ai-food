import { useMemo } from 'react';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import { markImportDuplicates } from '../lib/dedupeMeals';
import { buildImportedMeal } from './buildImportedMeal';
import { detectSource, getAdapter } from './detectSource';
import type { ImportPreviewRow } from './types';
import { useImportMealsStore } from './useImportMealsStore';

export type ParseImportTextResult =
  | { ok: true; count: number }
  | { ok: false; error: 'unsupported' | 'empty' };

export function parseImportText(text: string): ParseImportTextResult {
  const sourceId = detectSource(text);
  if (!sourceId) return { ok: false, error: 'unsupported' };

  const drafts = getAdapter(sourceId)!.parse(text);
  if (drafts.length === 0) return { ok: false, error: 'empty' };

  useImportMealsStore.getState().setImport(drafts, sourceId);
  return { ok: true, count: drafts.length };
}

export function commitImport(): { added: number } {
  const { drafts, clear } = useImportMealsStore.getState();
  const { meals, addMeal } = useDiaryStore.getState();
  const newRows = markImportDuplicates(drafts, meals).filter(
    (row) => row.status === 'new',
  );
  const mealIds: string[] = [];

  for (const row of newRows) {
    const meal = buildImportedMeal(row, {
      mealId: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
    });
    if (!meal) continue;

    addMeal(meal);
    mealIds.push(meal.id);
  }

  if (mealIds.length > 0) {
    queueDiarySync({ mode: 'upsert', mealIds });
  }
  clear();

  return { added: mealIds.length };
}

export function useImportPreviewRows(): ImportPreviewRow[] {
  const drafts = useImportMealsStore((state) => state.drafts);
  const meals = useDiaryStore((state) => state.meals);

  return useMemo(
    () => markImportDuplicates(drafts, meals),
    [drafts, meals],
  );
}
