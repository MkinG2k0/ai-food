import { describe, expect, it } from 'vitest';
import type { FoodItem } from '@ai-food/shared-types';
import {
  formatPortions,
  normalizePortions,
  resolveMealPortions,
  scaleMealByPortionRatio,
} from './mealPortions';

const items: FoodItem[] = [
  {
    id: '1',
    name: 'Tomato',
    calories: 100,
    protein: 2,
    carbs: 8,
    fat: 0,
    fiber: 4,
    grams: 50,
  },
  {
    id: '2',
    name: 'Cucumber',
    calories: 40,
    protein: 0,
    carbs: 4,
    fat: 0,
    fiber: 2,
    grams: 25,
  },
];

describe('mealPortions', () => {
  it('defaults missing portions to 1', () => {
    expect(resolveMealPortions({})).toBe(1);
  });

  it('snaps and clamps portions', () => {
    expect(normalizePortions(1.2)).toBe(1);
    expect(normalizePortions(1.3)).toBe(1.5);
    expect(normalizePortions(0)).toBe(0.5);
    expect(normalizePortions(100)).toBe(20);
    expect(normalizePortions(Number.NaN)).toBe(1);
  });

  it('formats integer and half portions', () => {
    expect(formatPortions(1)).toBe('1');
    expect(formatPortions(1.5)).toBe('1.5');
  });

  it('scales items by portion ratio', () => {
    const { items: scaled, totalCalories } = scaleMealByPortionRatio(items, 1.5);
    expect(scaled[0].calories).toBe(150);
    expect(scaled[0].grams).toBe(75);
    expect(scaled[0].fiber).toBe(6);
    expect(scaled[1].calories).toBe(60);
    expect(scaled[1].fiber).toBe(3);
    expect(totalCalories).toBe(210);
  });

  it('treats missing legacy fiber as 0 before scale', () => {
    const legacy = [
      {
        id: 'legacy',
        name: 'Legacy',
        calories: 100,
        protein: 1,
        carbs: 1,
        fat: 1,
        grams: 50,
      } as FoodItem,
    ];
    const { items: scaled } = scaleMealByPortionRatio(legacy, 2);
    expect(scaled[0].fiber).toBe(0);
  });

  it('returns same items when ratio is 1', () => {
    const result = scaleMealByPortionRatio(items, 1);
    expect(result.items).toBe(items);
    expect(result.totalCalories).toBe(140);
  });
});
