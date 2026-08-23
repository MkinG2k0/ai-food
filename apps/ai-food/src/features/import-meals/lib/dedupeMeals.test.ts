import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { markImportDuplicates } from './dedupeMeals';
import type { ImportedMealDraft } from '../model/types';
import { timestampFromLocalDateTime } from '../model/timestampFromLocalDateTime';

const draft: ImportedMealDraft = {
  date: '2026-07-28',
  time: '01:33',
  name: 'Йогурт',
  calories: 254,
  protein: 6,
  fat: 10,
  carbs: 34,
  fiber: 1,
};

function mealStub(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'existing',
    timestamp: timestampFromLocalDateTime('2026-07-28', '01:33'),
    name: 'йогурт',
    items: [],
    totalCalories: 254,
    status: 'ready',
    ...overrides,
  };
}

describe('markImportDuplicates', () => {
  it('marks matching day+time+name+calories as duplicate', () => {
    const rows = markImportDuplicates([draft], [mealStub()]);
    expect(rows[0]?.status).toBe('duplicate');
  });

  it('keeps new when calories differ', () => {
    const rows = markImportDuplicates([draft], [mealStub({ totalCalories: 255 })]);
    expect(rows[0]?.status).toBe('new');
  });
});
