import { describe, expect, it } from 'vitest';
import { defaultBarcodeGrams, parseServingGrams } from './fetchProductByBarcode';

describe('parseServingGrams', () => {
  it('parses plain gram servings', () => {
    expect(parseServingGrams('32 g')).toBe(32);
    expect(parseServingGrams('32g')).toBe(32);
    expect(parseServingGrams('25,5 г')).toBe(26);
  });

  it('parses grams inside descriptive text', () => {
    expect(parseServingGrams('1 bar (32 g)')).toBe(32);
    expect(parseServingGrams('1 порция 40 грамм')).toBe(40);
  });

  it('returns null when grams are missing', () => {
    expect(parseServingGrams(undefined)).toBeNull();
    expect(parseServingGrams('')).toBeNull();
    expect(parseServingGrams('1 piece')).toBeNull();
    expect(parseServingGrams('250 ml')).toBeNull();
  });
});

describe('defaultBarcodeGrams', () => {
  it('uses package serving when present', () => {
    expect(defaultBarcodeGrams({ servingSize: '32 g' })).toBe(32);
  });

  it('falls back to 100 g', () => {
    expect(defaultBarcodeGrams({})).toBe(100);
    expect(defaultBarcodeGrams({ servingSize: '1 piece' })).toBe(100);
  });
});
