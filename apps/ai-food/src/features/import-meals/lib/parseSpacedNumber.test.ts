import { describe, expect, it } from 'vitest';
import { parseSpacedNumber } from './parseSpacedNumber';

describe('parseSpacedNumber', () => {
  it('parses integers with thousand spaces', () => {
    expect(parseSpacedNumber('1 981')).toBe(1981);
    expect(parseSpacedNumber('2 841')).toBe(2841);
  });

  it('parses plain numbers and trims', () => {
    expect(parseSpacedNumber(' 254 ')).toBe(254);
    expect(parseSpacedNumber('6')).toBe(6);
  });

  it('returns NaN for empty/non-numeric', () => {
    expect(Number.isNaN(parseSpacedNumber(''))).toBe(true);
    expect(Number.isNaN(parseSpacedNumber('abc'))).toBe(true);
  });
});
