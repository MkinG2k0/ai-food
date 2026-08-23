import { describe, expect, it } from 'vitest';
import { detectSource } from './detectSource';

describe('detectSource', () => {
  it('returns calzen for CalZen header', () => {
    expect(detectSource('CalZen\nотчёт о питании 2026 г. calzen.ai\nДНЕВНИК ПИТАНИЯ')).toBe(
      'calzen',
    );
  });

  it('returns null for unknown', () => {
    expect(detectSource('random pdf text without markers')).toBeNull();
  });
});
