import { describe, expect, it } from 'vitest';
import type { FoodItem } from '@ai-food/shared-types';
import {
  formatItemGrams,
  itemGramShares,
  resolveMealTotalGrams,
  scaleItemsGramsToTotal,
  sumItemGrams,
} from './mealGrams';

function item(partial: Partial<FoodItem> & Pick<FoodItem, 'id' | 'grams'>): FoodItem {
  return {
    name: partial.name ?? partial.id,
    calories: partial.calories ?? 0,
    protein: partial.protein ?? 0,
    carbs: partial.carbs ?? 0,
    fat: partial.fat ?? 0,
    fiber: partial.fiber ?? 0,
    ...partial,
  };
}

describe('mealGrams', () => {
  it('sums item grams', () => {
    expect(
      sumItemGrams([item({ id: 'a', grams: 80 }), item({ id: 'b', grams: 120 })]),
    ).toBe(200);
  });

  it('resolveMealTotalGrams prefers stored totalGrams', () => {
    expect(
      resolveMealTotalGrams({
        totalGrams: 350,
        items: [item({ id: 'a', grams: 80 })],
      }),
    ).toBe(350);
  });

  it('resolveMealTotalGrams falls back to sum', () => {
    expect(
      resolveMealTotalGrams({
        items: [item({ id: 'a', grams: 80 }), item({ id: 'b', grams: 120 })],
      }),
    ).toBe(200);
  });

  it('itemGramShares keeps proportions', () => {
    expect(
      itemGramShares([item({ id: 'a', grams: 80 }), item({ id: 'b', grams: 120 })]),
    ).toEqual([0.4, 0.6]);
  });

  it('itemGramShares equal when all zero', () => {
    expect(
      itemGramShares([item({ id: 'a', grams: 0 }), item({ id: 'b', grams: 0 })]),
    ).toEqual([0.5, 0.5]);
  });

  it('scaleItemsGramsToTotal redistributes by share and round-trips', () => {
    const base = [
      item({ id: 'a', grams: 80 }),
      item({ id: 'b', grams: 120 }),
    ];
    const up = scaleItemsGramsToTotal(base, 400);
    expect(up.totalGrams).toBe(400);
    expect(up.items[0]!.grams).toBe(160);
    expect(up.items[1]!.grams).toBe(240);

    const back = scaleItemsGramsToTotal(up.items, 200);
    expect(back.totalGrams).toBe(200);
    expect(back.items[0]!.grams).toBe(80);
    expect(back.items[1]!.grams).toBe(120);
  });

  it('scaleItemsGramsToTotal preserves shares through tiny total (385→1→385)', () => {
    const base = [
      item({ id: 'fish', grams: 100 }),
      item({ id: 'roll', grams: 120 }),
      item({ id: 'beans', grams: 80 }),
      item({ id: 'salad', grams: 50 }),
      item({ id: 'rice', grams: 35 }),
    ];
    const tiny = scaleItemsGramsToTotal(base, 1);
    expect(tiny.totalGrams).toBe(1);
    expect(sumItemGrams(tiny.items)).toBe(1);

    const restored = scaleItemsGramsToTotal(tiny.items, 385);
    expect(restored.totalGrams).toBe(385);
    expect(restored.items[0]!.grams).toBe(100);
    expect(restored.items[1]!.grams).toBe(120);
    expect(restored.items[2]!.grams).toBe(80);
    expect(restored.items[3]!.grams).toBe(50);
    expect(restored.items[4]!.grams).toBe(35);
  });

  it('after editing one item share, scale uses new percentages', () => {
    const afterEdit = [
      item({ id: 'chicken', grams: 150 }),
      item({ id: 'veg', grams: 50 }),
    ];
    const scaled = scaleItemsGramsToTotal(afterEdit, 100);
    expect(scaled.items[0]!.grams).toBe(75);
    expect(scaled.items[1]!.grams).toBe(25);
    expect(sumItemGrams(scaled.items)).toBe(100);
  });

  it('small total change updates every positive-share item (0.1g steps)', () => {
    const base = [
      item({ id: 'a', grams: 80 }),
      item({ id: 'b', grams: 194 }),
      item({ id: 'c', grams: 180 }),
    ];
    const next = scaleItemsGramsToTotal(base, 455);
    expect(next.totalGrams).toBe(455);
    expect(sumItemGrams(next.items)).toBe(455);
    expect(next.items[0]!.grams).not.toBe(80);
    expect(next.items[1]!.grams).not.toBe(194);
    expect(next.items[2]!.grams).not.toBe(180);
  });

  it('formatItemGrams drops trailing .0', () => {
    expect(formatItemGrams(80)).toBe('80');
    expect(formatItemGrams(80.2)).toBe('80.2');
  });
});
