import type { UserProfile, DailyTargets, ActivityLevel } from '@ai-food/shared-types';
import {
  evaluateWeightPace,
  type PaceWarning,
} from './evaluateWeightPace';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

export type CalculateTargetsResult = {
  targets: DailyTargets;
  pace: PaceWarning;
};

export function calculateTargets(
  profile: UserProfile,
  options?: { now?: Date },
): CalculateTargetsResult {
  const { gender, age, height, weight, activity } = profile;

  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity];
  const pace = evaluateWeightPace({
    weight: profile.weight,
    targetWeight: profile.targetWeight,
    targetWeightDate: profile.targetWeightDate,
    now: options?.now,
  });

  const kcal = Math.max(
    Math.round(tdee) + pace.clampedDeltaKcal,
    Math.round(bmr),
  );
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  return {
    targets: { kcal, protein, fat, carbs, fiber: 30 },
    pace: {
      rawDeltaKcal: pace.rawDeltaKcal,
      clampedDeltaKcal: pace.clampedDeltaKcal,
      clamped: pace.clamped,
    },
  };
}
