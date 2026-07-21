import { describe, expect, it } from 'vitest';
import { resolveMealImageUris } from './resolveMealImageUris';

describe('resolveMealImageUris', () => {
  it('returns imageUris when present', () => {
    expect(
      resolveMealImageUris({
        imageUri: 'meal-images/a.jpg',
        imageUris: ['meal-images/a.jpg', 'meal-images/b.jpg'],
      }),
    ).toEqual(['meal-images/a.jpg', 'meal-images/b.jpg']);
  });

  it('falls back to single imageUri for legacy meals', () => {
    expect(resolveMealImageUris({ imageUri: 'meal-images/a.jpg' })).toEqual([
      'meal-images/a.jpg',
    ]);
  });

  it('returns empty when no photos', () => {
    expect(resolveMealImageUris({})).toEqual([]);
  });

  it('ignores empty imageUris and uses imageUri', () => {
    expect(
      resolveMealImageUris({ imageUri: 'meal-images/a.jpg', imageUris: [] }),
    ).toEqual(['meal-images/a.jpg']);
  });
});
