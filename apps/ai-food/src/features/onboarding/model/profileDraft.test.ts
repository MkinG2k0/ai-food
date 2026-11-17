import { describe, expect, it } from 'vitest';
import {
  draftFromProfile,
  isDeadlineAcceptable,
  parseProfileDraft,
} from './profileDraft';

const baseProfile = {
  gender: 'male' as const,
  age: 28,
  height: 178,
  weight: 78,
  targetWeight: 75,
  targetWeightDate: '2026-12-01',
  planStartDate: '2026-06-01',
  planStartWeight: 80,
  activity: 'medium' as const,
  goal: 'lose' as const,
  dietType: 'none' as const,
};

describe('profileDraft', () => {
  it('draftFromProfile maps fields to editable strings', () => {
    expect(draftFromProfile(baseProfile)).toEqual({
      gender: 'male',
      age: '28',
      height: '178',
      weight: '78',
      targetWeight: '75',
      targetWeightDate: '2026-12-01',
      activity: 'medium',
      goal: 'lose',
      dietType: 'none',
    });
  });

  it('parseProfileDraft keeps plan start fields and rounds weight', () => {
    const draft = draftFromProfile(baseProfile);
    draft.weight = '77,35';
    draft.dietType = 'vegan';
    const next = parseProfileDraft(draft, baseProfile, baseProfile.targetWeightDate);
    expect(next).toMatchObject({
      weight: 77.4,
      dietType: 'vegan',
      planStartDate: '2026-06-01',
      planStartWeight: 80,
    });
  });

  it('parseProfileDraft rejects out-of-range age', () => {
    const draft = draftFromProfile(baseProfile);
    draft.age = '0';
    expect(
      parseProfileDraft(draft, baseProfile, baseProfile.targetWeightDate),
    ).toBeNull();
  });

  it('isDeadlineAcceptable allows unchanged past date and future dates', () => {
    expect(isDeadlineAcceptable('2020-01-01', '2020-01-01')).toBe(true);
    expect(isDeadlineAcceptable('2099-01-01', '2020-01-01')).toBe(true);
    expect(isDeadlineAcceptable('not-a-date', '2020-01-01')).toBe(false);
  });
});
