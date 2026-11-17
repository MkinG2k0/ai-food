import { describe, expect, it } from 'vitest';
import { limitGalleryMealFiles } from './limitGalleryMealFiles';

function files(n: number): File[] {
  return Array.from(
    { length: n },
    (_, i) => new File([`b${i}`], `f${i}.jpg`, { type: 'image/jpeg' }),
  );
}

describe('limitGalleryMealFiles', () => {
  it('returns empty for empty input', () => {
    const result = limitGalleryMealFiles([], { max: 10, remaining: null });
    expect(result).toEqual({
      files: [],
      truncatedByMax: false,
      truncatedByQuota: false,
      requestedCount: 0,
    });
  });

  it('keeps a single file unchanged', () => {
    const input = files(1);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toEqual(input);
    expect(result.truncatedByMax).toBe(false);
    expect(result.truncatedByQuota).toBe(false);
    expect(result.requestedCount).toBe(1);
  });

  it('caps at max and sets truncatedByMax', () => {
    const input = files(11);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toHaveLength(10);
    expect(result.files).toEqual(input.slice(0, 10));
    expect(result.truncatedByMax).toBe(true);
    expect(result.truncatedByQuota).toBe(false);
    expect(result.requestedCount).toBe(11);
  });

  it('truncates by finite remaining', () => {
    const input = files(7);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 3 });
    expect(result.files).toHaveLength(3);
    expect(result.truncatedByMax).toBe(false);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(7);
  });

  it('does not quota-truncate when remaining is null', () => {
    const input = files(7);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: null });
    expect(result.files).toHaveLength(7);
    expect(result.truncatedByQuota).toBe(false);
  });

  it('returns empty when remaining is 0', () => {
    const input = files(5);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 0 });
    expect(result.files).toEqual([]);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(5);
  });

  it('applies max then quota', () => {
    const input = files(15);
    const result = limitGalleryMealFiles(input, { max: 10, remaining: 4 });
    expect(result.files).toHaveLength(4);
    expect(result.files).toEqual(input.slice(0, 4));
    expect(result.truncatedByMax).toBe(true);
    expect(result.truncatedByQuota).toBe(true);
    expect(result.requestedCount).toBe(15);
  });
});