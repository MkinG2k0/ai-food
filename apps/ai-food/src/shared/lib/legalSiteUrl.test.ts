import { describe, expect, it } from 'vitest';
import { getLegalUrl } from './legalSiteUrl';

describe('getLegalUrl', () => {
  it('returns null when base is empty', () => {
    expect(getLegalUrl('/terms', '')).toBeNull();
    expect(getLegalUrl('/terms', '   ')).toBeNull();
  });

  it('joins base and path without duplicate slash', () => {
    expect(getLegalUrl('/terms', 'https://example.com')).toBe(
      'https://example.com/terms',
    );
    expect(getLegalUrl('/privacy', 'https://example.com/')).toBe(
      'https://example.com/privacy',
    );
  });

  it('supports refunds path', () => {
    expect(getLegalUrl('/refunds', 'https://ai.example')).toBe(
      'https://ai.example/refunds',
    );
  });
});
