import { describe, it, expect } from 'vitest';
import {
  extractClosedTag,
  noFoodResultToXml,
  nutritionResultToXml,
  parseNutritionXml,
  parsePartialNutritionXml,
} from './parseNutritionXml';
import type { NutritionResult } from '@ai-food/shared-types';

const sample: NutritionResult = {
  foodName: 'Бургер с сыром',
  calories: 520,
  protein: 28,
  carbs: 42,
  fat: 26,
  fiber: 3,
  confidence: 0.78,
  healthiness: 4,
  portionReference: 'тарелка',
  addedSugar: 2,
  confidenceReason: 'слои хорошо видны',
  healthinessReason: 'фастфуд',
  items: [
    { name: 'Булка', calories: 180, protein: 6, carbs: 34, fat: 3, grams: 80, fiber: 2 },
    { name: 'Котлета', calories: 250, protein: 18, carbs: 2, fat: 18, grams: 120, fiber: 0 },
  ],
  micronutrients: [
    { id: 'vitaminA', amount: 120, unit: 'µg' },
    { id: 'vitaminC', amount: 5, unit: 'mg' },
  ],
  disclaimers: ['возможное масло на сковороде'],
};

describe('parseNutritionXml', () => {
  it('parses full nutrition XML', () => {
    const xml = nutritionResultToXml({ ...sample, itemCount: 2 });
    const parsed = parseNutritionXml(xml);
    expect(parsed).toMatchObject({
      foodName: 'Бургер с сыром',
      itemCount: 2,
      calories: 520,
      protein: 28,
      addedSugar: 2,
      portionReference: 'тарелка',
      confidence: 0.78,
      confidenceReason: 'слои хорошо видны',
      healthiness: 4,
      healthinessReason: 'фастфуд',
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Булка', grams: 80 }),
      ]),
      disclaimers: ['возможное масло на сковороде'],
    });
  });

  it('parses itemCount from top-level tag', () => {
    const xml = nutritionResultToXml({ ...sample, itemCount: 2 });
    expect(parseNutritionXml(xml)).toMatchObject({ itemCount: 2 });
  });

  it('omits itemCount when absent', () => {
    const parsed = parseNutritionXml(nutritionResultToXml(sample));
    expect(parsed).not.toHaveProperty('itemCount');
  });

  it('converts amount_mg micronutrients to canonical units', () => {
    const xml = nutritionResultToXml(sample);
    const parsed = parseNutritionXml(xml);
    expect(parsed).toMatchObject({
      micronutrients: expect.arrayContaining([
        expect.objectContaining({ id: 'vitaminA', amount: 120, unit: 'µg' }),
        expect.objectContaining({ id: 'vitaminC', amount: 5, unit: 'mg' }),
      ]),
    });
  });

  it('parses noFood XML', () => {
    const parsed = parseNutritionXml(noFoodResultToXml('На фото кот'));
    expect(parsed).toEqual({ noFood: true, reason: 'На фото кот' });
  });

  it('strips markdown fences', () => {
    const xml = '```xml\n' + nutritionResultToXml(sample) + '\n```';
    expect(parseNutritionXml(xml)).toMatchObject({ foodName: 'Бургер с сыром' });
  });

  it('throws on invalid XML', () => {
    expect(() => parseNutritionXml('<analysis><foodName>x</foodName></analysis>')).toThrow();
  });
});

describe('parsePartialNutritionXml', () => {
  it('extracts closed tags progressively from totals', () => {
    const partial = parsePartialNutritionXml(
      `<analysis><foodName>Салат</foodName><totals><calories unit="kcal">200</calories><protein unit="g">`,
    );
    expect(partial.foodName).toBe('Салат');
    expect(partial.calories).toBe(200);
    expect(partial.protein).toBeUndefined();
  });

  it('extracts closed items before stream ends', () => {
    const partial = parsePartialNutritionXml(`
      <analysis>
        <foodName>Бургер</foodName>
        <totals>
          <calories unit="kcal">500</calories>
          <protein unit="g">20</protein>
          <carbs unit="g">40</carbs>
          <fat unit="g">25</fat>
          <fiber unit="g">2</fiber>
        </totals>
        <confidence value="0.8">ок</confidence>
        <healthiness value="4">фастфуд</healthiness>
        <items>
          <item>
            <name>Булка</name>
            <grams>80</grams>
            <calories unit="kcal">180</calories>
            <protein unit="g">6</protein>
            <carbs unit="g">34</carbs>
            <fat unit="g">3</fat>
            <fiber unit="g">2</fiber>
          </item>
          <item>
            <name>Котлета
    `);
    expect(partial.items).toHaveLength(1);
    expect(partial.items?.[0].name).toBe('Булка');
    // Top-level macros stay stable — not overwritten by item protein
    expect(partial.protein).toBe(20);
    expect(partial.confidence).toBe(0.8);
    expect(partial.confidenceReason).toBe('ок');
  });

  it('still reads legacy flat macros for progressive streams', () => {
    const partial = parsePartialNutritionXml(
      '<analysis><foodName>Салат</foodName><calories>200</calories><protein>',
    );
    expect(partial.foodName).toBe('Салат');
    expect(partial.calories).toBe(200);
  });
});

describe('extractClosedTag', () => {
  it('decodes entities', () => {
    expect(extractClosedTag('<t>A &amp; B</t>', 't')).toBe('A & B');
  });
});
