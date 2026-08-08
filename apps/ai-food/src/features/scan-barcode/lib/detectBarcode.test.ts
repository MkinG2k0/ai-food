import { describe, expect, it } from 'vitest';
import { extractBarcodeValue } from './detectBarcode';

describe('extractBarcodeValue', () => {
  it('keeps digit barcodes of length >= 8', () => {
    expect(extractBarcodeValue('4600605021123')).toBe('4600605021123');
    expect(extractBarcodeValue('EAN 4600605021123')).toBe('4600605021123');
  });

  it('falls back to trimmed raw for non-numeric codes', () => {
    expect(extractBarcodeValue('  ABC-123  ')).toBe('ABC-123');
  });
});
