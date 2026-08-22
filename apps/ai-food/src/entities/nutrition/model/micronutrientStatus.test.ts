import { describe, expect, it } from 'vitest';
import { getMicronutrientStatus } from './micronutrientStatus';

describe('getMicronutrientStatus', () => {
  it('maps null / non-finite to no_data', () => {
    expect(getMicronutrientStatus(null).band).toBe('no_data');
    expect(getMicronutrientStatus(Number.NaN).band).toBe('no_data');
    expect(getMicronutrientStatus(null).labelRu).toBe('нет данных');
  });

  it('maps ratio bands for deficit / below / optimal / surplus', () => {
    expect(getMicronutrientStatus(0).band).toBe('severe_deficit');
    expect(getMicronutrientStatus(0.39).band).toBe('severe_deficit');
    expect(getMicronutrientStatus(0.4).band).toBe('below_norm');
    expect(getMicronutrientStatus(0.79).band).toBe('below_norm');
    expect(getMicronutrientStatus(0.8).band).toBe('optimal');
    expect(getMicronutrientStatus(1.2).band).toBe('optimal');
    expect(getMicronutrientStatus(1.21).band).toBe('surplus');
    expect(getMicronutrientStatus(2).labelRu).toBe('профицит');
  });
});
