import { describe, expect, it } from 'vitest';
import { detectSource } from './detectSource';

describe('detectSource', () => {
  it('returns calzen for CalZen header', () => {
    expect(detectSource('CalZen\nРѕС‚С‡С‘С‚ Рѕ РїРёС‚Р°РЅРёРё 2026 Рі. calzen.ai\nР”РќР•Р’РќРРљ РџРРўРђРќРРЇ')).toBe(
      'calzen',
    );
  });

  it('returns null for unknown', () => {
    expect(detectSource('random pdf text without markers')).toBeNull();
  });
});
