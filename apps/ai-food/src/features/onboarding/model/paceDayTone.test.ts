import { describe, it, expect } from 'vitest';
import {
  paceDayLabel,
  paceDifficulty01,
  paceDayBackground,
} from './paceDayTone';

describe('paceDayTone', () => {
  it('maps within-clamp pace to ok / low difficulty', () => {
    expect(paceDayLabel(315)).toBe('ok');
    expect(paceDifficulty01(0)).toBe(0);
    expect(paceDifficulty01(500)).toBe(0.5);
  });

  it('maps stretch pace to hard', () => {
    expect(paceDayLabel(750)).toBe('hard');
    expect(paceDifficulty01(1000)).toBe(1);
  });

  it('maps extreme pace to impossible', () => {
    expect(paceDayLabel(70000)).toBe('impossible');
    expect(paceDifficulty01(70000)).toBe(1);
  });

  it('returns green-ish hsl for easy days', () => {
    expect(paceDayBackground(0)).toMatch(/^hsl\(130 /);
  });

  it('returns red-ish hsl for extreme days', () => {
    expect(paceDayBackground(2000)).toMatch(/^hsl\(0 /);
  });
});
