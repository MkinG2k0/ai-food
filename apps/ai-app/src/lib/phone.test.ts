import { describe, it, expect } from 'vitest';
import { normalizePhone } from './phone.js';

describe('normalizePhone', () => {
  it('accepts +7 and 8 prefix', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567');
    expect(normalizePhone('79991234567')).toBe('79991234567');
  });
  it('rejects short / invalid', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});
