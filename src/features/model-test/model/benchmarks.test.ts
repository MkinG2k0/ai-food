import { describe, expect, it } from 'vitest';
import { letterIndex, pickLocalImages } from './benchmarks';

describe('letterIndex', () => {
  it('maps classification letter to option index', () => {
    expect(letterIndex('A')).toBe(0);
    expect(letterIndex('G')).toBe(6);
    expect(letterIndex('z')).toBe(25);
  });

  it('returns -1 for invalid letters', () => {
    expect(letterIndex('')).toBe(-1);
    expect(letterIndex('1')).toBe(-1);
  });
});

describe('pickLocalImages', () => {
  it('keeps only available local image paths', () => {
    const available = new Set(['images/01194.jpg', 'images/01176_5.jpg']);
    expect(
      pickLocalImages(
        ['images/01194.jpg', 'images/01194_1.jpg', 'images/01176_5.jpg'],
        available,
      ),
    ).toEqual(['images/01194.jpg', 'images/01176_5.jpg']);
  });
});
