import { describe, expect, it, beforeEach } from 'vitest';
import {
  formatInputUnitLabel,
  inputUnitsFor,
  MICRONUTRIENT_INPUT_UNIT_STORAGE_KEY,
  readStoredInputUnit,
  toCanonicalMicronutrientAmount,
  writeStoredInputUnit,
} from './micronutrientInputUnits';

describe('toCanonicalMicronutrientAmount', () => {
  it('converts vitamin D IU to µg', () => {
    expect(toCanonicalMicronutrientAmount(5000, 'iu', 'vitaminD')).toBe(125);
  });

  it('converts vitamin A IU to µg', () => {
    expect(toCanonicalMicronutrientAmount(1000, 'iu', 'vitaminA')).toBe(300);
  });

  it('converts vitamin E IU to mg', () => {
    expect(toCanonicalMicronutrientAmount(10, 'iu', 'vitaminE')).toBe(6.7);
  });

  it('converts mg ↔ µg', () => {
    expect(toCanonicalMicronutrientAmount(1, 'mg', 'vitaminC')).toBe(1);
    expect(toCanonicalMicronutrientAmount(1000, 'µg', 'vitaminC')).toBe(1);
    expect(toCanonicalMicronutrientAmount(0.5, 'mg', 'vitaminD')).toBe(500);
  });

  it('rejects IU for nutrients without IU factor', () => {
    expect(toCanonicalMicronutrientAmount(100, 'iu', 'vitaminC')).toBeNull();
  });
});

describe('inputUnitsFor', () => {
  it('includes UE (iu) for A/D/E', () => {
    expect(inputUnitsFor('vitaminD')).toEqual(['µg', 'mg', 'iu']);
    expect(inputUnitsFor('vitaminC')).toEqual(['mg', 'µg']);
  });
});

describe('formatInputUnitLabel', () => {
  it('labels iu as UE', () => {
    expect(formatInputUnitLabel('iu')).toBe('UE');
    expect(formatInputUnitLabel('µg')).toBe('мкг');
  });
});

describe('localStorage prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists per-nutrient unit', () => {
    writeStoredInputUnit('vitaminD', 'iu');
    expect(readStoredInputUnit('vitaminD')).toBe('iu');
    expect(readStoredInputUnit('vitaminC')).toBe('mg');
    expect(
      JSON.parse(
        localStorage.getItem(MICRONUTRIENT_INPUT_UNIT_STORAGE_KEY) ?? '{}',
      ),
    ).toEqual({ vitaminD: 'iu' });
  });
});
