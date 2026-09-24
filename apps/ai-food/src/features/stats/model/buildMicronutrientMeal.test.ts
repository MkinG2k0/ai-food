import { describe, expect, it } from 'vitest';
import {
  buildMicronutrientMeal,
  parseMicronutrientAmountDraft,
} from './buildMicronutrientMeal';

describe('parseMicronutrientAmountDraft', () => {
  it('parses comma decimals', () => {
    expect(parseMicronutrientAmountDraft('18,5')).toBe(18.5);
  });

  it('rejects empty and non-positive', () => {
    expect(parseMicronutrientAmountDraft('')).toBeNull();
    expect(parseMicronutrientAmountDraft('0')).toBeNull();
    expect(parseMicronutrientAmountDraft('-1')).toBeNull();
  });
});

describe('buildMicronutrientMeal', () => {
  it('creates a ready 0-kcal meal with micronutrient', () => {
    const meal = buildMicronutrientMeal({
      nutrientId: 'vitaminC',
      amount: 50,
      mealId: 'm1',
      itemId: 'i1',
      timestamp: '2026-09-24T12:00:00.000Z',
    });

    expect(meal).toMatchObject({
      id: 'm1',
      name: 'Витамин C',
      totalCalories: 0,
      status: 'ready',
      micronutrients: [{ id: 'vitaminC', amount: 50, unit: 'mg' }],
    });
    expect(meal?.items[0]?.name).toBe('Витамин C');
  });

  it('returns null for invalid amount', () => {
    expect(
      buildMicronutrientMeal({
        nutrientId: 'iron',
        amount: 0,
        mealId: 'm1',
        itemId: 'i1',
        timestamp: '2026-09-24T12:00:00.000Z',
      }),
    ).toBeNull();
  });
});
