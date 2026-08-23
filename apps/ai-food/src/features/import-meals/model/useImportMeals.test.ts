import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import type { ImportedMealDraft } from './types';
import {
  commitImport,
  parseImportText,
  useImportPreviewRows,
} from './useImportMeals';
import { useImportMealsStore } from './useImportMealsStore';

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

const draft: ImportedMealDraft = {
  date: '2026-07-28',
  time: '01:33',
  name: 'йогурт',
  calories: 254,
  protein: 6,
  fat: 10,
  carbs: 34,
  fiber: 1,
};

const calzenText = [
  'CalZen',
  'ДНЕВНИК ПИТАНИЯ',
  '2026 г',
  'Вт 28 июл',
  '01:33 йогурт',
  'Б 6 · Ж 10 · У 34 · Кл 1 г 254 ккал',
].join('\n');

describe('parseImportText', () => {
  beforeEach(() => {
    useImportMealsStore.getState().clear();
  });

  it('rejects unsupported text', () => {
    expect(parseImportText('MyFitnessPal export CSV')).toEqual({
      ok: false,
      error: 'unsupported',
    });
  });

  it('rejects a supported report without meals', () => {
    expect(parseImportText('CalZen\nДНЕВНИК ПИТАНИЯ')).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('stores parsed drafts and source', () => {
    expect(parseImportText(calzenText)).toEqual({ ok: true, count: 1 });
    expect(useImportMealsStore.getState()).toMatchObject({
      drafts: [draft],
      sourceId: 'calzen',
    });
  });
});

describe('commitImport', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], pendingDeletes: [] });
    useImportMealsStore.getState().clear();
    vi.mocked(queueDiarySync).mockClear();
  });

  it('adds only new drafts and queues one sync batch', () => {
    useImportMealsStore.getState().setImport([draft], 'calzen');

    const { added } = commitImport();

    expect(added).toBe(1);
    expect(useDiaryStore.getState().meals).toHaveLength(1);
    expect(queueDiarySync).toHaveBeenCalledTimes(1);
    expect(queueDiarySync).toHaveBeenCalledWith({
      mode: 'upsert',
      mealIds: [useDiaryStore.getState().meals[0].id],
    });
    expect(useImportMealsStore.getState()).toMatchObject({
      drafts: [],
      sourceId: null,
    });
  });

  it('deduplicates against the live diary on a repeated import', () => {
    useImportMealsStore.getState().setImport([draft], 'calzen');
    commitImport();
    vi.mocked(queueDiarySync).mockClear();
    useImportMealsStore.getState().setImport([draft], 'calzen');

    expect(commitImport()).toEqual({ added: 0 });
    expect(useDiaryStore.getState().meals).toHaveLength(1);
    expect(queueDiarySync).not.toHaveBeenCalled();
  });
});

describe('useImportPreviewRows', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], pendingDeletes: [] });
    useImportMealsStore.getState().clear();
  });

  it('derives duplicate status from the current diary', () => {
    useImportMealsStore.getState().setImport([draft], 'calzen');
    const { result, rerender } = renderHook(() => useImportPreviewRows());
    expect(result.current[0]?.status).toBe('new');

    act(() => {
      commitImport();
      useImportMealsStore.getState().setImport([draft], 'calzen');
    });
    rerender();

    expect(result.current[0]?.status).toBe('duplicate');
  });
});
