import { describe, expect, it } from 'vitest';
import { resolveAnalyzeUsageKind } from './resolveAnalyzeUsageKind';

describe('resolveAnalyzeUsageKind', () => {
  it('returns analyze_photo for image-only input', () => {
    expect(
      resolveAnalyzeUsageKind({ hasImage: true, hasDescription: false }),
    ).toBe('analyze_photo');
  });

  it('returns analyze_text for description-only input', () => {
    expect(
      resolveAnalyzeUsageKind({ hasImage: false, hasDescription: true }),
    ).toBe('analyze_text');
  });

  it('returns analyze_photo_text when both inputs are present', () => {
    expect(
      resolveAnalyzeUsageKind({ hasImage: true, hasDescription: true }),
    ).toBe('analyze_photo_text');
  });
});
